import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import paymentConfig from './config/payment.config';
import { EscrowPaymentModule } from './modules/escrow/escrow-payment.module';
import { BillingModule } from './modules/billing/billing.module';
import { PixModule } from './modules/pix/pix.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [paymentConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'tabeliao'),
        password: configService.get<string>('DB_PASSWORD', 'tabeliao'),
        database: configService.get<string>('DB_DATABASE', 'tabeliao_payments'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('NODE_ENV', 'development') === 'development',
        logging: configService.get<string>('NODE_ENV', 'development') === 'development',
        ssl: configService.get<string>('DB_SSL', 'false') === 'true'
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD', undefined),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
    }),

    EscrowPaymentModule,
    BillingModule,
    PixModule,
  ],
})
export class AppModule {}
