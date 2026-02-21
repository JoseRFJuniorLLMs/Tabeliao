import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EscrowAccount } from './entities/escrow-account.entity';
import { EscrowPaymentService } from './escrow-payment.service';
import { EscrowPaymentController } from './escrow-payment.controller';
import { PixModule } from '../pix/pix.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EscrowAccount]),
    ConfigModule,
    PixModule,
  ],
  controllers: [EscrowPaymentController],
  providers: [EscrowPaymentService],
  exports: [EscrowPaymentService],
})
export class EscrowPaymentModule {}
