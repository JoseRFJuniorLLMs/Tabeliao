import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PixService } from './pix.service';
import { PixController, BoletoController } from './pix.controller';

@Module({
  imports: [ConfigModule],
  controllers: [PixController, BoletoController],
  providers: [PixService],
  exports: [PixService],
})
export class PixModule {}
