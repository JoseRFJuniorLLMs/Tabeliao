import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeneratorController } from './generator.controller';
import { GeneratorService } from './generator.service';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [ConfigModule, RagModule],
  controllers: [GeneratorController],
  providers: [GeneratorService],
  exports: [GeneratorService],
})
export class GeneratorModule {}
