import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { DisputesModule } from './modules/disputes/disputes.module';
import { ArbitrationModule } from './modules/arbitration/arbitration.module';
import { MediationModule } from './modules/mediation/mediation.module';
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

    DisputesModule,
    ArbitrationModule,
    MediationModule,
  ],
})
export class AppModule {}
