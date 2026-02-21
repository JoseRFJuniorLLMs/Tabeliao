import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediationController } from './mediation.controller';
import { MediationService } from './mediation.service';
import { Dispute } from '../disputes/entities/dispute.entity';
import { DisputeMessage } from '../disputes/entities/dispute-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Dispute, DisputeMessage])],
  controllers: [MediationController],
  providers: [MediationService],
  exports: [MediationService],
})
export class MediationModule {}
