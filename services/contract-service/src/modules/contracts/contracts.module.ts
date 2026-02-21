import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { Contract } from './entities/contract.entity';
import { Signature } from './entities/signature.entity';
import { ContractEvent } from './entities/contract-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contract, Signature, ContractEvent])],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
