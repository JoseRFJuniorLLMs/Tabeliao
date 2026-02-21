import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from './modules/registry/registry.module';
import { EscrowModule } from './modules/escrow/escrow.module';
import { OracleModule } from './modules/oracle/oracle.module';
import blockchainConfig from './config/blockchain.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [blockchainConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'tabeliao'),
        password: configService.get<string>('DB_PASSWORD', 'tabeliao'),
        database: configService.get<string>('DB_DATABASE', 'tabeliao_blockchain'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('NODE_ENV', 'development') === 'development',
        logging: configService.get<string>('NODE_ENV', 'development') === 'development',
        ssl: configService.get<string>('DB_SSL', 'false') === 'true'
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),
    RegistryModule,
    EscrowModule,
    OracleModule,
  ],
})
export class AppModule {}
