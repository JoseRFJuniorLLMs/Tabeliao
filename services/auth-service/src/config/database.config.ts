import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get<string>('DB_USERNAME', 'tabeliao'),
  password: configService.get<string>('DB_PASSWORD', 'tabeliao'),
  database: configService.get<string>('DB_DATABASE', 'tabeliao_auth'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: configService.get<string>('NODE_ENV', 'development') === 'development',
  logging: configService.get<string>('NODE_ENV', 'development') === 'development',
  ssl:
    configService.get<string>('DB_SSL', 'false') === 'true'
      ? { rejectUnauthorized: false }
      : false,
  pool: {
    min: configService.get<number>('DB_POOL_MIN', 2),
    max: configService.get<number>('DB_POOL_MAX', 10),
  },
});
