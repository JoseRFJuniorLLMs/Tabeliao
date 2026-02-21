import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { getRefreshTokenConfig } from '../../config/jwt.config';

const BCRYPT_SALT_ROUNDS = 12;
const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;
const PASSWORD_RESET_EXPIRY_HOURS = 1;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: Omit<User, 'password' | 'twoFactorSecret' | 'emailVerificationToken' | 'passwordResetToken'>;
  tokens: TokenPair;
}

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeUrl: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const cleanedCpf = dto.cpf.replace(/\D/g, '');

    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      cpf: cleanedCpf,
      cnpj: dto.cnpj ? dto.cnpj.replace(/\D/g, '') : undefined,
      phone: dto.phone,
    });

    const verificationToken = uuidv4();
    const verificationExpires = new Date();
    verificationExpires.setHours(
      verificationExpires.getHours() + EMAIL_VERIFICATION_EXPIRY_HOURS,
    );

    await this.usersService.setEmailVerificationToken(
      user.id,
      verificationToken,
      verificationExpires,
    );

    this.logger.log(
      `Email verification token generated for user ${user.id}. In production, token would be sent via email.`,
    );

    const tokens = await this.generateTokens(user);

    return {
      user: this.usersService.sanitizeUser(user),
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse | { requires2FA: true; tempToken: string }> {
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.twoFactorEnabled) {
      if (!dto.totpCode) {
        const tempToken = this.jwtService.sign(
          { sub: user.id, purpose: '2fa-pending' },
          { expiresIn: '5m' },
        );

        return { requires2FA: true, tempToken };
      }

      const isValid = authenticator.verify({
        token: dto.totpCode,
        secret: user.twoFactorSecret || '',
      });

      if (!isValid) {
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }

    await this.usersService.updateLastLogin(user.id);

    const tokens = await this.generateTokens(user);

    this.logger.log(`User logged in: ${user.id} (${user.email})`);

    return {
      user: this.usersService.sanitizeUser(user),
      tokens,
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async generateTokens(user: User): Promise<TokenPair> {
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

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getExpiresInSeconds(),
    };
  }

  async refreshToken(refreshTokenValue: string): Promise<TokenPair> {
    const refreshConfig = getRefreshTokenConfig(this.configService);

    let payload: { sub: string; type?: string };

    try {
      payload = this.jwtService.verify<{ sub: string; type?: string }>(refreshTokenValue, {
        secret: refreshConfig.secret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.usersService.findById(payload.sub);

    return this.generateTokens(user);
  }

  async enable2FA(userId: string): Promise<TwoFactorSetup> {
    const user = await this.usersService.findById(userId);

    if (user.twoFactorEnabled) {
      throw new ConflictException('Two-factor authentication is already enabled');
    }

    const secret = authenticator.generateSecret();

    await this.usersService.setTwoFactorSecret(userId, secret);

    const appName = this.configService.get<string>('APP_NAME', 'Tabeliao');
    const otpauthUrl = authenticator.keyuri(user.email, appName, secret);

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

    this.logger.log(`2FA setup initiated for user ${userId}`);

    return {
      secret,
      otpauthUrl,
      qrCodeUrl,
    };
  }

  async verify2FA(userId: string, totpCode: string): Promise<{ verified: boolean }> {
    const user = await this.usersService.findById(userId);

    if (!user.twoFactorSecret) {
      throw new BadRequestException(
        'Two-factor authentication has not been set up. Call enable2FA first.',
      );
    }

    const isValid = authenticator.verify({
      token: totpCode,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    if (!user.twoFactorEnabled) {
      await this.usersService.enableTwoFactor(userId);
      this.logger.log(`2FA enabled for user ${userId}`);
    }

    return { verified: true };
  }

  async verifyEmail(token: string): Promise<{ verified: boolean }> {
    const user = await this.usersRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires < new Date()
    ) {
      throw new BadRequestException('Verification token has expired');
    }

    await this.usersService.verifyEmail(user.id);

    this.logger.log(`Email verified for user ${user.id}`);

    return { verified: true };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }

    const resetToken = uuidv4();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + PASSWORD_RESET_EXPIRY_HOURS);

    await this.usersService.setPasswordResetToken(user.id, resetToken, resetExpires);

    this.logger.log(
      `Password reset token generated for user ${user.id}. In production, token would be sent via email.`,
    );

    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    await this.usersService.updatePassword(user.id, hashedPassword);

    this.logger.log(`Password reset for user ${user.id}`);

    return { message: 'Password has been reset successfully' };
  }

  private getExpiresInSeconds(): number {
    const expiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const match = expiresIn.match(/^(\d+)([smhd])$/);

    if (!match || !match[1] || !match[2]) {
      return 900; // default 15 minutes
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
