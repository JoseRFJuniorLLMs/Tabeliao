import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtConfig = (configService: ConfigService): JwtModuleOptions => ({
  secret: configService.get<string>('JWT_SECRET', 'tabeliao-auth-secret-change-in-production'),
  signOptions: {
    expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    issuer: 'tabeliao-auth-service',
    audience: 'tabeliao-platform',
  },
});

export const JWT_REFRESH_SECRET_KEY = 'JWT_REFRESH_SECRET';
export const JWT_REFRESH_EXPIRES_IN_KEY = 'JWT_REFRESH_EXPIRES_IN';

export const getRefreshTokenConfig = (
  configService: ConfigService,
): { secret: string; expiresIn: string } => ({
  secret: configService.get<string>(
    JWT_REFRESH_SECRET_KEY,
    'tabeliao-refresh-secret-change-in-production',
  ),
  expiresIn: configService.get<string>(JWT_REFRESH_EXPIRES_IN_KEY, '7d'),
});
