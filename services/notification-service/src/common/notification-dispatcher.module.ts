import { Module } from '@nestjs/common';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationDispatcherController } from './notification-dispatcher.controller';
import { EmailModule } from '../modules/email/email.module';
import { WhatsappModule } from '../modules/whatsapp/whatsapp.module';
import { SmsModule } from '../modules/sms/sms.module';
import { PushModule } from '../modules/push/push.module';

@Module({
  imports: [EmailModule, WhatsappModule, SmsModule, PushModule],
  controllers: [NotificationDispatcherController],
  providers: [NotificationDispatcherService],
  exports: [NotificationDispatcherService],
})
export class NotificationDispatcherModule {}
