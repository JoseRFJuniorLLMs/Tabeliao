import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArbitrationController } from './arbitration.controller';
import { ArbitrationService } from './arbitration.service';
import { Arbitrator } from './entities/arbitrator.entity';
import { ArbitratorRating } from './entities/arbitrator-rating.entity';
import { Dispute } from '../disputes/entities/dispute.entity';
import { DisputeMessage } from '../disputes/entities/dispute-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Arbitrator, ArbitratorRating, Dispute, DisputeMessage]),
  ],
  controllers: [ArbitrationController],
  providers: [ArbitrationService],
  exports: [ArbitrationService],
})
export class ArbitrationModule {}
