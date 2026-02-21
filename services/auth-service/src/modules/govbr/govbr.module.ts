import { Module } from '@nestjs/common';
import { GovbrService } from './govbr.service';
import { GovbrController } from './govbr.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [GovbrController],
  providers: [GovbrService],
  exports: [GovbrService],
})
export class GovbrModule {}
