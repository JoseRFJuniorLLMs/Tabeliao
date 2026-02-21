import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { WhatsappService } from './whatsapp.service';
import { SendWhatsappDto } from './dto/send-whatsapp.dto';

@ApiTags('whatsapp')
@Controller('notifications/whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Send a WhatsApp template message',
    description: 'Sends a WhatsApp message using a pre-approved template via Meta Business API.',
  })
  @ApiResponse({ status: 200, description: 'WhatsApp message sent successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 500, description: 'Failed to send WhatsApp message.' })
  async sendMessage(@Body() dto: SendWhatsappDto): Promise<{ message: string }> {
    await this.whatsappService.sendMessage(dto.phone, dto.templateName, dto.params ?? []);
    return { message: 'WhatsApp message sent successfully' };
  }

  @Get('webhook')
  @ApiOperation({
    summary: 'Verify WhatsApp webhook',
    description: 'Endpoint for Meta webhook verification (GET). Returns the challenge token.',
  })
  @ApiQuery({ name: 'hub.mode', required: false, type: String })
  @ApiQuery({ name: 'hub.verify_token', required: false, type: String })
  @ApiQuery({ name: 'hub.challenge', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Webhook verified.' })
  @ApiResponse({ status: 403, description: 'Webhook verification failed.' })
  verifyWebhook(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() res: Response,
  ): void {
    const result = this.whatsappService.verifyWebhook(mode, token, challenge);
    if (result !== null) {
      res.status(HttpStatus.OK).send(result);
    } else {
      res.status(HttpStatus.FORBIDDEN).send('Verification failed');
    }
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive WhatsApp webhook events',
    description: 'Endpoint for receiving delivery status updates and incoming messages from Meta.',
  })
  @ApiResponse({ status: 200, description: 'Webhook event processed.' })
  processWebhook(@Body() body: Record<string, unknown>): { status: string } {
    this.whatsappService.processWebhook(body);
    return { status: 'received' };
  }
}
