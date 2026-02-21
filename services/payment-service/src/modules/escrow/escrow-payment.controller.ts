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
import { EscrowPaymentService } from './escrow-payment.service';
import { CreateEscrowDto } from './dto/create-escrow.dto';
import { DepositEscrowDto } from './dto/deposit-escrow.dto';
import { ReleaseEscrowDto } from './dto/release-escrow.dto';
import { PartialReleaseEscrowDto } from './dto/partial-release-escrow.dto';
import { RefundEscrowDto } from './dto/refund-escrow.dto';
import { FreezeEscrowDto } from './dto/freeze-escrow.dto';
import type { EscrowAccount } from './entities/escrow-account.entity';
import type { DepositResult, ReleaseResult, RefundResult } from '../pix/types';

@ApiTags('Escrow')
@ApiBearerAuth()
@Controller('payments/escrow')
export class EscrowPaymentController {
  private readonly logger = new Logger(EscrowPaymentController.name);

  constructor(private readonly escrowService: EscrowPaymentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create escrow account',
    description:
      'Create a new BRL escrow account tied to a legal contract. ' +
      'Platform fee (1.5%) is calculated automatically. ' +
      'Optional milestones enable partial releases.',
  })
  @ApiResponse({ status: 201, description: 'Escrow account created' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async createEscrow(@Body() dto: CreateEscrowDto): Promise<EscrowAccount> {
    this.logger.log(`Creating escrow: contract=${dto.contractId}, amount=R$${dto.amount}`);
    return this.escrowService.createEscrow(
      dto.contractId,
      dto.amount,
      dto.depositorId,
      dto.beneficiaryId,
      dto.depositDeadline ? new Date(dto.depositDeadline) : undefined,
      dto.milestones,
    );
  }

  @Post(':id/deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deposit to escrow',
    description:
      'Generate a PIX charge or boleto to deposit funds into an escrow account. ' +
      'The escrow status updates to FUNDED once the payment is confirmed via webhook.',
  })
  @ApiParam({ name: 'id', description: 'Escrow account ID' })
  @ApiResponse({ status: 200, description: 'Deposit payment generated (PIX/boleto)' })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  @ApiResponse({ status: 409, description: 'Escrow is not eligible for deposit' })
  async depositToEscrow(
    @Param('id') id: string,
    @Body() dto: DepositEscrowDto,
  ): Promise<DepositResult> {
    this.logger.log(`Depositing to escrow: id=${id}, method=${dto.paymentMethod}`);
    return this.escrowService.depositToEscrow(id, dto.paymentMethod, dto.payerData);
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Release escrow funds',
    description:
      'Release all remaining funds to the beneficiary. ' +
      'Requires approval from both parties or an arbiter.',
  })
  @ApiParam({ name: 'id', description: 'Escrow account ID' })
  @ApiResponse({ status: 200, description: 'Funds released to beneficiary' })
  @ApiResponse({ status: 403, description: 'Insufficient approvals' })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  @ApiResponse({ status: 409, description: 'Escrow is not eligible for release' })
  async releaseEscrow(
    @Param('id') id: string,
    @Body() dto: ReleaseEscrowDto,
  ): Promise<ReleaseResult> {
    this.logger.log(`Releasing escrow: id=${id}`);
    return this.escrowService.releaseEscrow(id, dto.approvedBy);
  }

  @Post(':id/release-partial')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Partial escrow release',
    description:
      'Release a partial amount from escrow, typically for milestone completion.',
  })
  @ApiParam({ name: 'id', description: 'Escrow account ID' })
  @ApiResponse({ status: 200, description: 'Partial funds released' })
  @ApiResponse({ status: 400, description: 'Amount exceeds available balance' })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  @ApiResponse({ status: 409, description: 'Escrow is not eligible for release' })
  async releasePartialEscrow(
    @Param('id') id: string,
    @Body() dto: PartialReleaseEscrowDto,
  ): Promise<ReleaseResult> {
    this.logger.log(`Partial release escrow: id=${id}, amount=R$${dto.amount}, milestone="${dto.milestone}"`);
    return this.escrowService.releasePartialEscrow(id, dto.amount, dto.milestone);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refund escrow',
    description: 'Refund all remaining deposited funds to the depositor.',
  })
  @ApiParam({ name: 'id', description: 'Escrow account ID' })
  @ApiResponse({ status: 200, description: 'Escrow refunded to depositor' })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  @ApiResponse({ status: 409, description: 'Escrow is not eligible for refund' })
  async refundEscrow(
    @Param('id') id: string,
    @Body() dto: RefundEscrowDto,
  ): Promise<RefundResult> {
    this.logger.log(`Refunding escrow: id=${id}, reason="${dto.reason}"`);
    return this.escrowService.refundEscrow(id, dto.reason);
  }

  @Post(':id/freeze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Freeze escrow',
    description: 'Freeze escrow funds during an active dispute. Prevents release or refund.',
  })
  @ApiParam({ name: 'id', description: 'Escrow account ID' })
  @ApiResponse({ status: 200, description: 'Escrow frozen' })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  @ApiResponse({ status: 409, description: 'Escrow is not eligible for freeze' })
  async freezeEscrow(
    @Param('id') id: string,
    @Body() dto: FreezeEscrowDto,
  ): Promise<{ frozen: boolean; escrowId: string; disputeId: string }> {
    this.logger.log(`Freezing escrow: id=${id}, dispute=${dto.disputeId}`);
    await this.escrowService.freezeEscrow(id, dto.disputeId);
    return { frozen: true, escrowId: id, disputeId: dto.disputeId };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get escrow details',
    description: 'Retrieve full details of an escrow account including milestones.',
  })
  @ApiParam({ name: 'id', description: 'Escrow account ID' })
  @ApiResponse({ status: 200, description: 'Escrow account details' })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  async getEscrow(@Param('id') id: string): Promise<EscrowAccount> {
    return this.escrowService.getEscrowById(id);
  }

  @Get(':id/balance')
  @ApiOperation({
    summary: 'Get escrow balance',
    description: 'Get the current balance breakdown (available, frozen, released, platformFee).',
  })
  @ApiParam({ name: 'id', description: 'Escrow account ID' })
  @ApiResponse({ status: 200, description: 'Escrow balance breakdown' })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  async getEscrowBalance(
    @Param('id') id: string,
  ): Promise<{ available: number; frozen: number; released: number; platformFee: number }> {
    return this.escrowService.getEscrowBalance(id);
  }
}
