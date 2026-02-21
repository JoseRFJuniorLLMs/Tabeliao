import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { EscrowAccount, EscrowStatus, EscrowMilestone } from './entities/escrow-account.entity';
import { PixService } from '../pix/pix.service';
import {
  PaymentMethod,
  DepositResult,
  ReleaseResult,
  RefundResult,
} from '../pix/types';
import type { PaymentConfig } from '../../config/payment.config';

@Injectable()
export class EscrowPaymentService {
  private readonly logger = new Logger(EscrowPaymentService.name);
  private readonly paymentConfig: PaymentConfig;

  constructor(
    @InjectRepository(EscrowAccount)
    private readonly escrowRepo: Repository<EscrowAccount>,
    private readonly pixService: PixService,
    private readonly configService: ConfigService,
  ) {
    this.paymentConfig = this.configService.get<PaymentConfig>('payment')!;
  }

  /**
   * Create a new escrow account for a legal contract.
   * Calculates platform fee and stores milestones if provided.
   */
  async createEscrow(
    contractId: string,
    amount: number,
    depositorId: string,
    beneficiaryId: string,
    depositDeadline?: Date,
    milestones?: Array<{ label: string; amount: number }>,
  ): Promise<EscrowAccount> {
    const decimalAmount = new Decimal(amount);

    if (decimalAmount.lessThanOrEqualTo(0)) {
      throw new HttpException('Escrow amount must be greater than zero', HttpStatus.BAD_REQUEST);
    }

    // Validate milestones sum matches total if provided
    if (milestones && milestones.length > 0) {
      const milestonesTotal = milestones.reduce(
        (sum, m) => sum.plus(new Decimal(m.amount)),
        new Decimal(0),
      );
      if (!milestonesTotal.equals(decimalAmount)) {
        throw new HttpException(
          `Milestones total (R$${milestonesTotal.toFixed(2)}) must equal escrow amount (R$${decimalAmount.toFixed(2)})`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const platformFee = this.calculateFee(amount);

    const escrowMilestones: EscrowMilestone[] = milestones
      ? milestones.map((m) => ({
          id: uuidv4(),
          label: m.label,
          amount: m.amount,
          released: false,
        }))
      : [];

    const escrow = this.escrowRepo.create({
      contractId,
      depositorId,
      beneficiaryId,
      totalAmount: decimalAmount.toFixed(2),
      depositedAmount: '0.00',
      releasedAmount: '0.00',
      frozenAmount: '0.00',
      platformFee: new Decimal(platformFee).toFixed(2),
      status: EscrowStatus.PENDING,
      currency: 'BRL',
      depositDeadline: depositDeadline ?? null,
      milestones: escrowMilestones,
    });

    const saved = await this.escrowRepo.save(escrow);

    this.logger.log(
      `Escrow created: id=${saved.id}, contract=${contractId}, ` +
      `amount=R$${decimalAmount.toFixed(2)}, fee=R$${new Decimal(platformFee).toFixed(2)}`,
    );

    return saved;
  }

  /**
   * Generate PIX or boleto for depositing into escrow.
   * Does NOT immediately mark the escrow as funded -- that happens via webhook.
   */
  async depositToEscrow(
    escrowId: string,
    paymentMethod: PaymentMethod,
    payerData: Record<string, unknown>,
  ): Promise<DepositResult> {
    const escrow = await this.findEscrowOrFail(escrowId);

    if (escrow.status === EscrowStatus.RELEASED || escrow.status === EscrowStatus.REFUNDED) {
      throw new ConflictException('Cannot deposit to a released or refunded escrow');
    }

    if (escrow.status === EscrowStatus.FROZEN) {
      throw new ConflictException('Cannot deposit to a frozen escrow');
    }

    const totalAmount = new Decimal(escrow.totalAmount);
    const deposited = new Decimal(escrow.depositedAmount);
    const remainingDeposit = totalAmount.minus(deposited);

    if (remainingDeposit.lessThanOrEqualTo(0)) {
      throw new ConflictException('Escrow is already fully funded');
    }

    const depositAmount = remainingDeposit.toNumber();
    const description = `Deposito Escrow - Contrato ${escrow.contractId}`;

    const result: DepositResult = {
      escrowId,
      amount: depositAmount,
      paymentMethod,
      status: 'PENDING',
    };

    if (paymentMethod === PaymentMethod.PIX) {
      const payerCpf = (payerData['cpf'] as string) ?? '';
      const pixCharge = await this.pixService.generatePixCharge(
        depositAmount,
        payerCpf,
        description,
      );
      result.pix = pixCharge;
    } else if (paymentMethod === PaymentMethod.BOLETO) {
      const boleto = await this.pixService.generateBoleto(
        depositAmount,
        {
          name: (payerData['name'] as string) ?? 'Depositante',
          document: (payerData['cpf'] as string) ?? (payerData['cnpj'] as string) ?? '',
          address: payerData['address'] as string | undefined,
          city: payerData['city'] as string | undefined,
          state: payerData['state'] as string | undefined,
          cep: payerData['cep'] as string | undefined,
        },
        escrow.depositDeadline ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        description,
      );
      result.boleto = boleto;
    } else {
      throw new HttpException(
        `Payment method ${paymentMethod} is not supported for escrow deposits`,
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(
      `Escrow deposit initiated: escrow=${escrowId}, method=${paymentMethod}, amount=R$${new Decimal(depositAmount).toFixed(2)}`,
    );

    return result;
  }

  /**
   * Release all remaining funds from escrow to the beneficiary.
   * Requires approval from both parties or an arbiter.
   */
  async releaseEscrow(escrowId: string, approvedBy: string[]): Promise<ReleaseResult> {
    const escrow = await this.findEscrowOrFail(escrowId);

    this.validateReleaseEligibility(escrow);

    if (!this.isReleaseAuthorized(escrow, approvedBy)) {
      throw new HttpException(
        'Release requires approval from both depositor and beneficiary, or from an arbiter',
        HttpStatus.FORBIDDEN,
      );
    }

    const deposited = new Decimal(escrow.depositedAmount);
    const released = new Decimal(escrow.releasedAmount);
    const fee = new Decimal(escrow.platformFee);
    const releasableAmount = deposited.minus(released).minus(fee);

    if (releasableAmount.lessThanOrEqualTo(0)) {
      throw new ConflictException('No funds available for release');
    }

    // In production: call PSP to transfer funds to beneficiary
    const transferTxId = `TRF-${uuidv4()}`;

    escrow.releasedAmount = deposited.minus(fee).toFixed(2);
    escrow.status = EscrowStatus.RELEASED;

    // Mark all milestones as released
    if (escrow.milestones && escrow.milestones.length > 0) {
      escrow.milestones = escrow.milestones.map((m) => ({
        ...m,
        released: true,
        releasedAt: new Date().toISOString(),
        approvedBy,
      }));
    }

    await this.escrowRepo.save(escrow);

    const result: ReleaseResult = {
      escrowId,
      amountReleased: releasableAmount.toNumber(),
      remainingBalance: 0,
      transferTxId,
      beneficiaryId: escrow.beneficiaryId,
      releasedAt: new Date(),
    };

    this.logger.log(
      `Escrow fully released: escrow=${escrowId}, amount=R$${releasableAmount.toFixed(2)}, ` +
      `beneficiary=${escrow.beneficiaryId}`,
    );

    return result;
  }

  /**
   * Release a partial amount from escrow, typically for milestone completion.
   */
  async releasePartialEscrow(
    escrowId: string,
    amount: number,
    milestone: string,
  ): Promise<ReleaseResult> {
    const escrow = await this.findEscrowOrFail(escrowId);

    this.validateReleaseEligibility(escrow);

    const decimalAmount = new Decimal(amount);
    const deposited = new Decimal(escrow.depositedAmount);
    const released = new Decimal(escrow.releasedAmount);
    const frozen = new Decimal(escrow.frozenAmount);
    const fee = new Decimal(escrow.platformFee);

    const available = deposited.minus(released).minus(frozen).minus(fee);

    if (decimalAmount.greaterThan(available)) {
      throw new HttpException(
        `Requested release R$${decimalAmount.toFixed(2)} exceeds available R$${available.toFixed(2)}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // In production: call PSP to transfer partial funds
    const transferTxId = `TRF-${uuidv4()}`;

    const newReleased = released.plus(decimalAmount);
    escrow.releasedAmount = newReleased.toFixed(2);

    // Update milestone status if found
    if (escrow.milestones && escrow.milestones.length > 0) {
      const milestoneEntry = escrow.milestones.find(
        (m) => m.label === milestone || m.id === milestone,
      );
      if (milestoneEntry) {
        milestoneEntry.released = true;
        milestoneEntry.releasedAt = new Date().toISOString();
      }
    }

    // Determine new status
    const totalAfterFee = deposited.minus(fee);
    if (newReleased.greaterThanOrEqualTo(totalAfterFee)) {
      escrow.status = EscrowStatus.RELEASED;
    } else {
      escrow.status = EscrowStatus.PARTIALLY_RELEASED;
    }

    await this.escrowRepo.save(escrow);

    const remainingBalance = deposited.minus(newReleased).minus(fee).toNumber();

    const result: ReleaseResult = {
      escrowId,
      amountReleased: decimalAmount.toNumber(),
      remainingBalance: Math.max(remainingBalance, 0),
      transferTxId,
      beneficiaryId: escrow.beneficiaryId,
      milestone,
      releasedAt: new Date(),
    };

    this.logger.log(
      `Escrow partial release: escrow=${escrowId}, amount=R$${decimalAmount.toFixed(2)}, ` +
      `milestone="${milestone}", remaining=R$${result.remainingBalance.toFixed(2)}`,
    );

    return result;
  }

  /**
   * Refund the depositor (full refund of remaining balance).
   */
  async refundEscrow(escrowId: string, reason: string): Promise<RefundResult> {
    const escrow = await this.findEscrowOrFail(escrowId);

    if (escrow.status === EscrowStatus.RELEASED) {
      throw new ConflictException('Cannot refund a fully released escrow');
    }

    if (escrow.status === EscrowStatus.REFUNDED) {
      throw new ConflictException('Escrow has already been refunded');
    }

    const deposited = new Decimal(escrow.depositedAmount);
    const released = new Decimal(escrow.releasedAmount);
    const refundableAmount = deposited.minus(released);

    if (refundableAmount.lessThanOrEqualTo(0)) {
      throw new ConflictException('No funds available for refund');
    }

    // In production: call PSP to transfer funds back to depositor
    const refundTxId = `RFD-${uuidv4()}`;

    escrow.status = EscrowStatus.REFUNDED;
    await this.escrowRepo.save(escrow);

    const result: RefundResult = {
      escrowId,
      amountRefunded: refundableAmount.toNumber(),
      reason,
      depositorId: escrow.depositorId,
      refundTxId,
      refundedAt: new Date(),
    };

    this.logger.log(
      `Escrow refunded: escrow=${escrowId}, amount=R$${refundableAmount.toFixed(2)}, ` +
      `reason="${reason}"`,
    );

    return result;
  }

  /**
   * Freeze escrow funds during a dispute.
   * Frozen funds cannot be released or refunded until unfrozen.
   */
  async freezeEscrow(escrowId: string, disputeId: string): Promise<void> {
    const escrow = await this.findEscrowOrFail(escrowId);

    if (escrow.status === EscrowStatus.RELEASED || escrow.status === EscrowStatus.REFUNDED) {
      throw new ConflictException('Cannot freeze a released or refunded escrow');
    }

    if (escrow.status === EscrowStatus.FROZEN) {
      throw new ConflictException('Escrow is already frozen');
    }

    const deposited = new Decimal(escrow.depositedAmount);
    const released = new Decimal(escrow.releasedAmount);
    const availableToFreeze = deposited.minus(released);

    escrow.frozenAmount = availableToFreeze.toFixed(2);
    escrow.status = EscrowStatus.FROZEN;
    escrow.disputeId = disputeId;

    await this.escrowRepo.save(escrow);

    this.logger.log(
      `Escrow frozen: escrow=${escrowId}, frozen=R$${availableToFreeze.toFixed(2)}, ` +
      `dispute=${disputeId}`,
    );
  }

  /**
   * Get the current balance breakdown of an escrow account.
   */
  async getEscrowBalance(
    escrowId: string,
  ): Promise<{ available: number; frozen: number; released: number; platformFee: number }> {
    const escrow = await this.findEscrowOrFail(escrowId);

    const deposited = new Decimal(escrow.depositedAmount);
    const released = new Decimal(escrow.releasedAmount);
    const frozen = new Decimal(escrow.frozenAmount);
    const fee = new Decimal(escrow.platformFee);

    const available = deposited.minus(released).minus(frozen).minus(fee);

    return {
      available: Math.max(available.toNumber(), 0),
      frozen: frozen.toNumber(),
      released: released.toNumber(),
      platformFee: fee.toNumber(),
    };
  }

  /**
   * Get escrow account details by ID.
   */
  async getEscrowById(escrowId: string): Promise<EscrowAccount> {
    return this.findEscrowOrFail(escrowId);
  }

  /**
   * Calculate the platform fee for a given amount.
   * Default: 1.5% of escrow value.
   */
  calculateFee(amount: number): number {
    const feePercent = new Decimal(this.paymentConfig.fees.escrowFeePercent);
    const decimalAmount = new Decimal(amount);
    return decimalAmount.times(feePercent).dividedBy(100).toDecimalPlaces(2).toNumber();
  }

  /**
   * Called when a deposit is confirmed (e.g., via PIX webhook).
   * Updates the escrow depositedAmount and status.
   */
  async confirmDeposit(escrowId: string, confirmedAmount: number): Promise<EscrowAccount> {
    const escrow = await this.findEscrowOrFail(escrowId);

    const deposited = new Decimal(escrow.depositedAmount);
    const newDeposited = deposited.plus(new Decimal(confirmedAmount));
    const total = new Decimal(escrow.totalAmount);

    escrow.depositedAmount = newDeposited.toFixed(2);

    if (newDeposited.greaterThanOrEqualTo(total)) {
      escrow.status = EscrowStatus.FUNDED;
    } else {
      escrow.status = EscrowStatus.PARTIALLY_FUNDED;
    }

    const saved = await this.escrowRepo.save(escrow);

    this.logger.log(
      `Escrow deposit confirmed: escrow=${escrowId}, deposited=R$${newDeposited.toFixed(2)}, ` +
      `status=${saved.status}`,
    );

    return saved;
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private async findEscrowOrFail(escrowId: string): Promise<EscrowAccount> {
    const escrow = await this.escrowRepo.findOne({ where: { id: escrowId } });
    if (!escrow) {
      throw new NotFoundException(`Escrow account ${escrowId} not found`);
    }
    return escrow;
  }

  private validateReleaseEligibility(escrow: EscrowAccount): void {
    if (escrow.status === EscrowStatus.RELEASED) {
      throw new ConflictException('Escrow has already been fully released');
    }
    if (escrow.status === EscrowStatus.REFUNDED) {
      throw new ConflictException('Escrow has been refunded');
    }
    if (escrow.status === EscrowStatus.FROZEN) {
      throw new ConflictException('Cannot release frozen escrow -- resolve dispute first');
    }
    if (escrow.status === EscrowStatus.PENDING) {
      throw new ConflictException('Escrow has no deposits to release');
    }
  }

  /**
   * Check if the release is authorized.
   * Authorized when: both depositor and beneficiary approved,
   * OR an arbiter (any ID not matching depositor/beneficiary) approved.
   */
  private isReleaseAuthorized(escrow: EscrowAccount, approvedBy: string[]): boolean {
    const hasDepositor = approvedBy.includes(escrow.depositorId);
    const hasBeneficiary = approvedBy.includes(escrow.beneficiaryId);

    // Both parties agree
    if (hasDepositor && hasBeneficiary) {
      return true;
    }

    // Arbiter approval (a third party not depositor or beneficiary)
    const hasArbiter = approvedBy.some(
      (id) => id !== escrow.depositorId && id !== escrow.beneficiaryId,
    );

    return hasArbiter;
  }
}
