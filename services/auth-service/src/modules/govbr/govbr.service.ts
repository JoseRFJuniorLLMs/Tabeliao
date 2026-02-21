import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios, { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { User, KycLevel } from '../users/user.entity';
import { TokenPair } from '../auth/auth.service';
import { getRefreshTokenConfig } from '../../config/jwt.config';

const GOVBR_AUTHORIZATION_ENDPOINT = 'https://sso.acesso.gov.br/authorize';
const GOVBR_TOKEN_ENDPOINT = 'https://sso.acesso.gov.br/token';
const GOVBR_USERINFO_ENDPOINT = 'https://sso.acesso.gov.br/userinfo';

export interface GovbrTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

export interface GovbrUserInfo {
  sub: string;
  name: string;
  email: string;
  email_verified: boolean;
  phone_number?: string;
  phone_number_verified?: boolean;
  cpf: string;
  cnpj?: string;
  picture?: string;
  amr?: string[];
  acr?: string;
}

export type GovbrLevel = 'ouro' | 'prata' | 'bronze';

export interface GovbrAuthResult {
  user: Omit<User, 'password' | 'twoFactorSecret' | 'emailVerificationToken' | 'passwordResetToken'>;
  tokens: TokenPair;
  isNewUser: boolean;
  govbrLevel: string;
}

@Injectable()
export class GovbrService {
  private readonly logger = new Logger(GovbrService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly scopes: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {
    this.clientId = this.configService.get<string>('GOVBR_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>('GOVBR_CLIENT_SECRET', '');
    this.redirectUri = this.configService.get<string>(
      'GOVBR_REDIRECT_URI',
      'http://localhost:3001/api/v1/auth/govbr/callback',
    );
    this.scopes = this.configService.get<string>(
      'GOVBR_SCOPES',
      'openid email phone profile govbr_confiabilidades',
    );
  }

  getAuthorizationUrl(): { url: string; state: string } {
    const state = uuidv4();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: this.scopes,
      redirect_uri: this.redirectUri,
      state,
      nonce: uuidv4(),
    });

    const url = `${GOVBR_AUTHORIZATION_ENDPOINT}?${params.toString()}`;

    this.logger.log(`Gov.br authorization URL generated with state: ${state}`);

    return { url, state };
  }

  async exchangeCodeForToken(code: string): Promise<GovbrTokenResponse> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      });

      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios.post<GovbrTokenResponse>(
        GOVBR_TOKEN_ENDPOINT,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`,
          },
          timeout: 10000,
        },
      );

      this.logger.log('Gov.br token exchange successful');

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Gov.br token exchange failed: ${axiosError.message}`,
        axiosError.response?.data,
      );
      throw new InternalServerErrorException('Failed to exchange authorization code with Gov.br');
    }
  }

  async getUserInfo(accessToken: string): Promise<GovbrUserInfo> {
    try {
      const response = await axios.get<GovbrUserInfo>(GOVBR_USERINFO_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 10000,
      });

      this.logger.log(`Gov.br user info retrieved for CPF: ${this.maskCpf(response.data.cpf)}`);

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Gov.br user info retrieval failed: ${axiosError.message}`,
        axiosError.response?.data,
      );
      throw new InternalServerErrorException('Failed to retrieve user info from Gov.br');
    }
  }

  async validateIdentity(
    code: string,
  ): Promise<GovbrAuthResult> {
    const tokenResponse = await this.exchangeCodeForToken(code);
    const userInfo = await this.getUserInfo(tokenResponse.access_token);

    if (!userInfo.cpf) {
      throw new BadRequestException('Gov.br account does not have a CPF associated');
    }

    const govbrLevel = this.extractGovbrLevel(userInfo);
    const kycLevel = this.mapGovbrLevelToKyc(govbrLevel);

    let user = await this.usersService.findByGovbrId(userInfo.sub);
    let isNewUser = false;

    if (!user) {
      user = await this.usersService.findByCpf(userInfo.cpf);
    }

    if (user) {
      await this.usersService.updateGovbrId(user.id, userInfo.sub);
      await this.usersService.updateKycLevel(user.id, kycLevel);

      if (userInfo.email_verified && !user.emailVerified) {
        await this.usersService.verifyEmail(user.id);
      }

      user = await this.usersService.findById(user.id);
    } else {
      isNewUser = true;

      const randomPassword = uuidv4() + uuidv4();

      user = await this.usersService.create({
        email: userInfo.email,
        password: randomPassword,
        name: userInfo.name,
        cpf: userInfo.cpf,
        phone: userInfo.phone_number,
      });

      await this.usersService.updateGovbrId(user.id, userInfo.sub);
      await this.usersService.updateKycLevel(user.id, kycLevel);

      if (userInfo.email_verified) {
        await this.usersService.verifyEmail(user.id);
      }

      user = await this.usersService.findById(user.id);
    }

    await this.usersService.updateLastLogin(user.id);

    const tokens = await this.generateTokens(user);

    this.logger.log(
      `Gov.br authentication successful for user ${user.id} (level: ${govbrLevel}, new: ${isNewUser})`,
    );

    return {
      user: this.usersService.sanitizeUser(user),
      tokens,
      isNewUser,
      govbrLevel,
    };
  }

  private extractGovbrLevel(userInfo: GovbrUserInfo): string {
    if (userInfo.acr) {
      const acrLower = userInfo.acr.toLowerCase();
      if (acrLower.includes('ouro') || acrLower.includes('gold')) return 'ouro';
      if (acrLower.includes('prata') || acrLower.includes('silver')) return 'prata';
      if (acrLower.includes('bronze')) return 'bronze';
    }

    if (userInfo.amr && userInfo.amr.length > 0) {
      const methods = userInfo.amr.map((m) => m.toLowerCase());

      if (
        methods.includes('cert') ||
        methods.includes('certificate') ||
        methods.includes('bio')
      ) {
        return 'ouro';
      }

      if (
        methods.includes('bank') ||
        methods.includes('facial') ||
        methods.includes('face')
      ) {
        return 'prata';
      }
    }

    return 'bronze';
  }

  private mapGovbrLevelToKyc(govbrLevel: string): KycLevel {
    switch (govbrLevel.toLowerCase()) {
      case 'ouro':
        return KycLevel.GOLD;
      case 'prata':
        return KycLevel.SILVER;
      case 'bronze':
        return KycLevel.BRONZE;
      default:
        return KycLevel.BASIC;
    }
  }

  private async generateTokens(user: User): Promise<TokenPair> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const refreshConfig = getRefreshTokenConfig(this.configService);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(
        { ...payload, type: 'refresh' },
        {
          secret: refreshConfig.secret,
          expiresIn: refreshConfig.expiresIn,
        },
      ),
    ]);

    const expiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    let expiresInSeconds = 900;

    if (match && match[1] && match[2]) {
      const value = parseInt(match[1], 10);
      switch (match[2]) {
        case 's': expiresInSeconds = value; break;
        case 'm': expiresInSeconds = value * 60; break;
        case 'h': expiresInSeconds = value * 3600; break;
        case 'd': expiresInSeconds = value * 86400; break;
      }
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
    };
  }

  private maskCpf(cpf: string): string {
    if (!cpf || cpf.length < 5) return '***';
    return `${cpf.substring(0, 3)}.***.***-${cpf.substring(cpf.length - 2)}`;
  }
}
