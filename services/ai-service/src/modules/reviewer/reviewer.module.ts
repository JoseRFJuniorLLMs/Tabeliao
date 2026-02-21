import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { ReviewerController } from './reviewer.controller';
import { ReviewerService } from './reviewer.service';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [
    ConfigModule,
    RagModule,
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [ReviewerController],
  providers: [ReviewerService],
  exports: [ReviewerService],
})
export class ReviewerModule {}
