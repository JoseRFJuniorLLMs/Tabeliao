import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { DispatchNotificationDto } from './dto/dispatch-notification.dto';

@ApiTags('dispatcher')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationDispatcherController {
  constructor(
    private readonly dispatcherService: NotificationDispatcherService,
  ) {}

  @Post('dispatch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dispatch a notification to multiple channels',
    description:
      'Sends a notification to all configured channels for the given event type. ' +
      'If no channels are explicitly specified, defaults are used based on event criticality.',
  })
  @ApiResponse({ status: 200, description: 'Notification dispatched successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 500, description: 'Failed to dispatch notification.' })
  async dispatch(@Body() dto: DispatchNotificationDto): Promise<{ message: string }> {
    await this.dispatcherService.dispatch({
      userId: dto.userId,
      eventType: dto.eventType,
      channels: dto.channels ?? [],
      data: dto.data,
    });

    return { message: `Notification '${dto.eventType}' dispatched successfully` };
  }
}
