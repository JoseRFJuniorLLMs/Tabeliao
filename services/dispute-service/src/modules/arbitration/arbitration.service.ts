import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Arbitrator } from './entities/arbitrator.entity';
import { ArbitratorRating } from './entities/arbitrator-rating.entity';
import { Dispute, DisputeStatus } from '../disputes/entities/dispute.entity';
import { DisputeMessage, SenderRole } from '../disputes/entities/dispute-message.entity';
import { RegisterArbitratorDto } from './dto/register-arbitrator.dto';
import { DecisionDto } from './dto/decision.dto';

export interface ArbitratorStats {
  totalCases: number;
  resolvedCases: number;
  averageRating: number;
  averageResolutionDays: number;
  currentCases: number;
  specialties: string[];
}

@Injectable()
export class ArbitrationService {
  private readonly logger = new Logger(ArbitrationService.name);
  private readonly paymentServiceUrl: string;
  private readonly notificationServiceUrl: string;

  constructor(
    @InjectRepository(Arbitrator)
    private readonly arbitratorRepository: Repository<Arbitrator>,
    @InjectRepository(ArbitratorRating)
    private readonly ratingRepository: Repository<ArbitratorRating>,
    @InjectRepository(Dispute)
    private readonly disputeRepository: Repository<Dispute>,
    @InjectRepository(DisputeMessage)
    private readonly messageRepository: Repository<DisputeMessage>,
    private readonly configService: ConfigService,
  ) {
    this.paymentServiceUrl = this.configService.get<string>(
      'PAYMENT_SERVICE_URL',
      'http://localhost:3006',
    );
    this.notificationServiceUrl = this.configService.get<string>(
      'NOTIFICATION_SERVICE_URL',
      'http://localhost:3005',
    );
  }

  async assignArbitrator(disputeId: string): Promise<Arbitrator> {
    const dispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException(`Disputa com ID ${disputeId} nao encontrada`);
    }

    if (dispute.arbitratorId) {
      throw new BadRequestException('Esta disputa ja possui um arbitrador designado');
    }

    const availableArbitrators = await this.arbitratorRepository
      .createQueryBuilder('arb')
      .where('arb.isAvailable = true')
      .andWhere('arb.currentCases < arb.maxConcurrentCases')
      .andWhere('arb.userId != :plaintiff', { plaintiff: dispute.openedBy })
      .andWhere('arb.userId != :defendant', { defendant: dispute.respondentId })
      .orderBy('arb.currentCases', 'ASC')
      .addOrderBy('arb.rating', 'DESC')
      .addOrderBy('arb.resolvedCases', 'DESC')
      .getMany();

    if (availableArbitrators.length === 0) {
      throw new BadRequestException(
        'Nao ha arbitradores disponiveis no momento. Tente novamente mais tarde.',
      );
    }

    const selectedArbitrator = this.selectArbitratorByRoundRobin(
      availableArbitrators,
      dispute.type,
    );

    selectedArbitrator.currentCases += 1;
    selectedArbitrator.totalCases += 1;
    await this.arbitratorRepository.save(selectedArbitrator);

    dispute.arbitratorId = selectedArbitrator.userId;
    dispute.status = DisputeStatus.UNDER_ARBITRATION;
    await this.disputeRepository.save(dispute);

    const systemMessage = this.messageRepository.create({
      disputeId,
      senderId: 'system',
      senderRole: SenderRole.SYSTEM,
      content: `Arbitrador designado para esta disputa. OAB ${selectedArbitrator.oabNumber}/${selectedArbitrator.oabState}. Especialidades: ${selectedArbitrator.specialties.join(', ')}. Rating: ${selectedArbitrator.rating.toFixed(1)}/5.0.`,
      isPrivate: false,
      attachments: [],
    });

    await this.messageRepository.save(systemMessage);

    await this.notifyArbitrationAssignment(dispute, selectedArbitrator);

    this.logger.log(
      `Arbitrator ${selectedArbitrator.id} assigned to dispute ${disputeId}`,
    );

