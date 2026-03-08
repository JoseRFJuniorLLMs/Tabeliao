import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ContractsModule } from './modules/contracts/contracts.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { LifecycleModule } from './modules/lifecycle/lifecycle.module';
import { databaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        NietzscheDB: {
          host: configService.get<string>('NietzscheDB_HOST', 'localhost'),
          port: configService.get<number>('NietzscheDB_PORT', 6379),
          password: configService.get<string>('NietzscheDB_PASSWORD', ''),
        },
      }),
    }),

    ContractsModule,
    TemplatesModule,
    LifecycleModule,
  ],
})
export class AppModule {}
