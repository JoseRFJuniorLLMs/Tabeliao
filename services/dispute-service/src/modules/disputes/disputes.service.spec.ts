import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import axios from 'axios';
import { DisputesService } from './disputes.service';
import { Dispute, DisputeStatus, DisputeType } from './entities/dispute.entity';
import { DisputeMessage, SenderRole } from './entities/dispute-message.entity';
import { OpenDisputeDto } from './dto/open-dispute.dto';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

// ─── Helper: build a fake Dispute ────────────────────────────────────────────
const buildDispute = (overrides: Partial<Dispute> = {}): Dispute =>
  ({
    id: 'dispute-1',
    contractId: 'contract-1',
    openedBy: 'plaintiff-1',
    respondentId: 'defendant-1',
    status: DisputeStatus.OPENED,
    type: DisputeType.BREACH_OF_CONTRACT,
    description: 'O prestador nao cumpriu o prazo estabelecido no contrato, causando prejuizo ao projeto.',
    disputeValue: '5000.00',
    evidence: [],
    arbitratorId: 'arbitrator-1',
    mediatorId: 'mediator-1',
    aiAnalysis: null,
    resolution: null,
    resolutionAcceptedByPlaintiff: false,
    resolutionAcceptedByDefendant: false,
    deadline: new Date('2026-03-01'),
    filedAt: new Date('2026-02-15'),
    resolvedAt: null,
    createdAt: new Date('2026-02-15'),
    updatedAt: new Date('2026-02-15'),
    messages: [],
    ...overrides,
  }) as Dispute;

const buildMessage = (overrides: Partial<DisputeMessage> = {}): DisputeMessage =>
  ({
    id: 'msg-1',
    disputeId: 'dispute-1',
    senderId: 'plaintiff-1',
    senderRole: SenderRole.PLAINTIFF,
    content: 'Test message',
    attachments: [],
    isPrivate: false,
    createdAt: new Date('2026-02-15'),
    ...overrides,
  }) as DisputeMessage;

