import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PixService } from './pix.service';
import { CreatePixChargeDto } from './dto/create-pix-charge.dto';
import { RefundPixDto } from './dto/refund-pix.dto';
import { GenerateBoletoDto } from './dto/generate-boleto.dto';
import type { PixCharge, PixStatus, PixRefund, BoletoResult, PixWebhookPayload } from './types';

@ApiTags('PIX')
@ApiBearerAuth()
@Controller('payments/pix')
export class PixController {
  private readonly logger = new Logger(PixController.name);

  constructor(private readonly pixService: PixService) {}

  @Post('charge')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create PIX charge',
    description: 'Generate a PIX Copia e Cola and QR Code for payment collection.',
  })
  @ApiResponse({ status: 201, description: 'PIX charge created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 502, description: 'Payment provider error' })
  async createPixCharge(@Body() dto: CreatePixChargeDto): Promise<PixCharge> {
    this.logger.log(`Creating PIX charge: amount=R$${dto.amount}`);
    return this.pixService.generatePixCharge(
      dto.amount,
      dto.payerCpf,
      dto.description,
      dto.expiresIn,
    );
  }

  @Get('status/:txid')
  @ApiOperation({
    summary: 'Check PIX payment status',
    description: 'Query the current status of a PIX charge by its txid.',
  })
  @ApiParam({ name: 'txid', description: 'PIX transaction ID', example: 'TAB1234567890abcdef12345678' })
  @ApiResponse({ status: 200, description: 'PIX status retrieved' })
  @ApiResponse({ status: 502, description: 'Payment provider error' })
  async checkPixStatus(@Param('txid') txid: string): Promise<PixStatus> {
    return this.pixService.checkPixStatus(txid);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive PIX webhook',
    description: 'Endpoint for PSP to notify about PIX payment events (payment confirmed, refund, etc.).',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handlePixWebhook(@Body() payload: PixWebhookPayload): Promise<{ received: boolean }> {
    this.logger.log('PIX webhook received');
    await this.pixService.handlePixWebhook(payload);
    return { received: true };
  }

  @Post('refund/:txid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refund PIX payment',
    description: 'Request a full or partial refund for a completed PIX payment.',
  })
  @ApiParam({ name: 'txid', description: 'PIX transaction ID to refund' })
  @ApiResponse({ status: 200, description: 'Refund requested successfully' })
  @ApiResponse({ status: 400, description: 'Invalid refund amount' })
  @ApiResponse({ status: 409, description: 'Payment not eligible for refund' })
  @ApiResponse({ status: 502, description: 'Payment provider error' })
  async refundPix(
    @Param('txid') txid: string,
    @Body() dto: RefundPixDto,
  ): Promise<PixRefund> {
    this.logger.log(`Requesting PIX refund: txid=${txid}, amount=${dto.amount ?? 'full'}`);
    return this.pixService.refundPix(txid, dto.amount);
  }
}

@ApiTags('Boleto')
@ApiBearerAuth()
@Controller('payments/boleto')
export class BoletoController {
  private readonly logger = new Logger(BoletoController.name);

  constructor(private readonly pixService: PixService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate boleto bancario',
    description: 'Generate a boleto bancario with barcode and payment link.',
  })
  @ApiResponse({ status: 201, description: 'Boleto generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 502, description: 'Payment provider error' })
  async generateBoleto(@Body() dto: GenerateBoletoDto): Promise<BoletoResult> {
    this.logger.log(`Generating boleto: amount=R$${dto.amount}`);
    return this.pixService.generateBoleto(
      dto.amount,
      dto.payerData,
      new Date(dto.dueDate),
      dto.description,
    );
  }
}
