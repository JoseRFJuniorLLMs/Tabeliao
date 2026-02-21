import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeneratorModule } from './modules/generator/generator.module';
import { ReviewerModule } from './modules/reviewer/reviewer.module';
import { RagModule } from './modules/rag/rag.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),
    GeneratorModule,
    ReviewerModule,
    RagModule,
  ],
})
export class AppModule {}
