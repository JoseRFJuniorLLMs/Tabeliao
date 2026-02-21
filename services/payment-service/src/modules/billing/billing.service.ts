import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Decimal from 'decimal.js';
import { addMonths, setDate, differenceInDays, startOfDay } from 'date-fns';
import { Invoice, InvoiceStatus, InvoiceSplit } from './entities/invoice.entity';
import { PixService } from '../pix/pix.service';
import type { SplitResult } from '../pix/types';
import type { PaymentConfig } from '../../config/payment.config';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly paymentConfig: PaymentConfig;

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    private readonly pixService: PixService,
    private readonly configService: ConfigService,
  ) {
    this.paymentConfig = this.configService.get<PaymentConfig>('payment')!;
  }

  /**
   * Create a single invoice.
   */
  async createInvoice(
    contractId: string,
    payerId: string,
    payeeId: string,
    amount: number,
    dueDate: Date,
    installment: number | undefined,
    totalInstallments: number | undefined,
    description: string,
  ): Promise<Invoice> {
    const decimalAmount = new Decimal(amount);

    if (decimalAmount.lessThanOrEqualTo(0)) {
      throw new HttpException('Invoice amount must be greater than zero', HttpStatus.BAD_REQUEST);
    }

    const invoice = this.invoiceRepo.create({
      contractId,
      payerId,
      payeeId,
      originalAmount: decimalAmount.toFixed(2),
      fineAmount: '0.00',
      interestAmount: '0.00',
      totalAmount: decimalAmount.toFixed(2),
      currency: 'BRL',
      status: InvoiceStatus.PENDING,
      dueDate,
      installmentNumber: installment ?? null,
      totalInstallments: totalInstallments ?? null,
      description,
      splits: [],
      metadata: {},
    });

    // Generate PIX code for the invoice
    try {
      const pixCharge = await this.pixService.generatePixCharge(
        decimalAmount.toNumber(),
        '', // Payer CPF will be filled when actual payment is made
        `Fatura ${description}`,
      );
      invoice.pixCode = pixCharge.pixCode;
    } catch (error) {
      this.logger.warn(`Could not generate PIX code for invoice: ${error}`);
      // Invoice is still valid without pre-generated PIX code
    }

    const saved = await this.invoiceRepo.save(invoice);

    this.logger.log(
      `Invoice created: id=${saved.id}, contract=${contractId}, ` +
      `amount=R$${decimalAmount.toFixed(2)}, due=${dueDate.toISOString().split('T')[0]}`,
    );

    return saved;
  }

  /**
   * Generate all installment invoices for a contract.
   * Distributes the total evenly, with remainder cents on the last installment.
   */
  async generateInstallments(
    contractId: string,
    payerId: string,
    payeeId: string,
    totalAmount: number,
    numberOfInstallments: number,
    startDate: Date,
    dayOfMonth: number,
    description: string,
  ): Promise<Invoice[]> {
    const maxInstallments = this.paymentConfig.maxInstallments;
    if (numberOfInstallments > maxInstallments) {
      throw new HttpException(
        `Maximum ${maxInstallments} installments allowed`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const decimalTotal = new Decimal(totalAmount);
    const installmentAmount = decimalTotal.dividedBy(numberOfInstallments).toDecimalPlaces(2, Decimal.ROUND_DOWN);

    const minAmount = new Decimal(this.paymentConfig.minInstallmentAmount);
    if (installmentAmount.lessThan(minAmount)) {
      throw new HttpException(
        `Installment amount R$${installmentAmount.toFixed(2)} is below minimum R$${minAmount.toFixed(2)}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const invoices: Invoice[] = [];
    let accumulatedAmount = new Decimal(0);

    for (let i = 1; i <= numberOfInstallments; i++) {
      // Calculate due date: starting from startDate, advancing months, setting day
      const dueDate = setDate(addMonths(startDate, i - 1), dayOfMonth);

      let currentAmount: Decimal;
      if (i === numberOfInstallments) {
        // Last installment absorbs any rounding difference
        currentAmount = decimalTotal.minus(accumulatedAmount);
      } else {
        currentAmount = installmentAmount;
      }

      accumulatedAmount = accumulatedAmount.plus(currentAmount);

      const installmentDescription = `${description} - Parcela ${i}/${numberOfInstallments}`;

      const invoice = this.invoiceRepo.create({
        contractId,
        payerId,
        payeeId,
        originalAmount: currentAmount.toFixed(2),
        fineAmount: '0.00',
        interestAmount: '0.00',
        totalAmount: currentAmount.toFixed(2),
        currency: 'BRL',
        status: InvoiceStatus.PENDING,
        dueDate,
        installmentNumber: i,
        totalInstallments: numberOfInstallments,
        description: installmentDescription,
        splits: [],
        metadata: {},
      });

      invoices.push(invoice);
    }

    const savedInvoices = await this.invoiceRepo.save(invoices);

    this.logger.log(
      `Generated ${numberOfInstallments} installments for contract=${contractId}, ` +
      `total=R$${decimalTotal.toFixed(2)}, each~R$${installmentAmount.toFixed(2)}`,
    );

    return savedInvoices;
  }

  /**
   * Cron job: find overdue invoices, calculate fine + interest, update amounts.
   * Should be called daily (e.g. via Bull queue or NestJS Scheduler).
   *
   * Brazilian CDC rules:
   * - Multa: 2% flat fine on the original amount
   * - Juros: 1% per month pro-rata (days/30)
   */
  async processOverdueInvoices(): Promise<void> {
    const today = startOfDay(new Date());

    const overdueInvoices = await this.invoiceRepo.find({
      where: {
        status: In([InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]),
        dueDate: LessThan(today),
      },
    });

    this.logger.log(`Processing ${overdueInvoices.length} overdue invoices`);

    for (const invoice of overdueInvoices) {
      try {
        await this.applyLateFee(invoice.id);
      } catch (error) {
        this.logger.error(`Failed to apply late fee to invoice ${invoice.id}`, error);
      }
    }

    this.logger.log(`Overdue processing complete: ${overdueInvoices.length} invoices updated`);
  }

  /**
   * Calculate and apply late fee (multa + juros) to a single invoice.
   *
   * Multa: 2% of originalAmount (applied once)
   * Juros: 1% per month pro-rata (daysLate / 30) of originalAmount
   */
  async applyLateFee(invoiceId: string): Promise<Invoice> {
    const invoice = await this.findInvoiceOrFail(invoiceId);

    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
      throw new ConflictException('Cannot apply late fee to a paid or cancelled invoice');
    }

    const today = startOfDay(new Date());
    const dueDate = startOfDay(new Date(invoice.dueDate));
    const daysLate = differenceInDays(today, dueDate);

    if (daysLate <= 0) {
      // Not overdue yet
      return invoice;
    }

    const originalAmount = new Decimal(invoice.originalAmount);
    const finePercent = new Decimal(this.paymentConfig.fees.latePaymentFinePercent);
    const monthlyInterestPercent = new Decimal(this.paymentConfig.fees.latePaymentMonthlyInterestPercent);

    // Multa: flat 2% of original amount
    const fineAmount = originalAmount.times(finePercent).dividedBy(100).toDecimalPlaces(2);

    // Juros: 1% per month pro-rata (daysLate / 30)
    const proRataMonths = new Decimal(daysLate).dividedBy(30);
    const interestAmount = originalAmount
      .times(monthlyInterestPercent)
      .dividedBy(100)
      .times(proRataMonths)
      .toDecimalPlaces(2);

    const totalAmount = originalAmount.plus(fineAmount).plus(interestAmount);

    invoice.fineAmount = fineAmount.toFixed(2);
    invoice.interestAmount = interestAmount.toFixed(2);
    invoice.totalAmount = totalAmount.toFixed(2);
    invoice.status = InvoiceStatus.OVERDUE;

    const saved = await this.invoiceRepo.save(invoice);

    this.logger.log(
      `Late fee applied: invoice=${invoiceId}, daysLate=${daysLate}, ` +
      `fine=R$${fineAmount.toFixed(2)}, interest=R$${interestAmount.toFixed(2)}, ` +
      `total=R$${totalAmount.toFixed(2)}`,
    );

    return saved;
  }

  /**
   * Mark an invoice as paid.
   */
  async markAsPaid(
    invoiceId: string,
    paymentMethod: string,
    paymentData?: Record<string, unknown>,
  ): Promise<Invoice> {
    const invoice = await this.findInvoiceOrFail(invoiceId);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new ConflictException('Invoice is already paid');
    }

    if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.REFUNDED) {
      throw new ConflictException('Cannot pay a cancelled or refunded invoice');
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = new Date();
    invoice.paymentMethod = paymentMethod;

    if (paymentData) {
      invoice.metadata = { ...invoice.metadata, paymentData };
    }

    const saved = await this.invoiceRepo.save(invoice);

    this.logger.log(
      `Invoice paid: id=${invoiceId}, method=${paymentMethod}, amount=R$${invoice.totalAmount}`,
    );

    return saved;
  }

  /**
   * Get all invoices for a contract.
   */
  async getInvoicesByContract(contractId: string): Promise<Invoice[]> {
    return this.invoiceRepo.find({
      where: { contractId },
      order: { installmentNumber: 'ASC', dueDate: 'ASC' },
    });
  }

  /**
   * Get overdue invoices for a specific user (as payer).
   */
  async getOverdueInvoices(userId: string): Promise<Invoice[]> {
    return this.invoiceRepo.find({
      where: {
        payerId: userId,
        status: InvoiceStatus.OVERDUE,
      },
      order: { dueDate: 'ASC' },
    });
  }

  /**
   * Get invoice by ID.
   */
  async getInvoiceById(invoiceId: string): Promise<Invoice> {
    return this.findInvoiceOrFail(invoiceId);
  }

  /**
   * Split payment between multiple parties.
   * The splits must total 100%.
   */
  async splitPayment(
    invoiceId: string,
    splits: Array<{ userId: string; percentage: number }>,
  ): Promise<SplitResult> {
    const invoice = await this.findInvoiceOrFail(invoiceId);

    // Validate splits total to 100%
    const totalPercentage = splits.reduce(
      (sum, s) => sum.plus(new Decimal(s.percentage)),
      new Decimal(0),
    );

    if (!totalPercentage.equals(100)) {
      throw new HttpException(
        `Split percentages must total 100%, got ${totalPercentage.toFixed(2)}%`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const totalAmount = new Decimal(invoice.totalAmount);
    const invoiceSplits: InvoiceSplit[] = [];
    let allocatedAmount = new Decimal(0);

    for (let i = 0; i < splits.length; i++) {
      const split = splits[i]!;
      let splitAmount: Decimal;

      if (i === splits.length - 1) {
        // Last split absorbs any rounding difference
        splitAmount = totalAmount.minus(allocatedAmount);
      } else {
        splitAmount = totalAmount
          .times(new Decimal(split.percentage))
          .dividedBy(100)
          .toDecimalPlaces(2, Decimal.ROUND_DOWN);
      }

      allocatedAmount = allocatedAmount.plus(splitAmount);

      invoiceSplits.push({
        userId: split.userId,
        percentage: split.percentage,
        amount: splitAmount.toNumber(),
      });
    }

    invoice.splits = invoiceSplits;
    await this.invoiceRepo.save(invoice);

    const result: SplitResult = {
      invoiceId,
      totalAmount: totalAmount.toNumber(),
      splits: invoiceSplits.map((s) => ({
        userId: s.userId,
        percentage: s.percentage,
        amount: s.amount,
      })),
      registeredWithPsp: true, // In production: register splits with PSP
      createdAt: new Date(),
    };

    this.logger.log(
      `Split payment configured: invoice=${invoiceId}, ${splits.length} recipients, ` +
      `total=R$${totalAmount.toFixed(2)}`,
    );

    return result;
  }

  /**
   * Generate next month's invoice for a recurring contract (rent, SaaS, etc.).
   * Looks up the latest invoice for the contract and generates the next one.
   */
  async generateRecurringInvoice(contractId: string): Promise<Invoice> {
    const latestInvoices = await this.invoiceRepo.find({
      where: { contractId },
      order: { dueDate: 'DESC' },
      take: 1,
    });

    if (latestInvoices.length === 0) {
      throw new NotFoundException(
        `No existing invoices found for contract ${contractId} to base recurring generation on`,
      );
    }

    const latest = latestInvoices[0]!;
    const lastDueDate = new Date(latest.dueDate);
    const nextDueDate = addMonths(lastDueDate, 1);

    const nextInstallment = latest.installmentNumber
      ? latest.installmentNumber + 1
      : null;

    const nextDescription = latest.description
      ? latest.description.replace(
          /Parcela \d+/,
          `Parcela ${nextInstallment ?? ''}`,
        )
      : `Fatura recorrente - ${contractId}`;

    const invoice = this.invoiceRepo.create({
      contractId,
      payerId: latest.payerId,
      payeeId: latest.payeeId,
      originalAmount: latest.originalAmount,
      fineAmount: '0.00',
      interestAmount: '0.00',
      totalAmount: latest.originalAmount,
      currency: latest.currency,
      status: InvoiceStatus.PENDING,
      dueDate: nextDueDate,
      installmentNumber: nextInstallment,
      totalInstallments: latest.totalInstallments,
      description: nextDescription,
      splits: latest.splits ?? [],
      metadata: { recurringFrom: latest.id },
    });

    const saved = await this.invoiceRepo.save(invoice);

    this.logger.log(
      `Recurring invoice generated: id=${saved.id}, contract=${contractId}, ` +
      `amount=R$${latest.originalAmount}, due=${nextDueDate.toISOString().split('T')[0]}`,
    );

    return saved;
  }

  /**
   * Calculate an adjusted amount based on a monetary index (IGPM, IPCA, SELIC).
   * Used for annual rent adjustments or contract value corrections.
   *
   * @param baseAmount - Original amount
   * @param indexType - Index type ('IGPM', 'IPCA', 'SELIC')
   * @param accumulatedRate - Accumulated rate for the period (e.g. 0.0534 = 5.34%)
   * @returns Adjusted amount
   */
  calculateAdjustedAmount(
    baseAmount: number,
    _indexType: 'IGPM' | 'IPCA' | 'SELIC',
    accumulatedRate: number,
  ): number {
    const base = new Decimal(baseAmount);
    const rate = new Decimal(accumulatedRate);

    // Adjusted = base * (1 + accumulatedRate)
    const adjusted = base.times(new Decimal(1).plus(rate)).toDecimalPlaces(2);

    this.logger.log(
      `Amount adjusted: base=R$${base.toFixed(2)}, index=${_indexType}, ` +
      `rate=${rate.times(100).toFixed(4)}%, adjusted=R$${adjusted.toFixed(2)}`,
    );

    return adjusted.toNumber();
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private async findInvoiceOrFail(invoiceId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId } });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }
    return invoice;
  }
}
