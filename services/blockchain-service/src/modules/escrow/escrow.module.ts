import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EscrowService } from './escrow.service';
import { EscrowController } from './escrow.controller';
import { EscrowEntity } from './entities/escrow.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EscrowEntity]), ConfigModule],
  controllers: [EscrowController],
  providers: [EscrowService],
  exports: [EscrowService],
})
export class EscrowModule {}
