import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SmsService } from './sms.service';
import { SendSmsDto } from './dto/send-sms.dto';

@ApiTags('sms')
@ApiBearerAuth('access-token')
@Controller('notifications/sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send an SMS message',
    description: 'Sends an SMS to the specified phone number. Use the critical flag for high-priority alerts.',
  })
  @ApiResponse({ status: 200, description: 'SMS sent successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 500, description: 'Failed to send SMS.' })
  async sendSms(@Body() dto: SendSmsDto): Promise<{ message: string }> {
    if (dto.critical) {
      await this.smsService.sendCriticalAlert(dto.phone, dto.message);
    } else {
      await this.smsService.sendSms(dto.phone, dto.message);
    }

    return { message: 'SMS sent successfully' };
  }
}
