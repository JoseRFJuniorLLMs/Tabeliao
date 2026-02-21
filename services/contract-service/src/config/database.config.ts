import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get<string>('DB_USERNAME', 'tabeliao'),
  password: configService.get<string>('DB_PASSWORD', 'tabeliao'),
  database: configService.get<string>('DB_DATABASE', 'tabeliao_contracts'),
  schema: configService.get<string>('DB_SCHEMA', 'public'),
  entities: [__dirname + '/../modules/**/entities/*.entity{.ts,.js}'],
  synchronize: configService.get<string>('NODE_ENV', 'development') === 'development',
  logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
  ssl:
    configService.get<string>('DB_SSL', 'false') === 'true'
      ? { rejectUnauthorized: false }
      : false,
  extra: {
    max: configService.get<number>('DB_POOL_MAX', 20),
    idleTimeoutMillis: configService.get<number>('DB_IDLE_TIMEOUT', 30000),
    connectionTimeoutMillis: configService.get<number>('DB_CONNECT_TIMEOUT', 5000),
  },
});
