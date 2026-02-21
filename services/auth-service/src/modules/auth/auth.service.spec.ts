import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User, UserRole, KycLevel } from '../users/user.entity';

// ─── Mock external modules ────────────────────────────────────────────────────
jest.mock('bcrypt');
jest.mock('otplib', () => ({
  authenticator: {
    verify: jest.fn(),
    generateSecret: jest.fn(),
    keyuri: jest.fn(),
  },
}));
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));

// ─── Helper: build a fake User entity ─────────────────────────────────────────
const buildUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-1',
    email: 'john@example.com',
    password: 'hashed-password',
    name: 'John Doe',
    cpf: '12345678901',
    cnpj: null,
    phone: '+5511999999999',
    kycLevel: KycLevel.NONE,
    riskScore: 0,
    govbrId: null,
    role: UserRole.USER,
    twoFactorSecret: null,
    twoFactorEnabled: false,
    emailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpires: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    lastLoginAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    normalizeEmail: jest.fn(),
    ...overrides,
  }) as User;

// ─── Test suite ───────────────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;
  let usersRepository: {
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      sanitizeUser: jest.fn((u: User) => {
        const { password, twoFactorSecret, emailVerificationToken, passwordResetToken, ...rest } = u as any;
        return rest;
      }),
      setEmailVerificationToken: jest.fn(),
      updateLastLogin: jest.fn(),
      setTwoFactorSecret: jest.fn(),
      enableTwoFactor: jest.fn(),
      verifyEmail: jest.fn(),
      setPasswordResetToken: jest.fn(),
      updatePassword: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
      sign: jest.fn().mockReturnValue('mock-temp-token'),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string, defaultVal?: string) => {
        const map: Record<string, string> = {
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_REFRESH_EXPIRES_IN: '7d',
          JWT_ACCESS_EXPIRES_IN: '15m',
          APP_NAME: 'Tabeliao',
        };
        return map[key] ?? defaultVal;
      }),
    };

    usersRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: getRepositoryToken(User), useValue: usersRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── register ─────────────────────────────────────────────────────────────
  describe('register', () => {
    it('should register a user, generate verification token, and return tokens', async () => {
      const newUser = buildUser();
      (usersService.create as jest.Mock).mockResolvedValue(newUser);

      const result = await service.register({
        email: 'john@example.com',
        password: 'StrongPass1!',
        name: 'John Doe',
        cpf: '123.456.789-01',
        phone: '+5511999999999',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@example.com',
          cpf: '12345678901',
        }),
      );
      expect(usersService.setEmailVerificationToken).toHaveBeenCalledWith(
        'user-1',
        'mock-uuid-v4',
        expect.any(Date),
      );
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('user');
      expect(result.tokens.accessToken).toBe('mock-jwt-token');
    });

    it('should strip non-digits from CPF before creating user', async () => {
      const newUser = buildUser();
      (usersService.create as jest.Mock).mockResolvedValue(newUser);

      await service.register({
        email: 'test@test.com',
        password: 'Pass123!',
        name: 'Test',
        cpf: '111.222.333-44',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ cpf: '11122233344' }),
      );
    });

    it('should strip non-digits from CNPJ when provided', async () => {
      const newUser = buildUser();
      (usersService.create as jest.Mock).mockResolvedValue(newUser);

      await service.register({
        email: 'biz@test.com',
        password: 'Pass123!',
        name: 'Biz',
        cpf: '111.222.333-44',
        cnpj: '11.222.333/0001-44',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ cnpj: '11222333000144' }),
      );
    });

    it('should propagate an error if UsersService.create fails (e.g. duplicate email)', async () => {
      (usersService.create as jest.Mock).mockRejectedValue(
        new ConflictException('Email already in use'),
      );

      await expect(
        service.register({
          email: 'dup@test.com',
          password: 'Pass123!',
          name: 'Dup',
          cpf: '11122233344',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('should login successfully and return tokens when credentials are valid', async () => {
      const user = buildUser();
      (usersService.findByEmail as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'john@example.com',
        password: 'StrongPass1!',
      });

      expect(usersService.updateLastLogin).toHaveBeenCalledWith('user-1');
      expect(result).toHaveProperty('tokens');
      expect((result as any).tokens.accessToken).toBe('mock-jwt-token');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      const user = buildUser();
      (usersService.findByEmail as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'john@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return requires2FA when user has 2FA enabled and no TOTP code provided', async () => {
      const user = buildUser({ twoFactorEnabled: true, twoFactorSecret: 'secret-2fa' });
      (usersService.findByEmail as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'john@example.com',
        password: 'StrongPass1!',
      });

      expect(result).toEqual({
        requires2FA: true,
        tempToken: 'mock-temp-token',
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-1', purpose: '2fa-pending' },
        { expiresIn: '5m' },
      );
    });

    it('should login successfully when valid TOTP code is provided with 2FA enabled', async () => {
      const user = buildUser({ twoFactorEnabled: true, twoFactorSecret: 'secret-2fa' });
      (usersService.findByEmail as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      const result = await service.login({
        email: 'john@example.com',
        password: 'StrongPass1!',
        totpCode: '123456',
      });

      expect(result).toHaveProperty('tokens');
    });

    it('should throw UnauthorizedException when invalid TOTP code is provided', async () => {
      const user = buildUser({ twoFactorEnabled: true, twoFactorSecret: 'secret-2fa' });
      (usersService.findByEmail as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      await expect(
        service.login({
          email: 'john@example.com',
          password: 'StrongPass1!',
          totpCode: '000000',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── validateUser ─────────────────────────────────────────────────────────
  describe('validateUser', () => {
    it('should return user when email and password match', async () => {
      const user = buildUser();
      (usersService.findByEmail as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('john@example.com', 'correct-pass');

      expect(result).toBe(user);
    });

    it('should return null when user is not found', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser('unknown@test.com', 'pass');

      expect(result).toBeNull();
    });

    it('should return null when password does not match', async () => {
      const user = buildUser();
      (usersService.findByEmail as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('john@example.com', 'wrong-pass');

      expect(result).toBeNull();
    });
  });

  // ─── generateTokens ──────────────────────────────────────────────────────
  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const user = buildUser();
      const result = await service.generateTokens(user);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.expiresIn).toBe(900); // 15m = 900s
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });
  });

  // ─── refreshToken ─────────────────────────────────────────────────────────
  describe('refreshToken', () => {
    it('should return new tokens for a valid refresh token', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'user-1', type: 'refresh' });
      const user = buildUser();
      (usersService.findById as jest.Mock).mockResolvedValue(user);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('new-access')
        .mockResolvedValueOnce('new-refresh');

      const result = await service.refreshToken('valid-refresh-token');

      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.refreshToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token type is not refresh', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'user-1', type: 'access' });

      await expect(service.refreshToken('wrong-type-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── enable2FA ────────────────────────────────────────────────────────────
  describe('enable2FA', () => {
    it('should return 2FA setup data with secret and QR code URL', async () => {
      const user = buildUser();
      (usersService.findById as jest.Mock).mockResolvedValue(user);
      (authenticator.generateSecret as jest.Mock).mockReturnValue('MOCK_SECRET');
      (authenticator.keyuri as jest.Mock).mockReturnValue('otpauth://totp/Tabeliao:john@example.com?secret=MOCK_SECRET');

      const result = await service.enable2FA('user-1');

      expect(result.secret).toBe('MOCK_SECRET');
      expect(result.otpauthUrl).toContain('otpauth://');
      expect(result.qrCodeUrl).toContain('qrserver.com');
      expect(usersService.setTwoFactorSecret).toHaveBeenCalledWith('user-1', 'MOCK_SECRET');
    });

    it('should throw ConflictException when 2FA is already enabled', async () => {
      const user = buildUser({ twoFactorEnabled: true });
      (usersService.findById as jest.Mock).mockResolvedValue(user);

      await expect(service.enable2FA('user-1')).rejects.toThrow(ConflictException);
    });
  });

  // ─── verify2FA ────────────────────────────────────────────────────────────
  describe('verify2FA', () => {
    it('should verify and enable 2FA when code is valid and 2FA not yet enabled', async () => {
      const user = buildUser({ twoFactorSecret: 'THE_SECRET', twoFactorEnabled: false });
      (usersService.findById as jest.Mock).mockResolvedValue(user);
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      const result = await service.verify2FA('user-1', '123456');

      expect(result).toEqual({ verified: true });
      expect(usersService.enableTwoFactor).toHaveBeenCalledWith('user-1');
    });

    it('should not call enableTwoFactor again if already enabled', async () => {
      const user = buildUser({ twoFactorSecret: 'THE_SECRET', twoFactorEnabled: true });
      (usersService.findById as jest.Mock).mockResolvedValue(user);
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      await service.verify2FA('user-1', '123456');

      expect(usersService.enableTwoFactor).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when 2FA secret is not set up', async () => {
      const user = buildUser({ twoFactorSecret: null });
      (usersService.findById as jest.Mock).mockResolvedValue(user);

      await expect(service.verify2FA('user-1', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException when TOTP code is invalid', async () => {
      const user = buildUser({ twoFactorSecret: 'THE_SECRET' });
      (usersService.findById as jest.Mock).mockResolvedValue(user);
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      await expect(service.verify2FA('user-1', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── verifyEmail ──────────────────────────────────────────────────────────
  describe('verifyEmail', () => {
    it('should verify email when token is valid and not expired', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 10);

      const user = buildUser({
        emailVerificationToken: 'valid-token',
        emailVerificationExpires: futureDate,
      });
      usersRepository.findOne.mockResolvedValue(user);

      const result = await service.verifyEmail('valid-token');

      expect(result).toEqual({ verified: true });
      expect(usersService.verifyEmail).toHaveBeenCalledWith('user-1');
    });

    it('should throw BadRequestException when token is not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when token has expired', async () => {
      const pastDate = new Date('2020-01-01');
      const user = buildUser({
        emailVerificationToken: 'expired-token',
        emailVerificationExpires: pastDate,
      });
      usersRepository.findOne.mockResolvedValue(user);

      await expect(service.verifyEmail('expired-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── forgotPassword ───────────────────────────────────────────────────────
  describe('forgotPassword', () => {
    it('should generate reset token and return generic message when user exists', async () => {
      const user = buildUser();
      (usersService.findByEmail as jest.Mock).mockResolvedValue(user);

      const result = await service.forgotPassword('john@example.com');

      expect(usersService.setPasswordResetToken).toHaveBeenCalledWith(
        'user-1',
        'mock-uuid-v4',
        expect.any(Date),
      );
      expect(result.message).toContain('If an account');
    });

    it('should return generic message even when user does not exist (prevent enumeration)', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await service.forgotPassword('nobody@test.com');

      expect(result.message).toContain('If an account');
      expect(usersService.setPasswordResetToken).not.toHaveBeenCalled();
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────────────
  describe('resetPassword', () => {
    it('should reset password when token is valid and not expired', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const user = buildUser({
        passwordResetToken: 'reset-token',
        passwordResetExpires: futureDate,
      });
      usersRepository.findOne.mockResolvedValue(user);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      const result = await service.resetPassword('reset-token', 'NewPass123!');

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123!', 12);
      expect(usersService.updatePassword).toHaveBeenCalledWith('user-1', 'new-hashed-password');
      expect(result.message).toContain('successfully');
    });

    it('should throw BadRequestException when reset token is invalid', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.resetPassword('bad-token', 'pass')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when reset token has expired', async () => {
      const pastDate = new Date('2020-01-01');
      const user = buildUser({
        passwordResetToken: 'expired-token',
        passwordResetExpires: pastDate,
      });
      usersRepository.findOne.mockResolvedValue(user);

      await expect(
        service.resetPassword('expired-token', 'pass'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