describe('DisputesService', () => {
  let service: DisputesService;
  let disputeRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    count: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let messageRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let configService: jest.Mocked<Partial<ConfigService>>;

  beforeEach(async () => {
    disputeRepo = {
      create: jest.fn((data) => ({ id: 'dispute-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    messageRepo = {
      create: jest.fn((data) => ({ id: 'msg-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string, defaultVal?: string) => {
        const map: Record<string, string> = {
          PAYMENT_SERVICE_URL: 'http://localhost:3006',
          NOTIFICATION_SERVICE_URL: 'http://localhost:3005',
        };
        return map[key] ?? defaultVal;
      }),
    };

    // Default: external HTTP calls succeed silently
    mockedAxios.post.mockResolvedValue({ data: {} });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        { provide: getRepositoryToken(Dispute), useValue: disputeRepo },
        { provide: getRepositoryToken(DisputeMessage), useValue: messageRepo },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── openDispute ───────────────────────────────────────────────────────────
  describe('openDispute', () => {
    const dto: OpenDisputeDto = {
      contractId: 'contract-1',
      respondentId: 'defendant-1',
      type: DisputeType.BREACH_OF_CONTRACT,
      description: 'O prestador nao cumpriu o prazo estabelecido no contrato, causando prejuizo significativo ao projeto e ao andamento das obras.',
      disputeValue: 5000,
      evidence: [
        {
          type: 'documento',
          url: 'https://storage.test/doc.pdf',
          description: 'Comprovante de atraso',
        },
      ],
    };

    it('should create a dispute with OPENED status and set deadline', async () => {
      disputeRepo.findOne.mockResolvedValue(null); // no existing dispute
      disputeRepo.save.mockImplementation((d) => Promise.resolve({ ...d, id: 'dispute-1' }));

      const result = await service.openDispute(dto, 'plaintiff-1');

      expect(result.status).toBe(DisputeStatus.OPENED);
      expect(result.contractId).toBe('contract-1');
      expect(result.openedBy).toBe('plaintiff-1');
      expect(result.respondentId).toBe('defendant-1');
      expect(result.deadline).toBeDefined();
      expect(disputeRepo.create).toHaveBeenCalled();
      expect(disputeRepo.save).toHaveBeenCalled();
    });

    it('should create evidence items from DTO', async () => {
      disputeRepo.findOne.mockResolvedValue(null);
      disputeRepo.save.mockImplementation((d) => Promise.resolve(d));

      const result = await service.openDispute(dto, 'plaintiff-1');

      expect(result.evidence).toHaveLength(1);
      expect(result.evidence[0]).toEqual(
        expect.objectContaining({
          type: 'documento',
          url: 'https://storage.test/doc.pdf',
          uploadedBy: 'plaintiff-1',
        }),
      );
    });

    it('should freeze escrow and notify parties', async () => {
      disputeRepo.findOne.mockResolvedValue(null);
      disputeRepo.save.mockImplementation((d) => Promise.resolve({ ...d, id: 'dispute-1' }));

      await service.openDispute(dto, 'plaintiff-1');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3006/api/v1/escrow/freeze',
        expect.objectContaining({
          contractId: 'contract-1',
          disputeId: 'dispute-1',
        }),
      );
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3005/api/v1/notifications/send',
        expect.objectContaining({
          type: 'DISPUTE_OPENED',
          recipients: ['plaintiff-1', 'defendant-1'],
        }),
      );
    });

    it('should create a system message announcing the dispute', async () => {
      disputeRepo.findOne.mockResolvedValue(null);
      disputeRepo.save.mockImplementation((d) => Promise.resolve({ ...d, id: 'dispute-1' }));

      await service.openDispute(dto, 'plaintiff-1');

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          senderId: 'system',
          senderRole: SenderRole.SYSTEM,
          content: expect.stringContaining('Disputa aberta'),
        }),
      );
    });

    it('should throw BadRequestException when duplicate open dispute exists', async () => {
      disputeRepo.findOne.mockResolvedValue(buildDispute()); // existing dispute

      await expect(service.openDispute(dto, 'plaintiff-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle escrow freeze failure gracefully (log warning)', async () => {
      disputeRepo.findOne.mockResolvedValue(null);
      disputeRepo.save.mockImplementation((d) => Promise.resolve({ ...d, id: 'dispute-1' }));
      mockedAxios.post.mockRejectedValueOnce(new Error('Payment service down'));

      // Should NOT throw -- just logs a warning
      const result = await service.openDispute(dto, 'plaintiff-1');

      expect(result).toBeDefined();
    });
  });

  // ─── getDispute ────────────────────────────────────────────────────────────
  describe('getDispute', () => {
    it('should return dispute with messages when found', async () => {
      const dispute = buildDispute({ messages: [buildMessage()] });
      disputeRepo.findOne.mockResolvedValue(dispute);

      const result = await service.getDispute('dispute-1');

      expect(result).toBe(dispute);
      expect(disputeRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dispute-1' },
          relations: ['messages'],
        }),
      );
    });

    it('should throw NotFoundException when dispute does not exist', async () => {
      disputeRepo.findOne.mockResolvedValue(null);

      await expect(service.getDispute('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── addEvidence ───────────────────────────────────────────────────────────
  describe('addEvidence', () => {
    it('should add evidence to an open dispute', async () => {
      const dispute = buildDispute();
      disputeRepo.findOne.mockResolvedValue(dispute);
      disputeRepo.save.mockImplementation((d) => Promise.resolve(d));

      const evidence = {
        type: 'imagem',
        url: 'https://storage.test/img.jpg',
        description: 'Screenshot of breach',
      };

      const result = await service.addEvidence('dispute-1', evidence, 'plaintiff-1');

      expect(result.evidence).toHaveLength(1);
      expect(result.evidence[0]).toEqual(
        expect.objectContaining({
          type: 'imagem',
          url: 'https://storage.test/img.jpg',
          uploadedBy: 'plaintiff-1',
        }),
      );
    });

    it('should throw BadRequestException when dispute is RESOLVED', async () => {
      const dispute = buildDispute({ status: DisputeStatus.RESOLVED });
      disputeRepo.findOne.mockResolvedValue(dispute);

      await expect(
        service.addEvidence('dispute-1', { type: 't', url: 'u', description: 'd' }, 'plaintiff-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when dispute is CLOSED', async () => {
      const dispute = buildDispute({ status: DisputeStatus.CLOSED });
      disputeRepo.findOne.mockResolvedValue(dispute);

      await expect(
        service.addEvidence('dispute-1', { type: 't', url: 'u', description: 'd' }, 'plaintiff-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not a participant', async () => {
      const dispute = buildDispute();
      disputeRepo.findOne.mockResolvedValue(dispute);

      await expect(
        service.addEvidence('dispute-1', { type: 't', url: 'u', description: 'd' }, 'stranger'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create a system message logging the new evidence', async () => {
      const dispute = buildDispute();
      disputeRepo.findOne.mockResolvedValue(dispute);
      disputeRepo.save.mockImplementation((d) => Promise.resolve(d));

      await service.addEvidence(
        'dispute-1',
        { type: 'video', url: 'u', description: 'Screen recording' },
        'plaintiff-1',
      );

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Nova evidencia'),
          senderRole: SenderRole.SYSTEM,
        }),
      );
    });
  });

  // ─── sendMessage ───────────────────────────────────────────────────────────
  describe('sendMessage', () => {
    it('should send a message as plaintiff', async () => {
      const dispute = buildDispute();
      disputeRepo.findOne.mockResolvedValue(dispute);

      const result = await service.sendMessage(
        'dispute-1',
        'plaintiff-1',
        'I have new evidence',
      );

      expect(result.senderId).toBe('plaintiff-1');
      expect(result.senderRole).toBe(SenderRole.PLAINTIFF);
      expect(result.content).toBe('I have new evidence');
      expect(result.isPrivate).toBe(false);
    });

    it('should send a message as defendant', async () => {
      const dispute = buildDispute();
      disputeRepo.findOne.mockResolvedValue(dispute);

      const result = await service.sendMessage(
        'dispute-1',
        'defendant-1',
        'I disagree',
      );

      expect(result.senderRole).toBe(SenderRole.DEFENDANT);
    });

    it('should send a message as arbitrator', async () => {
      const dispute = buildDispute();
      disputeRepo.findOne.mockResolvedValue(dispute);

      const result = await service.sendMessage(
        'dispute-1',
        'arbitrator-1',
        'Decision pending',
      );

      expect(result.senderRole).toBe(SenderRole.ARBITRATOR);
    });

    it('should allow private messages from arbitrator', async () => {
      const dispute = buildDispute();
      disputeRepo.findOne.mockResolvedValue(dispute);

      const result = await service.sendMessage(
        'dispute-1',
        'arbitrator-1',
        'Private note',
        true,
      );

      expect(result.isPrivate).toBe(true);
    });

    it('should allow private messages from mediator', async () => {
      const dispute = buildDispute();
      disputeRepo.findOne.mockResolvedValue(dispute);

      const result = await service.sendMessage(
        'dispute-1',
        'mediator-1',
        'Confidential',
        true,
      );

      expect(result.senderRole).toBe(SenderRole.MEDIATOR);
      expect(result.isPrivate).toBe(true);
    });

    it('should throw ForbiddenException when plaintiff tries to send private message', async () => {
      const dispute = buildDispute();
      disputeRepo.findOne.mockResolvedValue(dispute);

      await expect(
        service.sendMessage('dispute-1', 'plaintiff-1', 'private', true),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when dispute is RESOLVED', async () => {
      const dispute = buildDispute({ status: DisputeStatus.RESOLVED });
      disputeRepo.findOne.mockResolvedValue(dispute);

      await expect(
        service.sendMessage('dispute-1', 'plaintiff-1', 'test'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when dispute is CLOSED', async () => {
      const dispute = buildDispute({ status: DisputeStatus.CLOSED });
      disputeRepo.findOne.mockResolvedValue(dispute);

      await expect(
        service.sendMessage('dispute-1', 'plaintiff-1', 'test'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when sender is not a participant', async () => {
      const dispute = buildDispute();
      disputeRepo.findOne.mockResolvedValue(dispute);

      await expect(
        service.sendMessage('dispute-1', 'stranger', 'test'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── escalateDispute ──────────────────────────────────────────────────────
  describe('escalateDispute', () => {
    it('should escalate an OPENED dispute to ESCALATED status', async () => {
      const dispute = buildDispute({ status: DisputeStatus.OPENED });
      disputeRepo.findOne.mockResolvedValue(dispute);
      disputeRepo.save.mockImplementation((d) => Promise.resolve(d));

      const result = await service.escalateDispute('dispute-1', 'Mediation failed');

      expect(result.status).toBe(DisputeStatus.ESCALATED);
    });

    it('should escalate from UNDER_MEDIATION to ESCALATED', async () => {
      const dispute = buildDispute({ status: DisputeStatus.UNDER_MEDIATION });
      disputeRepo.findOne.mockResolvedValue(dispute);
      disputeRepo.save.mockImplementation((d) => Promise.resolve(d));

      const result = await service.escalateDispute('dispute-1', 'Mediation failed');

      expect(result.status).toBe(DisputeStatus.ESCALATED);
    });

    it('should escalate from AI_REVIEW and mention human arbitration context', async () => {
      const dispute = buildDispute({ status: DisputeStatus.AI_REVIEW });
      disputeRepo.findOne.mockResolvedValue(dispute);
      disputeRepo.save.mockImplementation((d) => Promise.resolve(d));

      await service.escalateDispute('dispute-1', 'AI could not resolve');

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('arbitragem humana'),
        }),
      );
    });

    it('should throw BadRequestException when dispute is RESOLVED', async () => {
      const dispute = buildDispute({ status: DisputeStatus.RESOLVED });
      disputeRepo.findOne.mockResolvedValue(dispute);

      await expect(
        service.escalateDispute('dispute-1', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when dispute is CLOSED', async () => {
      const dispute = buildDispute({ status: DisputeStatus.CLOSED });
      disputeRepo.findOne.mockResolvedValue(dispute);

      await expect(
        service.escalateDispute('dispute-1', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should notify parties about escalation', async () => {
      const dispute = buildDispute({ status: DisputeStatus.OPENED });
      disputeRepo.findOne.mockResolvedValue(dispute);
      disputeRepo.save.mockImplementation((d) => Promise.resolve(d));

      await service.escalateDispute('dispute-1', 'reason');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3005/api/v1/notifications/send',
        expect.objectContaining({
          type: 'DISPUTE_ESCALATED',
        }),
      );
    });
  });

  // ─── closeDispute ──────────────────────────────────────────────────────────
  describe('closeDispute', () => {
    it('should close dispute when decided by assigned arbitrator', async () => {
      const dispute = buildDispute({ status: DisputeStatus.UNDER_ARBITRATION });
      disputeRepo.findOne.mockResolvedValue(dispute);
      disputeRepo.save.mockImplementation((d) => Promise.resolve(d));

      const result = await service.closeDispute(
        'dispute-1',
        'Plaintiff awarded R$ 3000',
        'arbitrator-1',
      );

      expect(result.status).toBe(DisputeStatus.RESOLVED);
      expect(result.resolution).toBe('Plaintiff awarded R$ 3000');
      expect(result.resolvedAt).toBeDefined();
    });

    it('should create a system message with the resolution', async () => {
      const dispute = buildDispute({ status: DisputeStatus.UNDER_ARBITRATION });
      disputeRepo.findOne.mockResolvedValue(dispute);
      disputeRepo.save.mockImplementation((d) => Promise.resolve(d));

      await service.closeDispute('dispute-1', 'Final decision', 'arbitrator-1');

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Final decision'),
          senderRole: SenderRole.SYSTEM,
        }),
      );
    });

    it('should notify parties and release escrow', async () => {
      const dispute = buildDispute({ status: DisputeStatus.UNDER_ARBITRATION });
      disputeRepo.findOne.mockResolvedValue(dispute);
      disputeRepo.save.mockImplementation((d) => Promise.resolve(d));

      await service.closeDispute('dispute-1', 'Decision', 'arbitrator-1');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3005/api/v1/notifications/send',
        expect.objectContaining({ type: 'DISPUTE_RESOLVED' }),
      );
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3006/api/v1/escrow/release',
        expect.objectContaining({
          contractId: 'contract-1',
          disputeId: 'dispute-1',
        }),
      );
    });

    it('should throw ForbiddenException when non-arbitrator tries to close', async () => {
      const dispute = buildDispute({ status: DisputeStatus.UNDER_ARBITRATION });
      disputeRepo.findOne.mockResolvedValue(dispute);

      await expect(
        service.closeDispute('dispute-1', 'Decision', 'plaintiff-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when dispute is already RESOLVED', async () => {
      const dispute = buildDispute({ status: DisputeStatus.RESOLVED });
      disputeRepo.findOne.mockResolvedValue(dispute);

      await expect(
        service.closeDispute('dispute-1', 'Decision', 'arbitrator-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── acceptResolution ──────────────────────────────────────────────────────
  describe('acceptResolution', () => {
    it('should mark plaintiff acceptance', async () => {
      const dispute = buildDispute({
        status: DisputeStatus.AWAITING_ACCEPTANCE,
        resolution: 'Both parties pay 50%',
      });
      disputeRepo.findOne.mockResolvedValue(dispute);
      disputeRepo.save.mockImplementation((d) => Promise.resolve(d));

      const result = await service.acceptResolution('dispute-1', 'plaintiff-1');

      expect(result.resolutionAcceptedByPlaintiff).toBe(true);
      expect(result.resolutionAcceptedByDefendant).toBe(false);
    });

    it('should mark defendant acceptance', async () => {
      const dispute = buildDispute({
        status: DisputeStatus.AWAITING_ACCEPTANCE,
        resolution: 'Both parties pay 50%',
      });
      disputeRepo.findOne.mockResolvedValue(dispute);
      disputeRepo.save.mockImplementation((d) => Promise.resolve(d));

      const result = await service.acceptResolution('dispute-1', 'defendant-1');

      expect(result.resolutionAcceptedByDefendant).toBe(true);
    });

    it('should resolve dispute when both parties accept', async () => {
      const dispute = buildDispute({
        status: DisputeStatus.AWAITING_ACCEPTANCE,
        resolution: 'Agreement reached',
        resolutionAcceptedByPlaintiff: true,
        resolutionAcceptedByDefendant: false,
      });
      disputeRepo.findOne.mockResolvedValue(dispute);
      disputeRepo.save.mockImplementation((d) => Promise.resolve(d));

      const result = await service.acceptResolution('dispute-1', 'defendant-1');

      expect(result.status).toBe(DisputeStatus.RESOLVED);
      expect(result.resolvedAt).toBeDefined();
    });

    it('should throw BadRequestException when no resolution exists', async () => {
      const dispute = buildDispute({ resolution: null });
      disputeRepo.findOne.mockResolvedValue(dispute);

      await expect(
        service.acceptResolution('dispute-1', 'plaintiff-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when plaintiff already accepted', async () => {
      const dispute = buildDispute({
        resolution: 'Test',
        resolutionAcceptedByPlaintiff: true,
      });
      disputeRepo.findOne.mockResolvedValue(dispute);

      await expect(
        service.acceptResolution('dispute-1', 'plaintiff-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when non-party tries to accept', async () => {
      const dispute = buildDispute({ resolution: 'Test' });
      disputeRepo.findOne.mockResolvedValue(dispute);

      await expect(
        service.acceptResolution('dispute-1', 'stranger'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getMessages ───────────────────────────────────────────────────────────
  describe('getMessages', () => {
    it('should return all messages for arbitrator (including private)', async () => {
      const dispute = buildDispute();
      disputeRepo.findOne.mockResolvedValue(dispute);

      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([buildMessage(), buildMessage({ isPrivate: true })]),
      };
      messageRepo.createQueryBuilder.mockReturnValue(qb);

      const messages = await service.getMessages('dispute-1', 'arbitrator-1');

      expect(messages).toHaveLength(2);
      // Should NOT filter private for arbitrator
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('should filter private messages for non-arbitrator users', async () => {
      const dispute = buildDispute();
      disputeRepo.findOne.mockResolvedValue(dispute);

      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([buildMessage()]),
      };
      messageRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getMessages('dispute-1', 'plaintiff-1');

      expect(qb.andWhere).toHaveBeenCalledWith('message.isPrivate = false');
    });
  });

  // ─── getDisputeStats ──────────────────────────────────────────────────────
  describe('getDisputeStats', () => {
    it('should return correct statistics', async () => {
      disputeRepo.count.mockResolvedValueOnce(100); // total
      disputeRepo.count.mockResolvedValueOnce(40);  // open
      disputeRepo.count.mockResolvedValueOnce(55);  // resolved

      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avgDays: '7.5' }),
      };
      disputeRepo.createQueryBuilder.mockReturnValue(qb);

      const stats = await service.getDisputeStats();

      expect(stats.total).toBe(100);
      expect(stats.open).toBe(40);
      expect(stats.resolved).toBe(55);
      expect(stats.averageResolutionDays).toBe(7.5);
    });

    it('should return 0 average days when no resolved disputes exist', async () => {
      disputeRepo.count.mockResolvedValue(0);

      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avgDays: null }),
      };
      disputeRepo.createQueryBuilder.mockReturnValue(qb);

      const stats = await service.getDisputeStats();

      expect(stats.averageResolutionDays).toBe(0);
    });
  });
});
