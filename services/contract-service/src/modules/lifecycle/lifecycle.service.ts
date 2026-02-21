import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import {
  Contract,
  ContractStatus,
} from '../contracts/entities/contract.entity';
import { ContractEvent, ContractEventType } from '../contracts/entities/contract-event.entity';
import { ContractsService } from '../contracts/contracts.service';
import {
  AdjustmentIndexType,
} from './dto/lifecycle.dto';

interface ExpiringContract {
  contract: Contract;
  daysUntilExpiry: number;
  notificationLevel: 'INFO' | 'WARNING' | 'URGENT' | 'CRITICAL';
}

interface AdjustmentResult {
  contractId: string;
  contractNumber: string;
  currentValue: number;
  adjustedValue: number;
  adjustmentRate: number;
  indexType: AdjustmentIndexType;
  difference: number;
}

interface RenewalProposal {
  contractId: string;
  contractNumber: string;
  currentValue: number;
  proposedValue: number;
  currentExpiresAt: Date | null;
  proposedExpiresAt: Date;
  status: string;
}

@Injectable()
export class LifecycleService {
  private readonly logger = new Logger(LifecycleService.name);

  private readonly INDEX_RATES: Record<string, number> = {
    [AdjustmentIndexType.IGPM]: 3.89,
    [AdjustmentIndexType.IPCA]: 4.62,
    [AdjustmentIndexType.SELIC]: 13.25,
  };

  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,

    @InjectRepository(ContractEvent)
    private readonly eventRepository: Repository<ContractEvent>,