    return selectedArbitrator;
  }

  async getArbitrators(filters?: {
    specialty?: string;
    minRating?: number;
    available?: boolean;
  }): Promise<Arbitrator[]> {
    const queryBuilder = this.arbitratorRepository.createQueryBuilder('arb');

    if (filters?.available !== undefined) {
      queryBuilder.andWhere('arb.isAvailable = :available', {
        available: filters.available,
      });
    }

    if (filters?.minRating !== undefined) {
      queryBuilder.andWhere('arb.rating >= :minRating', {
        minRating: filters.minRating,
      });
    }

    if (filters?.specialty) {
      queryBuilder.andWhere('arb.specialties @> :specialty', {
        specialty: JSON.stringify([filters.specialty]),
      });
    }

    queryBuilder.orderBy('arb.rating', 'DESC').addOrderBy('arb.resolvedCases', 'DESC');

    return queryBuilder.getMany();
  }

  async registerArbitrator(
    dto: RegisterArbitratorDto,
    userId: string,
  ): Promise<Arbitrator> {
    const existingByOab = await this.arbitratorRepository.findOne({
      where: { oabNumber: dto.oabNumber, oabState: dto.oabState },
    });

    if (existingByOab) {
      throw new ConflictException(
        `Ja existe um arbitrador cadastrado com a OAB ${dto.oabNumber}/${dto.oabState}`,
      );
    }

    const existingByUser = await this.arbitratorRepository.findOne({
      where: { userId },
    });

    if (existingByUser) {
      throw new ConflictException('Este usuario ja esta cadastrado como arbitrador');
    }

    const validStates = [
      'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
      'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
      'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
    ];

    if (!validStates.includes(dto.oabState)) {
      throw new BadRequestException(
        `Estado da OAB invalido: ${dto.oabState}. Use uma sigla valida (ex: SP, RJ, MG).`,
      );
    }

    const arbitrator = this.arbitratorRepository.create({
      userId,
      oabNumber: dto.oabNumber,
      oabState: dto.oabState,
      specialties: dto.specialties,
      maxConcurrentCases: dto.maxConcurrentCases ?? 5,
      bio: dto.bio ?? null,
      rating: 5.0,
      totalCases: 0,
      resolvedCases: 0,
      averageResolutionDays: 0,
      isAvailable: true,
      currentCases: 0,
    });

    const savedArbitrator = await this.arbitratorRepository.save(arbitrator);

    this.logger.log(
      `Arbitrator registered: ${savedArbitrator.id} (OAB ${dto.oabNumber}/${dto.oabState})`,
    );

    return savedArbitrator;
  }

  async submitDecision(
    disputeId: string,
    arbitratorId: string,
    decisionDto: DecisionDto,
  ): Promise<Dispute> {
    const dispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException(`Disputa com ID ${disputeId} nao encontrada`);
    }

    if (dispute.arbitratorId !== arbitratorId) {
      throw new ForbiddenException(
        'Apenas o arbitrador designado pode submeter a decisao',
      );
    }

    if (
      dispute.status === DisputeStatus.RESOLVED ||
      dispute.status === DisputeStatus.CLOSED
    ) {
      throw new BadRequestException('Esta disputa ja foi resolvida ou fechada');
    }

    const fullDecision = this.formatDecision(decisionDto, dispute);

    dispute.resolution = fullDecision;
    dispute.status = DisputeStatus.RESOLVED;
    dispute.resolvedAt = new Date();

    const savedDispute = await this.disputeRepository.save(dispute);

    const arbitrator = await this.arbitratorRepository.findOne({
      where: { userId: arbitratorId },
    });

    if (arbitrator) {
      arbitrator.resolvedCases += 1;
      arbitrator.currentCases = Math.max(0, arbitrator.currentCases - 1);

      const filedAt = dispute.filedAt ?? dispute.createdAt;
      const resolutionDays =
        (new Date().getTime() - filedAt.getTime()) / (1000 * 60 * 60 * 24);

      if (arbitrator.resolvedCases === 1) {
        arbitrator.averageResolutionDays = resolutionDays;
      } else {
        arbitrator.averageResolutionDays =
          (arbitrator.averageResolutionDays * (arbitrator.resolvedCases - 1) +
            resolutionDays) /
          arbitrator.resolvedCases;
      }

      await this.arbitratorRepository.save(arbitrator);
    }

    const systemMessage = this.messageRepository.create({
      disputeId,
      senderId: 'system',
      senderRole: SenderRole.SYSTEM,
      content: `DECISAO ARBITRAL VINCULANTE: ${fullDecision}`,
      isPrivate: false,
      attachments: [],
    });

    await this.messageRepository.save(systemMessage);

    await this.triggerEscrowAction(dispute, decisionDto);

    await this.notifyDecision(savedDispute);

    this.logger.log(
      `Decision submitted for dispute ${disputeId} by arbitrator ${arbitratorId}`,
    );

    return savedDispute;
  }

  async rateArbitrator(
    disputeId: string,
    userId: string,
    rating: number,
    feedback: string,
  ): Promise<void> {
    const dispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException(`Disputa com ID ${disputeId} nao encontrada`);
    }

    if (dispute.openedBy !== userId && dispute.respondentId !== userId) {
      throw new ForbiddenException(
        'Apenas as partes da disputa podem avaliar o arbitrador',
      );
    }

    if (
      dispute.status !== DisputeStatus.RESOLVED &&
      dispute.status !== DisputeStatus.CLOSED
    ) {
      throw new BadRequestException(
        'So e possivel avaliar o arbitrador apos a resolucao da disputa',
      );
    }

    if (!dispute.arbitratorId) {
      throw new BadRequestException('Esta disputa nao possui arbitrador designado');
    }

    const existingRating = await this.ratingRepository.findOne({
      where: { disputeId, userId },
    });

    if (existingRating) {
      throw new ConflictException('Voce ja avaliou o arbitrador nesta disputa');
    }

    const arbitrator = await this.arbitratorRepository.findOne({
      where: { userId: dispute.arbitratorId },
    });

    if (!arbitrator) {
      throw new NotFoundException('Arbitrador nao encontrado');
    }

    const newRating = this.ratingRepository.create({
      arbitratorId: arbitrator.id,
      disputeId,
      userId,
      rating,
      feedback: feedback || null,
    });

    await this.ratingRepository.save(newRating);

    const allRatings = await this.ratingRepository.find({
      where: { arbitratorId: arbitrator.id },
    });

    const averageRating =
      allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

    arbitrator.rating = parseFloat(averageRating.toFixed(2));
    await this.arbitratorRepository.save(arbitrator);

    this.logger.log(
      `Arbitrator ${arbitrator.id} rated ${rating} by user ${userId} for dispute ${disputeId}`,
    );
  }

  calculateArbitrationFee(disputeValue: number): number {
    const fee = disputeValue * 0.05;
    return Math.max(150, Math.min(2000, fee));
  }

  async getArbitratorStats(arbitratorId: string): Promise<ArbitratorStats> {
    const arbitrator = await this.arbitratorRepository.findOne({
      where: { id: arbitratorId },
    });

    if (!arbitrator) {
      throw new NotFoundException(
        `Arbitrador com ID ${arbitratorId} nao encontrado`,
      );
    }

    return {
      totalCases: arbitrator.totalCases,
      resolvedCases: arbitrator.resolvedCases,
      averageRating: arbitrator.rating,
      averageResolutionDays: parseFloat(arbitrator.averageResolutionDays.toFixed(1)),
      currentCases: arbitrator.currentCases,
      specialties: arbitrator.specialties,
    };
  }

  private selectArbitratorByRoundRobin(
    arbitrators: Arbitrator[],
    disputeType: string,
  ): Arbitrator {
    const disputeTypeToSpecialty: Record<string, string[]> = {
      BREACH_OF_CONTRACT: ['Direito Contratual', 'Direito Civil'],
      PAYMENT_DISPUTE: ['Direito do Consumidor', 'Direito Bancario'],
      QUALITY_DISPUTE: ['Direito do Consumidor', 'Direito Civil'],
      DELIVERY_DISPUTE: ['Direito do Consumidor', 'Direito Comercial'],
      OTHER: [],
    };

    const preferredSpecialties = disputeTypeToSpecialty[disputeType] || [];

    if (preferredSpecialties.length > 0) {
      const specializedArbitrators = arbitrators.filter((arb) =>
        arb.specialties.some((s) => preferredSpecialties.includes(s)),
      );

      if (specializedArbitrators.length > 0) {
        return specializedArbitrators[0]!;
      }
    }

    return arbitrators[0]!;
  }

  private formatDecision(decisionDto: DecisionDto, dispute: Dispute): string {
    const parts: string[] = [
      `DECISAO ARBITRAL - Disputa ${dispute.id}`,
      '',
      `Data: ${new Date().toLocaleDateString('pt-BR')}`,
      `Tipo: ${dispute.type}`,
      `Valor em disputa: R$ ${parseFloat(dispute.disputeValue).toFixed(2)}`,
      '',
      '--- DECISAO ---',
      decisionDto.decision,
      '',
      '--- FUNDAMENTACAO ---',
      decisionDto.reasoning,
    ];

    if (decisionDto.awardedAmount !== undefined) {
      parts.push('', `Valor determinado: R$ ${decisionDto.awardedAmount.toFixed(2)}`);
    }

    if (decisionDto.awardedPercentage !== undefined) {
      parts.push(
        '',
        `Percentual do valor em disputa: ${decisionDto.awardedPercentage}%`,
      );
    }

    parts.push(
      '',
      'Esta decisao e vinculante e de cumprimento obrigatorio pelas partes conforme Lei de Arbitragem (Lei 9.307/96).',
    );

    return parts.join('\n');
  }

  private async triggerEscrowAction(
    dispute: Dispute,
    decisionDto: DecisionDto,
  ): Promise<void> {
    try {
      const disputeValue = parseFloat(dispute.disputeValue);
      let releaseToPlaintiff = 0;
      let releaseToDefendant = 0;

      if (decisionDto.awardedAmount !== undefined) {
        releaseToPlaintiff = decisionDto.awardedAmount;
        releaseToDefendant = disputeValue - decisionDto.awardedAmount;
      } else if (decisionDto.awardedPercentage !== undefined) {
        releaseToPlaintiff = disputeValue * (decisionDto.awardedPercentage / 100);
        releaseToDefendant = disputeValue - releaseToPlaintiff;
      } else {
        releaseToPlaintiff = disputeValue;
      }

      await axios.post(`${this.paymentServiceUrl}/api/v1/escrow/release`, {
        contractId: dispute.contractId,
        disputeId: dispute.id,
        resolution: dispute.resolution,
        distributions: [
          { userId: dispute.openedBy, amount: releaseToPlaintiff },
          { userId: dispute.respondentId, amount: releaseToDefendant },
        ],
      });

      this.logger.log(
        `Escrow released for dispute ${dispute.id}: plaintiff=${releaseToPlaintiff}, defendant=${releaseToDefendant}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to release escrow for dispute ${dispute.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async notifyArbitrationAssignment(
    dispute: Dispute,
    arbitrator: Arbitrator,
  ): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/api/v1/notifications/send`, {
        type: 'ARBITRATOR_ASSIGNED',
        recipients: [dispute.openedBy, dispute.respondentId, arbitrator.userId],
        data: {
          disputeId: dispute.id,
          contractId: dispute.contractId,
          arbitratorOab: `${arbitrator.oabNumber}/${arbitrator.oabState}`,
          arbitratorRating: arbitrator.rating,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send arbitration assignment notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async notifyDecision(dispute: Dispute): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/api/v1/notifications/send`, {
        type: 'ARBITRATION_DECISION',
        recipients: [dispute.openedBy, dispute.respondentId],
        data: {
          disputeId: dispute.id,
          contractId: dispute.contractId,
          resolution: dispute.resolution,
          status: dispute.status,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send decision notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
