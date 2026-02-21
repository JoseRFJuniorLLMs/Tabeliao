import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import * as PDFDocument from 'pdfkit';
import {
  Contract,
  ContractStatus,
  ContractType,
  ContractParty,
} from './entities/contract.entity';
import { Signature, SignatureType } from './entities/signature.entity';
import { ContractEvent, ContractEventType } from './entities/contract-event.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { SignContractDto } from './dto/sign-contract.dto';
import { QueryContractsDto } from './dto/query-contracts.dto';

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ContractStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalValue: number;
}

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,

    @InjectRepository(Signature)
    private readonly signatureRepository: Repository<Signature>,

    @InjectRepository(ContractEvent)
    private readonly eventRepository: Repository<ContractEvent>,
  ) {}

  async create(dto: CreateContractDto, userId: string): Promise<Contract> {
    const contractNumber = this.generateContractNumber();

    const parties: ContractParty[] = dto.parties.map((p) => ({
      userId: p.userId,
      name: p.name || '',
      document: p.document || '',
      email: p.email || '',
      role: p.role,
      signed: false,
    }));

    const contract = this.contractRepository.create({
      contractNumber,
      title: dto.title,
      type: dto.type,
      status: ContractStatus.DRAFT,
      content: dto.content || null,
      rawPrompt: dto.rawPrompt || null,
      parties,
      clauses: [],
      metadata: dto.metadata || {},
      totalValue: dto.totalValue?.toString() || null,
      currency: dto.currency || 'BRL',
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      createdBy: userId,
    });

    const saved = await this.contractRepository.save(contract);

    await this.addEvent(
      saved.id,
      ContractEventType.CREATED,
      `Contrato "${saved.title}" criado com numero ${saved.contractNumber}`,
      userId,
    );

    this.logger.log(`Contract created: ${saved.contractNumber} by user ${userId}`);

    return saved;
  }

  async findAll(
    userId: string,
    query: QueryContractsDto,
  ): Promise<PaginatedResult<Contract>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.contractRepository
      .createQueryBuilder('contract')
      .where('contract.createdBy = :userId', { userId });

    if (query.status) {
      qb.andWhere('contract.status = :status', { status: query.status });
    }

    if (query.type) {
      qb.andWhere('contract.type = :type', { type: query.type });
    }

    if (query.search) {
      qb.andWhere(
        '(contract.title ILIKE :search OR contract.content ILIKE :search OR contract.contractNumber ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('contract.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id },
      relations: ['signatures', 'events'],
      order: {
        events: {
          createdAt: 'DESC',
        },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contrato com ID ${id} nao encontrado`);
    }

    return contract;
  }

  async update(
    id: string,
    dto: UpdateContractDto,
    userId: string,
  ): Promise<Contract> {
    const contract = await this.findOne(id);

    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException(
        'Somente contratos em rascunho (DRAFT) podem ser editados',
      );
    }

    if (contract.createdBy !== userId) {
      throw new BadRequestException(
        'Somente o criador do contrato pode edita-lo',
      );
    }

    if (dto.title !== undefined) contract.title = dto.title;
    if (dto.content !== undefined) contract.content = dto.content;
    if (dto.totalValue !== undefined)
      contract.totalValue = dto.totalValue.toString();
    if (dto.currency !== undefined) contract.currency = dto.currency;
    if (dto.expiresAt !== undefined)
      contract.expiresAt = new Date(dto.expiresAt);
    if (dto.metadata !== undefined)
      contract.metadata = { ...contract.metadata, ...dto.metadata };

    if (dto.parties !== undefined) {
      contract.parties = dto.parties.map((p) => ({
        userId: p.userId,
        name: p.name || '',
        document: p.document || '',
        email: p.email || '',
        role: p.role,
        signed: false,
      }));
    }

    if (dto.clauses !== undefined) {
      contract.clauses = dto.clauses;
    }

    const saved = await this.contractRepository.save(contract);

    await this.addEvent(
      saved.id,
      ContractEventType.UPDATED,
      `Contrato atualizado por usuario ${userId}`,
      userId,
    );

    return saved;
  }

  async sign(
    id: string,
    userId: string,
    dto: SignContractDto,
  ): Promise<Contract> {
    const contract = await this.findOne(id);

    if (
      contract.status !== ContractStatus.DRAFT &&
      contract.status !== ContractStatus.PENDING_SIGNATURES
    ) {
      throw new BadRequestException(
        `Contrato com status ${contract.status} nao pode ser assinado`,
      );
    }

    const partyIndex = contract.parties.findIndex(
      (p) => p.userId === userId,
    );
    if (partyIndex === -1) {
      throw new BadRequestException(
        'Voce nao e uma das partes deste contrato',
      );
    }

    if (contract.parties[partyIndex]!.signed) {
      throw new ConflictException('Voce ja assinou este contrato');
    }

    const existingSignature = await this.signatureRepository.findOne({
      where: { contractId: id, userId },
    });
    if (existingSignature) {
      throw new ConflictException('Assinatura ja registrada para este usuario');
    }

    const contentToHash = contract.content || contract.title;
    const signatureHash = createHash('sha256')
      .update(contentToHash + userId + new Date().toISOString())
      .digest('hex');

    const govbrValidated =
      dto.signatureType === SignatureType.GOVBR && !!dto.govbrToken;

    const signature = this.signatureRepository.create({
      contractId: id,
      userId,
      signatureHash,
      signatureType: dto.signatureType,
      ipAddress: dto.ipAddress || null,
      userAgent: dto.userAgent || null,
      govbrValidated,
      certificateId: dto.certificateId || null,
    });

    await this.signatureRepository.save(signature);

    contract.parties[partyIndex] = {
      ...contract.parties[partyIndex]!,
      signed: true,
      signedAt: new Date().toISOString(),
    };

    if (contract.status === ContractStatus.DRAFT) {
      contract.status = ContractStatus.PENDING_SIGNATURES;
    }

    const allSigned = contract.parties.every((p) => p.signed);

    if (allSigned) {
      contract.status = ContractStatus.ACTIVE;

      await this.addEvent(
        id,
        ContractEventType.ALL_SIGNED,
        'Todas as partes assinaram o contrato',
        userId,
      );

      await this.addEvent(
        id,
        ContractEventType.ACTIVATED,
        'Contrato ativado automaticamente apos todas as assinaturas',
        userId,
      );

      this.logger.log(
        `Contract ${contract.contractNumber} fully signed and activated`,
      );
    }

    const saved = await this.contractRepository.save(contract);

    const partyName = contract.parties[partyIndex]!.name || userId;
    await this.addEvent(
      id,
      ContractEventType.SIGNED,
      `Contrato assinado por ${partyName} (${dto.signatureType})`,
      userId,
      { signatureType: dto.signatureType, govbrValidated },
    );

    return saved;
  }

  async cancel(
    id: string,
    userId: string,
    reason: string,
  ): Promise<Contract> {
    const contract = await this.findOne(id);

    const nonCancellable: ContractStatus[] = [
      ContractStatus.CANCELLED,
      ContractStatus.TERMINATED,
    ];

    if (nonCancellable.includes(contract.status)) {
      throw new BadRequestException(
        `Contrato com status ${contract.status} nao pode ser cancelado`,
      );
    }

    const isParty = contract.parties.some((p) => p.userId === userId);
    const isCreator = contract.createdBy === userId;

    if (!isParty && !isCreator) {
      throw new BadRequestException(
        'Somente as partes do contrato ou o criador podem cancela-lo',
      );
    }

    if (contract.status === ContractStatus.ACTIVE) {
      contract.status = ContractStatus.TERMINATED;
    } else {
      contract.status = ContractStatus.CANCELLED;
    }

    const saved = await this.contractRepository.save(contract);

    const eventType =
      saved.status === ContractStatus.TERMINATED
        ? ContractEventType.TERMINATED
        : ContractEventType.CANCELLED;

    await this.addEvent(
      id,
      eventType,
      `Contrato ${saved.status === ContractStatus.TERMINATED ? 'encerrado' : 'cancelado'}: ${reason}`,
      userId,
      { reason },
    );

    this.logger.log(
      `Contract ${contract.contractNumber} ${saved.status} by user ${userId}`,
    );

    return saved;
  }

  async getTimeline(id: string): Promise<ContractEvent[]> {
    const contract = await this.contractRepository.findOne({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException(`Contrato com ID ${id} nao encontrado`);
    }

    return this.eventRepository.find({
      where: { contractId: id },
      order: { createdAt: 'ASC' },
    });
  }

  async generatePdf(id: string): Promise<Buffer> {
    const contract = await this.findOne(id);
    const signatures = await this.signatureRepository.find({
      where: { contractId: id },
    });

    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 60, bottom: 60, left: 60, right: 60 },
          info: {
            Title: contract.title,
            Author: 'Tabeliao - Smart Legal Tech',
            Subject: `Contrato ${contract.contractNumber}`,
            Creator: 'Tabeliao Contract Service',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // --- Header ---
        doc
          .fontSize(10)
          .fillColor('#666666')
          .text('TABELIAO - Smart Legal Tech', 60, 30, { align: 'left' });

        doc
          .fontSize(8)
          .text(`Contrato No ${contract.contractNumber}`, 60, 42, {
            align: 'right',
          });

        doc
          .moveTo(60, 55)
          .lineTo(535, 55)
          .strokeColor('#003366')
          .lineWidth(2)
          .stroke();

        // --- Title ---
        doc
          .moveDown(1)
          .fontSize(18)
          .fillColor('#003366')
          .text(contract.title, { align: 'center' });

        doc
          .moveDown(0.5)
          .fontSize(10)
          .fillColor('#999999')
          .text(
            `Tipo: ${this.translateContractType(contract.type)} | Status: ${contract.status}`,
            { align: 'center' },
          );

        doc
          .moveDown(0.3)
          .text(
            `Criado em: ${contract.createdAt.toLocaleDateString('pt-BR')} | ${contract.expiresAt ? 'Expira em: ' + contract.expiresAt.toLocaleDateString('pt-BR') : 'Sem data de expiração'}`,
            { align: 'center' },
          );

        // --- Parties ---
        doc
          .moveDown(1.5)
          .fontSize(14)
          .fillColor('#003366')
          .text('PARTES ENVOLVIDAS', { underline: true });

        doc.moveDown(0.5);

        for (const party of contract.parties) {
          doc
            .fontSize(10)
            .fillColor('#333333')
            .text(`${party.role}: ${party.name || 'N/A'}`, {
              continued: false,
            });

          doc
            .fontSize(9)
            .fillColor('#666666')
            .text(
              `   Documento: ${party.document || 'N/A'} | Email: ${party.email || 'N/A'}`,
            );

          doc.text(
            `   Status: ${party.signed ? 'Assinado em ' + (party.signedAt || 'N/A') : 'Pendente'}`,
          );

          doc.moveDown(0.5);
        }

        // --- Value ---
        if (contract.totalValue) {
          doc
            .moveDown(0.5)
            .fontSize(14)
            .fillColor('#003366')
            .text('VALOR', { underline: true });

          doc
            .moveDown(0.5)
            .fontSize(11)
            .fillColor('#333333')
            .text(
              `Valor Total: ${contract.currency} ${parseFloat(contract.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            );

          doc.moveDown(0.5);
        }

        // --- Clauses ---
        if (contract.clauses.length > 0) {
          doc
            .moveDown(1)
            .fontSize(14)
            .fillColor('#003366')
            .text('CLAUSULAS', { underline: true });

          doc.moveDown(0.5);

          for (const clause of contract.clauses) {
            doc
              .fontSize(11)
              .fillColor('#333333')
              .text(
                `Clausula ${clause.number} - ${clause.title}${clause.isOptional ? ' (Opcional)' : ''}`,
                { underline: true },
              );

            doc
              .moveDown(0.3)
              .fontSize(10)
              .fillColor('#444444')
              .text(clause.content, { align: 'justify' });

            doc.moveDown(0.7);
          }
        }

        // --- Content ---
        if (contract.content) {
          doc
            .moveDown(1)
            .fontSize(14)
            .fillColor('#003366')
            .text('CONTEUDO DO CONTRATO', { underline: true });

          doc
            .moveDown(0.5)
            .fontSize(10)
            .fillColor('#333333')
            .text(contract.content, { align: 'justify' });
        }

        // --- Signatures Section ---
        doc.addPage();

        doc
          .fontSize(14)
          .fillColor('#003366')
          .text('ASSINATURAS', { underline: true });

        doc.moveDown(1);

        if (signatures.length > 0) {
          for (const sig of signatures) {
            const party = contract.parties.find(
              (p) => p.userId === sig.userId,
            );

            doc
              .fontSize(10)
              .fillColor('#333333')
              .text(`Assinante: ${party?.name || sig.userId}`);

            doc
              .fontSize(9)
              .fillColor('#666666')
              .text(`Tipo: ${sig.signatureType}`)
              .text(`Data: ${sig.signedAt.toLocaleString('pt-BR')}`)
              .text(`Hash: ${sig.signatureHash}`)
              .text(
                `Gov.br Validado: ${sig.govbrValidated ? 'Sim' : 'Nao'}`,
              );

            if (sig.certificateId) {
              doc.text(`Certificado ICP-Brasil: ${sig.certificateId}`);
            }

            doc.moveDown(0.3);
            doc
              .moveTo(doc.x, doc.y)
              .lineTo(doc.x + 200, doc.y)
              .strokeColor('#333333')
              .lineWidth(0.5)
              .stroke();

            doc.moveDown(1);
          }
        } else {
          doc
            .fontSize(10)
            .fillColor('#999999')
            .text('Nenhuma assinatura registrada.', { italic: true });
        }

        // --- Footer ---
        const contentHash = createHash('sha256')
          .update(JSON.stringify({
            contractNumber: contract.contractNumber,
            title: contract.title,
            content: contract.content,
            parties: contract.parties,
            clauses: contract.clauses,
          }))
          .digest('hex');

        doc.moveDown(2);
        doc
          .moveTo(60, doc.y)
          .lineTo(535, doc.y)
          .strokeColor('#003366')
          .lineWidth(1)
          .stroke();

        doc
          .moveDown(0.5)
          .fontSize(7)
          .fillColor('#999999')
          .text(
            `Documento gerado por Tabeliao - Smart Legal Tech em ${new Date().toLocaleString('pt-BR')}`,
            { align: 'center' },
          )
          .text(`Hash de integridade: ${contentHash}`, { align: 'center' });

        if (contract.blockchainHash) {
          doc.text(
            `Blockchain Hash: ${contract.blockchainHash}`,
            { align: 'center' },
          );
        }

        if (contract.blockchainTxId) {
          doc.text(
            `Blockchain TX: ${contract.blockchainTxId}`,
            { align: 'center' },
          );
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async getContractsByStatus(
    userId: string,
    status: ContractStatus,
  ): Promise<Contract[]> {
    return this.contractRepository.find({
      where: { createdBy: userId, status },
      order: { createdAt: 'DESC' },
    });
  }

  async searchContracts(
    userId: string,
    query: string,
  ): Promise<Contract[]> {
    return this.contractRepository.find({
      where: [
        { createdBy: userId, title: ILike(`%${query}%`) },
        { createdBy: userId, content: ILike(`%${query}%`) },
        { createdBy: userId, contractNumber: ILike(`%${query}%`) },
      ],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getStats(userId: string): Promise<ContractStats> {
    const contracts = await this.contractRepository.find({
      where: { createdBy: userId },
      select: ['id', 'status', 'type', 'totalValue'],
    });

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalValue = 0;

    for (const c of contracts) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byType[c.type] = (byType[c.type] || 0) + 1;
      if (c.totalValue) {
        totalValue += parseFloat(c.totalValue);
      }
    }

    return {
      total: contracts.length,
      byStatus,
      byType,
      totalValue,
    };
  }

  async addEvent(
    contractId: string,
    eventType: ContractEventType | string,
    description: string,
    performedBy: string | null,
    metadata: Record<string, unknown> = {},
  ): Promise<ContractEvent> {
    const event = this.eventRepository.create({
      contractId,
      eventType: eventType as string,
      description,
      performedBy,
      metadata,
    });

    return this.eventRepository.save(event);
  }

  private generateContractNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = randomUUID().slice(0, 8).toUpperCase();
    return `TAB-${year}${month}${day}-${random}`;
  }

  private translateContractType(type: ContractType): string {
    const translations: Record<ContractType, string> = {
      [ContractType.RENTAL]: 'Locacao',
      [ContractType.SERVICE]: 'Prestacao de Servico',
      [ContractType.FREELANCER]: 'Freelancer',
      [ContractType.NDA]: 'Acordo de Confidencialidade',
      [ContractType.LOAN]: 'Emprestimo',
      [ContractType.PURCHASE_SALE]: 'Compra e Venda',
      [ContractType.EMPLOYMENT]: 'Trabalhista',
      [ContractType.PARTNERSHIP]: 'Parceria',
      [ContractType.OTHER]: 'Outro',
    };
    return translations[type] || type;
  }
}
