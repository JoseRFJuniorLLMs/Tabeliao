import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RegistryService } from './registry.service';
import { RegistryController } from './registry.controller';

@Module({
  imports: [ConfigModule],
  controllers: [RegistryController],
  providers: [RegistryService],
  exports: [RegistryService],
})
export class RegistryModule {}