    private readonly contractsService: ContractsService,
  ) {}

  async checkExpiringContracts(): Promise<ExpiringContract[]> {
    const now = new Date();
    const windows = [
      { days: 1, level: 'CRITICAL' as const },
      { days: 7, level: 'URGENT' as const },
      { days: 15, level: 'WARNING' as const },
      { days: 30, level: 'INFO' as const },
    ];

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const contracts = await this.contractRepository.find({
      where: {
        status: In([ContractStatus.ACTIVE, ContractStatus.RENEWAL_PROPOSED]),
        expiresAt: LessThanOrEqual(thirtyDaysFromNow),
      },
      order: { expiresAt: 'ASC' },
    });

    const results: ExpiringContract[] = [];

    for (const contract of contracts) {
      if (!contract.expiresAt) continue;

      const diffMs = contract.expiresAt.getTime() - now.getTime();
      const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) continue;

      let notificationLevel: ExpiringContract['notificationLevel'] = 'INFO';
      for (const window of windows) {
        if (daysUntilExpiry <= window.days) {
          notificationLevel = window.level;
          break;
        }
      }

      results.push({
        contract,
        daysUntilExpiry,
        notificationLevel,
      });
    }

    this.logger.log(
      `Found ${results.length} contracts expiring within 30 days`,
    );

    for (const result of results) {
      if (result.notificationLevel === 'CRITICAL' || result.notificationLevel === 'URGENT') {
        await this.contractsService.addEvent(
          result.contract.id,
          ContractEventType.NOTIFICATION_SENT,
          `Contrato expira em ${result.daysUntilExpiry} dia(s) - Nivel: ${result.notificationLevel}`,
          null,
          {
            daysUntilExpiry: result.daysUntilExpiry,
            notificationLevel: result.notificationLevel,
          },
        );
      }
    }

    return results;
  }

  async checkOverduePayments(): Promise<Contract[]> {
    const now = new Date();

    const contracts = await this.contractRepository.find({
      where: {
        status: ContractStatus.ACTIVE,
      },
    });

    const overdueContracts: Contract[] = [];

    for (const contract of contracts) {
      const metadata = contract.metadata as Record<string, unknown>;
      const lastPaymentDate = metadata?.lastPaymentDate as string | undefined;
      const paymentDay = metadata?.paymentDay as number | undefined;

      if (!paymentDay) continue;

      const currentMonthDue = new Date(
        now.getFullYear(),
        now.getMonth(),
        paymentDay,
      );

      const isOverdue = lastPaymentDate
        ? new Date(lastPaymentDate) < currentMonthDue && now > currentMonthDue
        : now > currentMonthDue;

      if (isOverdue) {
        overdueContracts.push(contract);

        await this.contractsService.addEvent(
          contract.id,
          ContractEventType.PAYMENT_OVERDUE,
          `Pagamento em atraso detectado para o contrato ${contract.contractNumber}`,
          null,
          {
            expectedDate: currentMonthDue.toISOString(),
            lastPaymentDate: lastPaymentDate || 'Nenhum pagamento registrado',
          },
        );
      }
    }

    this.logger.log(`Found ${overdueContracts.length} contracts with overdue payments`);

    return overdueContracts;
  }

  async calculateAdjustment(
    contractId: string,
    indexType: AdjustmentIndexType,
    customRate?: number,
  ): Promise<AdjustmentResult> {
    const contract = await this.contractsService.findOne(contractId);

    if (!contract.totalValue) {
      throw new BadRequestException(
        'Contrato nao possui valor total definido para calculo de reajuste',
      );
    }

    let rate: number;

    if (indexType === AdjustmentIndexType.CUSTOM) {
      if (customRate === undefined || customRate === null) {
        throw new BadRequestException(
          'Taxa customizada e obrigatoria quando o tipo de indice e CUSTOM',
        );
      }
      rate = customRate;
    } else {
      rate = this.INDEX_RATES[indexType] ?? 0;
    }

    const currentValue = parseFloat(contract.totalValue);
    const adjustedValue = currentValue * (1 + rate / 100);
    const difference = adjustedValue - currentValue;

    const result: AdjustmentResult = {
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      currentValue,
      adjustedValue: Math.round(adjustedValue * 100) / 100,
      adjustmentRate: rate,
      indexType,
      difference: Math.round(difference * 100) / 100,
    };

    this.logger.log(
      `Adjustment calculated for ${contract.contractNumber}: ${currentValue} -> ${result.adjustedValue} (${indexType} ${rate}%)`,
    );

    return result;
  }

  async proposeRenewal(
    contractId: string,
    newValue: number,
    newExpiresAt: string,
    userId: string,
    notes?: string,
  ): Promise<RenewalProposal> {
    const contract = await this.contractsService.findOne(contractId);

    if (
      contract.status !== ContractStatus.ACTIVE &&
      contract.status !== ContractStatus.EXPIRED
    ) {
      throw new BadRequestException(
        `Contrato com status ${contract.status} nao pode ter renovacao proposta. Somente contratos ACTIVE ou EXPIRED.`,
      );
    }

    contract.status = ContractStatus.RENEWAL_PROPOSED;
    contract.metadata = {
      ...contract.metadata,
      renewalProposal: {
        proposedBy: userId,
        proposedAt: new Date().toISOString(),
        newValue,
        newExpiresAt,
        notes: notes || null,
        approvals: [userId],
        requiredApprovals: contract.parties.map((p) => p.userId),
      },
    };

    await this.contractRepository.save(contract);

    await this.contractsService.addEvent(
      contractId,
      ContractEventType.RENEWAL_PROPOSED,
      `Renovacao proposta: novo valor ${newValue}, novo vencimento ${new Date(newExpiresAt).toLocaleDateString('pt-BR')}`,
      userId,
      { newValue, newExpiresAt, notes },
    );

    return {
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      currentValue: contract.totalValue ? parseFloat(contract.totalValue) : 0,
      proposedValue: newValue,
      currentExpiresAt: contract.expiresAt,
      proposedExpiresAt: new Date(newExpiresAt),
      status: 'RENEWAL_PROPOSED',
    };
  }

  async approveRenewal(
    contractId: string,
    userId: string,
  ): Promise<Contract> {
    const contract = await this.contractsService.findOne(contractId);

    if (contract.status !== ContractStatus.RENEWAL_PROPOSED) {
      throw new BadRequestException(
        'Contrato nao possui uma proposta de renovacao pendente',
      );
    }

    const isParty = contract.parties.some((p) => p.userId === userId);
    if (!isParty) {
      throw new BadRequestException(
        'Somente as partes do contrato podem aprovar a renovacao',
      );
    }

    const metadata = contract.metadata as Record<string, unknown>;
    const proposal = metadata.renewalProposal as Record<string, unknown> | undefined;

    if (!proposal) {
      throw new BadRequestException('Dados da proposta de renovacao nao encontrados');
    }

    const approvals = (proposal.approvals as string[]) || [];
    if (approvals.includes(userId)) {
      throw new BadRequestException('Voce ja aprovou esta renovacao');
    }

    approvals.push(userId);
    proposal.approvals = approvals;

    const requiredApprovals = (proposal.requiredApprovals as string[]) || [];
    const allApproved = requiredApprovals.every((id: string) =>
      approvals.includes(id),
    );

    await this.contractsService.addEvent(
      contractId,
      ContractEventType.RENEWAL_APPROVED,
      `Renovacao aprovada por ${userId}`,
      userId,
      { approvals, allApproved },
    );

    if (allApproved) {
      const newValue = proposal.newValue as number;
      const newExpiresAt = proposal.newExpiresAt as string;

      contract.totalValue = newValue.toString();
      contract.expiresAt = new Date(newExpiresAt);
      contract.status = ContractStatus.RENEWED;
      contract.renewalDate = new Date();

      contract.metadata = {
        ...metadata,
        renewalProposal: {
          ...proposal,
          completedAt: new Date().toISOString(),
          status: 'COMPLETED',
        },
        previousValues: [
          ...((metadata.previousValues as unknown[]) || []),
          {
            value: contract.totalValue,
            expiresAt: contract.expiresAt?.toISOString(),
            renewedAt: new Date().toISOString(),
          },
        ],
      };

      contract.status = ContractStatus.ACTIVE;

      await this.contractsService.addEvent(
        contractId,
        ContractEventType.RENEWED,
        `Contrato renovado: novo valor ${newValue}, novo vencimento ${new Date(newExpiresAt).toLocaleDateString('pt-BR')}`,
        userId,
        { newValue, newExpiresAt },
      );

      this.logger.log(
        `Contract ${contract.contractNumber} renewed successfully`,
      );
    } else {
      contract.metadata = { ...metadata, renewalProposal: proposal };
    }

    return this.contractRepository.save(contract);
  }

  async processAutomaticActions(): Promise<{
    expired: number;
    notified: number;
    finesApplied: number;
  }> {
    const now = new Date();
    let expired = 0;
    let notified = 0;
    let finesApplied = 0;

    const expiredContracts = await this.contractRepository.find({
      where: {
        status: ContractStatus.ACTIVE,
        expiresAt: LessThanOrEqual(now),
      },
    });

    for (const contract of expiredContracts) {
      contract.status = ContractStatus.EXPIRED;
      await this.contractRepository.save(contract);

      await this.contractsService.addEvent(
        contract.id,
        ContractEventType.EXPIRED,
        `Contrato expirado automaticamente em ${now.toLocaleDateString('pt-BR')}`,
        null,
      );

      expired++;
    }

    const expiringResults = await this.checkExpiringContracts();
    notified = expiringResults.filter(
      (r) => r.notificationLevel === 'CRITICAL' || r.notificationLevel === 'URGENT',
    ).length;

    const overdueContracts = await this.checkOverduePayments();
    for (const contract of overdueContracts) {
      const metadata = contract.metadata as Record<string, unknown>;
      const fineAlreadyApplied = metadata?.fineAppliedThisMonth as boolean;

      if (!fineAlreadyApplied && contract.totalValue) {
        const fineRate = 0.02;
        const fineValue = parseFloat(contract.totalValue) * fineRate;

        contract.metadata = {
          ...metadata,
          fineAppliedThisMonth: true,
          fineAppliedAt: now.toISOString(),
          fineValue,
          totalWithFine: parseFloat(contract.totalValue) + fineValue,
        };

        await this.contractRepository.save(contract);

        await this.contractsService.addEvent(
          contract.id,
          ContractEventType.FINE_APPLIED,
          `Multa de 2% aplicada por atraso: R$ ${fineValue.toFixed(2)}`,
          null,
          { fineRate, fineValue, originalValue: contract.totalValue },
        );

        finesApplied++;
      }
    }

    this.logger.log(
      `Automatic actions processed: ${expired} expired, ${notified} notified, ${finesApplied} fines applied`,
    );

    return { expired, notified, finesApplied };
  }
}
