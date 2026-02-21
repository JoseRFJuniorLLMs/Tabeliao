import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { GenerateInstallmentsDto } from './dto/generate-installments.dto';
import { MarkPaidDto } from './dto/mark-paid.dto';
import { SplitPaymentDto } from './dto/split-payment.dto';
import type { Invoice } from './entities/invoice.entity';
import type { SplitResult } from '../pix/types';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('payments')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private readonly billingService: BillingService) {}

  @Post('invoices')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create invoice',
    description: 'Create a single invoice for a contract. A PIX code is auto-generated.',
  })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async createInvoice(@Body() dto: CreateInvoiceDto): Promise<Invoice> {
    this.logger.log(`Creating invoice: contract=${dto.contractId}, amount=R$${dto.amount}`);
    return this.billingService.createInvoice(
      dto.contractId,
      dto.payerId,
      dto.payeeId,
      dto.amount,
      new Date(dto.dueDate),
      dto.installment,
      dto.totalInstallments,
      dto.description,
    );
  }

  @Post('invoices/generate-installments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate installment invoices',
    description:
      'Generate all installment invoices for a contract. ' +
      'The total is divided evenly with remainder on the last installment.',
  })
  @ApiResponse({ status: 201, description: 'Installment invoices generated' })
  @ApiResponse({ status: 400, description: 'Invalid request or exceeds max installments' })
  async generateInstallments(@Body() dto: GenerateInstallmentsDto): Promise<Invoice[]> {
    this.logger.log(
      `Generating installments: contract=${dto.contractId}, ` +
      `total=R$${dto.totalAmount}, installments=${dto.numberOfInstallments}`,
    );
    return this.billingService.generateInstallments(
      dto.contractId,
      dto.payerId,
      dto.payeeId,
      dto.totalAmount,
      dto.numberOfInstallments,
      new Date(dto.startDate),
      dto.dayOfMonth,
      dto.description,
    );
  }

  @Get('invoices/contract/:contractId')
  @ApiOperation({
    summary: 'List invoices by contract',
    description: 'Get all invoices for a specific contract, ordered by installment/due date.',
  })
  @ApiParam({ name: 'contractId', description: 'Contract ID' })
  @ApiResponse({ status: 200, description: 'List of invoices' })
  async getInvoicesByContract(
    @Param('contractId') contractId: string,
  ): Promise<Invoice[]> {
    return this.billingService.getInvoicesByContract(contractId);
  }

  @Get('invoices/overdue')
  @ApiOperation({
    summary: 'List overdue invoices',
    description: 'Get all overdue invoices for a specific user (as payer).',
  })
  @ApiQuery({ name: 'userId', description: 'Payer user ID', required: true })
  @ApiResponse({ status: 200, description: 'List of overdue invoices' })
  async getOverdueInvoices(@Query('userId') userId: string): Promise<Invoice[]> {
    return this.billingService.getOverdueInvoices(userId);
  }

  @Get('invoices/:id')
  @ApiOperation({
    summary: 'Get invoice details',
    description: 'Retrieve full details of an invoice including splits and late fees.',
  })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getInvoice(@Param('id') id: string): Promise<Invoice> {
    return this.billingService.getInvoiceById(id);
  }

  @Post('invoices/:id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark invoice as paid',
    description: 'Mark an invoice as paid with the given payment method and optional data.',
  })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice marked as paid' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 409, description: 'Invoice is not eligible for payment' })
  async markAsPaid(
    @Param('id') id: string,
    @Body() dto: MarkPaidDto,
  ): Promise<Invoice> {
    this.logger.log(`Marking invoice as paid: id=${id}, method=${dto.paymentMethod}`);
    return this.billingService.markAsPaid(id, dto.paymentMethod, dto.paymentData);
  }

  @Post('invoices/:id/split')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Split invoice payment',
    description:
      'Configure payment split between multiple parties. ' +
      'Percentages must total 100%. Used for rent splits, commission, etc.',
  })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Split configured' })
  @ApiResponse({ status: 400, description: 'Invalid split percentages' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async splitPayment(
    @Param('id') id: string,
    @Body() dto: SplitPaymentDto,
  ): Promise<SplitResult> {
    this.logger.log(`Splitting invoice: id=${id}, recipients=${dto.splits.length}`);
    return this.billingService.splitPayment(id, dto.splits);
  }

  @Post('billing/process-overdue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process overdue invoices',
    description:
      'Trigger processing of all overdue invoices: apply multa (2%) and juros (1%/month pro-rata). ' +
      'Typically called by a cron job.',
  })
  @ApiResponse({ status: 200, description: 'Overdue processing triggered' })
  async processOverdue(): Promise<{ triggered: boolean; timestamp: string }> {
    this.logger.log('Triggering overdue invoice processing');
    await this.billingService.processOverdueInvoices();
    return { triggered: true, timestamp: new Date().toISOString() };
  }
}
