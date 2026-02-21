import {
  Controller,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PushService } from './push.service';
import {
  SendPushDto,
  SendBulkPushDto,
  RegisterDeviceDto,
  UnregisterDeviceDto,
} from './dto/push.dto';

@ApiTags('push')
@ApiBearerAuth('access-token')
@Controller('notifications/push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a push notification',
    description: 'Sends a push notification to all active devices registered for the specified user.',
  })
  @ApiResponse({ status: 200, description: 'Push notification sent successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 500, description: 'Failed to send push notification.' })
  async sendPush(@Body() dto: SendPushDto): Promise<{ message: string }> {
    await this.pushService.sendPush(dto.userId, dto.title, dto.body, dto.data);
    return { message: 'Push notification sent successfully' };
  }

  @Post('send-bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send bulk push notifications',
    description: 'Sends a push notification to all active devices for multiple users.',
  })
  @ApiResponse({ status: 200, description: 'Bulk push notifications sent successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  async sendBulkPush(@Body() dto: SendBulkPushDto): Promise<{ message: string }> {
    await this.pushService.sendBulkPush(dto.userIds, dto.title, dto.body, dto.data);
    return { message: `Bulk push sent to ${dto.userIds.length} user(s)` };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a device for push notifications',
    description: 'Registers a device token (FCM) for receiving push notifications.',
  })
  @ApiResponse({ status: 201, description: 'Device registered successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  async registerDevice(
    @Body() dto: RegisterDeviceDto,
  ): Promise<{ message: string; deviceId: string }> {
    const device = await this.pushService.registerDevice(
      dto.userId,
      dto.deviceToken,
      dto.platform,
    );
    return { message: 'Device registered successfully', deviceId: device.id };
  }

  @Delete('unregister')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unregister a device from push notifications',
    description: 'Deactivates a device token so it no longer receives push notifications.',
  })
  @ApiResponse({ status: 200, description: 'Device unregistered successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  async unregisterDevice(@Body() dto: UnregisterDeviceDto): Promise<{ message: string }> {
    await this.pushService.unregisterDevice(dto.userId, dto.deviceToken);
    return { message: 'Device unregistered successfully' };
  }
}
