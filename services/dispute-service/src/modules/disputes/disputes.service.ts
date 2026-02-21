import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';
import { Dispute, DisputeStatus, EvidenceItem } from './entities/dispute.entity';
import { DisputeMessage, SenderRole } from './entities/dispute-message.entity';
import { OpenDisputeDto, EvidenceDto } from './dto/open-dispute.dto';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);
  private readonly paymentServiceUrl: string;
  private readonly notificationServiceUrl: string;

  constructor(
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

  async openDispute(dto: OpenDisputeDto, userId: string): Promise<Dispute> {
    this.logger.log(`Opening dispute for contract ${dto.contractId} by user ${userId}`);

    const existingDispute = await this.disputeRepository.findOne({
      where: {
        contractId: dto.contractId,
        openedBy: userId,
        status: DisputeStatus.OPENED,
      },
    });

    if (existingDispute) {
      throw new BadRequestException(
        'Ja existe uma disputa aberta para este contrato por este usuario',
      );
    }

    const deadline = addDays(new Date(), 15);

    const evidenceItems: EvidenceItem[] = (dto.evidence || []).map((ev) => ({
      id: uuidv4(),
      type: ev.type,
      url: ev.url,
      description: ev.description,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
    }));

    const dispute = this.disputeRepository.create({
      contractId: dto.contractId,
      openedBy: userId,
      respondentId: dto.respondentId,
      type: dto.type,
      description: dto.description,
      disputeValue: dto.disputeValue.toFixed(2),
      evidence: evidenceItems,
      deadline,
      filedAt: new Date(),
      status: DisputeStatus.OPENED,
      resolutionAcceptedByPlaintiff: false,
      resolutionAcceptedByDefendant: false,
    });

    const savedDispute = await this.disputeRepository.save(dispute);

    await this.freezeEscrow(dto.contractId, savedDispute.id);

    await this.notifyParties(savedDispute, 'DISPUTE_OPENED');

    const systemMessage = this.messageRepository.create({
      disputeId: savedDispute.id,
      senderId: 'system',
      senderRole: SenderRole.SYSTEM,
      content: `Disputa aberta com sucesso. Prazo maximo para resolucao: ${deadline.toLocaleDateString('pt-BR')}. Valor em disputa: R$ ${dto.disputeValue.toFixed(2)}.`,
      isPrivate: false,
      attachments: [],
    });

    await this.messageRepository.save(systemMessage);

    this.logger.log(`Dispute ${savedDispute.id} created successfully`);

    return savedDispute;
  }

  async getDispute(id: string): Promise<Dispute> {
    const dispute = await this.disputeRepository.findOne({
      where: { id },
      relations: ['messages'],
    });

    if (!dispute) {
      throw new NotFoundException(`Disputa com ID ${id} nao encontrada`);
    }

    return dispute;
  }

  async getDisputesByUser(userId: string, status?: DisputeStatus): Promise<Dispute[]> {
    const queryBuilder = this.disputeRepository
      .createQueryBuilder('dispute')
      .where('(dispute.openedBy = :userId OR dispute.respondentId = :userId)', { userId })
      .orderBy('dispute.createdAt', 'DESC');

    if (status) {
      queryBuilder.andWhere('dispute.status = :status', { status });
    }

    return queryBuilder.getMany();
  }

  async getDisputesByContract(contractId: string): Promise<Dispute[]> {
    return this.disputeRepository.find({
      where: { contractId },
      order: { createdAt: 'DESC' },
    });
  }

  async addEvidence(
    disputeId: string,
    evidenceDto: EvidenceDto,
    userId: string,
  ): Promise<Dispute> {
    const dispute = await this.getDispute(disputeId);

    this.validateDisputeParticipant(dispute, userId);

    if (
      dispute.status === DisputeStatus.RESOLVED ||
      dispute.status === DisputeStatus.CLOSED
    ) {
      throw new BadRequestException(
        'Nao e possivel adicionar evidencias a uma disputa resolvida ou fechada',
      );
    }

    const newEvidence: EvidenceItem = {
      id: uuidv4(),
      type: evidenceDto.type,
      url: evidenceDto.url,
      description: evidenceDto.description,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
    };

    dispute.evidence = [...dispute.evidence, newEvidence];

    const savedDispute = await this.disputeRepository.save(dispute);

    const systemMessage = this.messageRepository.create({
      disputeId,
      senderId: 'system',
      senderRole: SenderRole.SYSTEM,
      content: `Nova evidencia adicionada: ${evidenceDto.description} (tipo: ${evidenceDto.type})`,
      isPrivate: false,
      attachments: [],
    });

    await this.messageRepository.save(systemMessage);

    this.logger.log(`Evidence added to dispute ${disputeId} by user ${userId}`);

    return savedDispute;
  }

  async sendMessage(
    disputeId: string,
    senderId: string,
    content: string,
    isPrivate = false,
  ): Promise<DisputeMessage> {
    const dispute = await this.getDispute(disputeId);

    if (
      dispute.status === DisputeStatus.RESOLVED ||
      dispute.status === DisputeStatus.CLOSED
    ) {
      throw new BadRequestException(
        'Nao e possivel enviar mensagens em uma disputa resolvida ou fechada',
      );
    }

    const senderRole = this.determineSenderRole(dispute, senderId);

    if (isPrivate && senderRole !== SenderRole.ARBITRATOR && senderRole !== SenderRole.MEDIATOR) {
      throw new ForbiddenException(
        'Apenas arbitradores e mediadores podem enviar mensagens privadas',
      );
    }

    const message = this.messageRepository.create({
      disputeId,
      senderId,
      senderRole,
      content,
      isPrivate,
      attachments: [],
    });

    const savedMessage = await this.messageRepository.save(message);

    this.logger.log(`Message sent in dispute ${disputeId} by ${senderId} (${senderRole})`);

    return savedMessage;
  }

  async getMessages(disputeId: string, userId: string): Promise<DisputeMessage[]> {
    const dispute = await this.getDispute(disputeId);

    const isArbitratorOrMediator =
      dispute.arbitratorId === userId || dispute.mediatorId === userId;

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .where('message.disputeId = :disputeId', { disputeId })
      .orderBy('message.createdAt', 'ASC');

    if (!isArbitratorOrMediator) {
      queryBuilder.andWhere('message.isPrivate = false');
    }

    return queryBuilder.getMany();
  }

  async closeDispute(
    disputeId: string,
    resolution: string,
    decidedBy: string,
  ): Promise<Dispute> {
    const dispute = await this.getDispute(disputeId);

    if (dispute.arbitratorId !== decidedBy) {
      throw new ForbiddenException(
        'Apenas o arbitrador designado pode encerrar a disputa',
      );
    }

    if (
      dispute.status === DisputeStatus.RESOLVED ||
      dispute.status === DisputeStatus.CLOSED
    ) {
      throw new BadRequestException('Esta disputa ja foi resolvida ou fechada');
    }

    dispute.resolution = resolution;
    dispute.status = DisputeStatus.RESOLVED;
    dispute.resolvedAt = new Date();

    const savedDispute = await this.disputeRepository.save(dispute);

    const systemMessage = this.messageRepository.create({
      disputeId,
      senderId: 'system',
      senderRole: SenderRole.SYSTEM,
      content: `Disputa encerrada pelo arbitrador. Decisao: ${resolution}`,
      isPrivate: false,
      attachments: [],
    });

    await this.messageRepository.save(systemMessage);

    await this.notifyParties(savedDispute, 'DISPUTE_RESOLVED');

    await this.releaseEscrow(dispute.contractId, disputeId, resolution);

    this.logger.log(`Dispute ${disputeId} closed by arbitrator ${decidedBy}`);

    return savedDispute;
  }

  async acceptResolution(disputeId: string, userId: string): Promise<Dispute> {
    const dispute = await this.getDispute(disputeId);

    if (!dispute.resolution) {
      throw new BadRequestException(
        'Nao ha resolucao proposta para aceitar nesta disputa',
      );
    }

    if (
      dispute.status === DisputeStatus.RESOLVED ||
      dispute.status === DisputeStatus.CLOSED
    ) {
      throw new BadRequestException('Esta disputa ja foi resolvida ou fechada');
    }

    if (userId === dispute.openedBy) {
      if (dispute.resolutionAcceptedByPlaintiff) {
        throw new BadRequestException('Voce ja aceitou esta resolucao');
      }
      dispute.resolutionAcceptedByPlaintiff = true;
    } else if (userId === dispute.respondentId) {
      if (dispute.resolutionAcceptedByDefendant) {
        throw new BadRequestException('Voce ja aceitou esta resolucao');
      }
      dispute.resolutionAcceptedByDefendant = true;
    } else {
      throw new ForbiddenException(
        'Apenas as partes da disputa podem aceitar a resolucao',
      );
    }

    if (dispute.resolutionAcceptedByPlaintiff && dispute.resolutionAcceptedByDefendant) {
      dispute.status = DisputeStatus.RESOLVED;
      dispute.resolvedAt = new Date();

      const systemMessage = this.messageRepository.create({
        disputeId,
        senderId: 'system',
        senderRole: SenderRole.SYSTEM,
        content:
          'Ambas as partes aceitaram a resolucao. Disputa resolvida com sucesso por acordo mutuo.',
        isPrivate: false,
        attachments: [],
      });

      await this.messageRepository.save(systemMessage);

      await this.notifyParties(dispute, 'DISPUTE_RESOLVED');
      await this.releaseEscrow(dispute.contractId, disputeId, dispute.resolution);

      this.logger.log(`Dispute ${disputeId} resolved by mutual acceptance`);
    } else {
      const partyLabel = userId === dispute.openedBy ? 'reclamante' : 'reclamado';

      const systemMessage = this.messageRepository.create({
        disputeId,
        senderId: 'system',
        senderRole: SenderRole.SYSTEM,
        content: `A parte ${partyLabel} aceitou a resolucao proposta. Aguardando aceitacao da outra parte.`,
        isPrivate: false,
        attachments: [],
      });

      await this.messageRepository.save(systemMessage);
    }

    return this.disputeRepository.save(dispute);
  }

  async escalateDispute(disputeId: string, reason: string): Promise<Dispute> {
    const dispute = await this.getDispute(disputeId);

    if (
      dispute.status === DisputeStatus.RESOLVED ||
      dispute.status === DisputeStatus.CLOSED
    ) {
      throw new BadRequestException(
        'Nao e possivel escalar uma disputa ja resolvida ou fechada',
      );
    }

    const previousStatus = dispute.status;
    dispute.status = DisputeStatus.ESCALATED;

    const savedDispute = await this.disputeRepository.save(dispute);

    const escalationContext =
      previousStatus === DisputeStatus.AI_REVIEW ||
      previousStatus === DisputeStatus.UNDER_MEDIATION
        ? 'da mediacao por IA para arbitragem humana'
        : 'para nivel superior de arbitragem';

    const systemMessage = this.messageRepository.create({
      disputeId,
      senderId: 'system',
      senderRole: SenderRole.SYSTEM,
      content: `Disputa escalada ${escalationContext}. Motivo: ${reason}`,
      isPrivate: false,
      attachments: [],
    });

    await this.messageRepository.save(systemMessage);

    await this.notifyParties(savedDispute, 'DISPUTE_ESCALATED');

    this.logger.log(
      `Dispute ${disputeId} escalated from ${previousStatus} to ESCALATED. Reason: ${reason}`,
    );

    return savedDispute;
  }

  async getDisputeStats(): Promise<{
    total: number;
    open: number;
    resolved: number;
    averageResolutionDays: number;
  }> {
    const total = await this.disputeRepository.count();

    const open = await this.disputeRepository.count({
      where: [
        { status: DisputeStatus.OPENED },
        { status: DisputeStatus.UNDER_MEDIATION },
        { status: DisputeStatus.UNDER_ARBITRATION },
        { status: DisputeStatus.AI_REVIEW },
        { status: DisputeStatus.AWAITING_ACCEPTANCE },
        { status: DisputeStatus.ESCALATED },
      ],
    });

    const resolved = await this.disputeRepository.count({
      where: [{ status: DisputeStatus.RESOLVED }, { status: DisputeStatus.CLOSED }],
    });

    const avgResult = await this.disputeRepository
      .createQueryBuilder('dispute')
      .select(
        'AVG(EXTRACT(EPOCH FROM (dispute.resolvedAt - dispute.filedAt)) / 86400)',
        'avgDays',
      )
      .where('dispute.resolvedAt IS NOT NULL')
      .andWhere('dispute.filedAt IS NOT NULL')
      .getRawOne();

    const averageResolutionDays = avgResult?.avgDays
      ? parseFloat(parseFloat(avgResult.avgDays as string).toFixed(1))
      : 0;

    return {
      total,
      open,
      resolved,
      averageResolutionDays,
    };
  }

  private validateDisputeParticipant(dispute: Dispute, userId: string): void {
    const isParticipant =
      dispute.openedBy === userId ||
      dispute.respondentId === userId ||
      dispute.arbitratorId === userId ||
      dispute.mediatorId === userId;

    if (!isParticipant) {
      throw new ForbiddenException(
        'Voce nao e participante desta disputa',
      );
    }
  }

  private determineSenderRole(dispute: Dispute, senderId: string): SenderRole {
    if (dispute.arbitratorId === senderId) {
      return SenderRole.ARBITRATOR;
    }
    if (dispute.mediatorId === senderId) {
      return SenderRole.MEDIATOR;
    }
    if (dispute.openedBy === senderId) {
      return SenderRole.PLAINTIFF;
    }
    if (dispute.respondentId === senderId) {
      return SenderRole.DEFENDANT;
    }

    throw new ForbiddenException(
      'Voce nao e participante desta disputa',
    );
  }

  private async freezeEscrow(contractId: string, disputeId: string): Promise<void> {
    try {
      await axios.post(`${this.paymentServiceUrl}/api/v1/escrow/freeze`, {
        contractId,
        disputeId,
        reason: 'Disputa aberta - valores congelados ate resolucao',
      });

      this.logger.log(`Escrow frozen for contract ${contractId} due to dispute ${disputeId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to freeze escrow for contract ${contractId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async releaseEscrow(
    contractId: string,
    disputeId: string,
    resolution: string | null,
  ): Promise<void> {
    try {
      await axios.post(`${this.paymentServiceUrl}/api/v1/escrow/release`, {
        contractId,
        disputeId,
        resolution,
        reason: 'Disputa resolvida - valores liberados conforme decisao',
      });

      this.logger.log(`Escrow released for contract ${contractId} after dispute ${disputeId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to release escrow for contract ${contractId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async notifyParties(dispute: Dispute, eventType: string): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/api/v1/notifications/send`, {
        type: eventType,
        recipients: [dispute.openedBy, dispute.respondentId],
        data: {
          disputeId: dispute.id,
          contractId: dispute.contractId,
          status: dispute.status,
          disputeValue: dispute.disputeValue,
          deadline: dispute.deadline,
        },
      });

      this.logger.log(`Notification sent for dispute ${dispute.id}: ${eventType}`);
    } catch (error) {
      this.logger.warn(
        `Failed to send notification for dispute ${dispute.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
