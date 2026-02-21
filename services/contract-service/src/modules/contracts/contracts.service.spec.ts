import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import {
  Contract,
  ContractStatus,
  ContractType,
} from './entities/contract.entity';
import { Signature, SignatureType } from './entities/signature.entity';
import { ContractEvent, ContractEventType } from './entities/contract-event.entity';

// ─── Helper factories ─────────────────────────────────────────────────────────
const buildContract = (overrides: Partial<Contract> = {}): Contract =>
  ({
    id: 'contract-1',
    contractNumber: 'TAB-20260101-ABCD1234',
    title: 'Test Contract',
    type: ContractType.SERVICE,
    status: ContractStatus.DRAFT,
    content: 'Contract content text',
    rawPrompt: null,
    parties: [
      {
        userId: 'user-1',
        name: 'Alice',
        document: '12345678901',
        email: 'alice@test.com',
        role: 'contractor',
        signed: false,
      },
      {
        userId: 'user-2',
        name: 'Bob',
        document: '98765432100',
        email: 'bob@test.com',
        role: 'client',
        signed: false,
      },
    ],
    clauses: [],
    metadata: {},
    blockchainHash: null,
    blockchainTxId: null,
    escrowId: null,
    totalValue: '5000.00',
    currency: 'BRL',
    renewalDate: null,
    expiresAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    signatures: [],
    events: [],
    ...overrides,
  }) as Contract;

const buildEvent = (overrides: Partial<ContractEvent> = {}): ContractEvent =>
  ({
    id: 'event-1',
    contractId: 'contract-1',
    eventType: ContractEventType.CREATED,
    description: 'Contract created',
    metadata: {},
    performedBy: 'user-1',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }) as ContractEvent;

describe('ContractsService', () => {
  let service: ContractsService;
  let contractRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let signatureRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let eventRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(async () => {
    contractRepo = {
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) => Promise.resolve({ id: 'contract-1', ...entity })),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    signatureRepo = {
      create: jest.fn((data) => ({ id: 'sig-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    eventRepo = {
      create: jest.fn((data) => ({ id: 'event-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: getRepositoryToken(Contract), useValue: contractRepo },
        { provide: getRepositoryToken(Signature), useValue: signatureRepo },
        { provide: getRepositoryToken(ContractEvent), useValue: eventRepo },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
  });

  // ─── create ─────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('should create a contract with DRAFT status and generated contract number', async () => {
      const dto = {
        title: 'Service Agreement',
        type: ContractType.SERVICE,
        parties: [
          { userId: 'user-1', name: 'Alice', document: '123', email: 'alice@t.com', role: 'contractor' },
          { userId: 'user-2', name: 'Bob', document: '456', email: 'bob@t.com', role: 'client' },
        ],
        content: 'Full text',
        totalValue: 10000,
        currency: 'BRL',
      };

      contractRepo.save.mockResolvedValue({
        id: 'contract-1',
        contractNumber: 'TAB-20260101-ABCD1234',
        title: dto.title,
        status: ContractStatus.DRAFT,
        ...dto,
      });

      const result = await service.create(dto as any, 'user-1');

      expect(contractRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Service Agreement',
          status: ContractStatus.DRAFT,
          createdBy: 'user-1',
        }),
      );
      expect(contractRepo.save).toHaveBeenCalled();
      expect(eventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ContractEventType.CREATED,
        }),
      );
      expect(result).toBeDefined();
    });

    it('should map parties correctly setting signed to false', async () => {
      const dto = {
        title: 'NDA',
        type: ContractType.NDA,
        parties: [
          { userId: 'user-1', role: 'discloser' },
          { userId: 'user-2', role: 'recipient' },
        ],
      };

      contractRepo.save.mockResolvedValue({ id: 'c-1', ...dto });

      await service.create(dto as any, 'user-1');

      const createCall = contractRepo.create.mock.calls[0][0];
      expect(createCall.parties).toEqual([
        expect.objectContaining({ userId: 'user-1', signed: false }),
        expect.objectContaining({ userId: 'user-2', signed: false }),
      ]);
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('should return paginated results', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[buildContract()], 1]),
      };
      contractRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll('user-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should apply status filter when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      contractRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('user-1', { status: ContractStatus.ACTIVE } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'contract.status = :status',
        { status: ContractStatus.ACTIVE },
      );
    });

    it('should apply search filter when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      contractRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('user-1', { search: 'rental' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%rental%' },
      );
    });

    it('should use default page=1 and limit=20 when not provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      contractRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll('user-1', {});

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // ─── findOne ────────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('should return contract with relations when found', async () => {
      const contract = buildContract();
      contractRepo.findOne.mockResolvedValue(contract);

      const result = await service.findOne('contract-1');

      expect(result).toBe(contract);
      expect(contractRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contract-1' },
          relations: ['signatures', 'events'],
        }),
      );
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      contractRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── sign ───────────────────────────────────────────────────────────────────
  describe('sign', () => {
    it('should sign a DRAFT contract and move status to PENDING_SIGNATURES', async () => {
      const contract = buildContract({ status: ContractStatus.DRAFT });
      contractRepo.findOne.mockResolvedValue(contract);
      signatureRepo.findOne.mockResolvedValue(null);
      contractRepo.save.mockImplementation((c) => Promise.resolve(c));

      const result = await service.sign('contract-1', 'user-1', {
        signatureType: SignatureType.SIMPLE,
      } as any);

      expect(result.parties[0].signed).toBe(true);
      expect(result.status).toBe(ContractStatus.PENDING_SIGNATURES);
      expect(signatureRepo.create).toHaveBeenCalled();
      expect(signatureRepo.save).toHaveBeenCalled();
    });

    it('should activate contract when all parties have signed', async () => {
      const contract = buildContract({
        status: ContractStatus.PENDING_SIGNATURES,
        parties: [
          { userId: 'user-1', name: 'Alice', document: '123', email: 'a@t.com', role: 'c', signed: true, signedAt: '2026-01-01' },
          { userId: 'user-2', name: 'Bob', document: '456', email: 'b@t.com', role: 'cl', signed: false },
        ],
      });
      contractRepo.findOne.mockResolvedValue(contract);
      signatureRepo.findOne.mockResolvedValue(null);
      contractRepo.save.mockImplementation((c) => Promise.resolve(c));

      const result = await service.sign('contract-1', 'user-2', {
        signatureType: SignatureType.SIMPLE,
      } as any);

      expect(result.status).toBe(ContractStatus.ACTIVE);
      expect(result.parties.every((p: any) => p.signed)).toBe(true);
    });

    it('should throw ConflictException when user already signed', async () => {
      const contract = buildContract({
        parties: [
          { userId: 'user-1', name: 'Alice', document: '123', email: 'a@t.com', role: 'c', signed: true },
        ],
      });
      contractRepo.findOne.mockResolvedValue(contract);

      await expect(
        service.sign('contract-1', 'user-1', { signatureType: SignatureType.SIMPLE } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when user is not a party to the contract', async () => {
      const contract = buildContract();
      contractRepo.findOne.mockResolvedValue(contract);

      await expect(
        service.sign('contract-1', 'user-unknown', { signatureType: SignatureType.SIMPLE } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when contract status is ACTIVE', async () => {
      const contract = buildContract({ status: ContractStatus.ACTIVE });
      contractRepo.findOne.mockResolvedValue(contract);

      await expect(
        service.sign('contract-1', 'user-1', { signatureType: SignatureType.SIMPLE } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when signature already exists in DB', async () => {
      const contract = buildContract();
      contractRepo.findOne.mockResolvedValue(contract);
      signatureRepo.findOne.mockResolvedValue({ id: 'existing-sig' }); // already in DB

      await expect(
        service.sign('contract-1', 'user-1', { signatureType: SignatureType.SIMPLE } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should set govbrValidated to true for GOVBR signature type with token', async () => {
      const contract = buildContract();
      contractRepo.findOne.mockResolvedValue(contract);
      signatureRepo.findOne.mockResolvedValue(null);
      contractRepo.save.mockImplementation((c) => Promise.resolve(c));

      await service.sign('contract-1', 'user-1', {
        signatureType: SignatureType.GOVBR,
        govbrToken: 'valid-govbr-token',
      } as any);

      expect(signatureRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ govbrValidated: true }),
      );
    });
  });

  // ─── cancel ─────────────────────────────────────────────────────────────────
  describe('cancel', () => {
    it('should cancel a DRAFT contract and set status to CANCELLED', async () => {
      const contract = buildContract({ status: ContractStatus.DRAFT });
      contractRepo.findOne.mockResolvedValue(contract);
      contractRepo.save.mockImplementation((c) => Promise.resolve(c));

      const result = await service.cancel('contract-1', 'user-1', 'No longer needed');

      expect(result.status).toBe(ContractStatus.CANCELLED);
    });

    it('should terminate an ACTIVE contract and set status to TERMINATED', async () => {
      const contract = buildContract({ status: ContractStatus.ACTIVE });
      contractRepo.findOne.mockResolvedValue(contract);
      contractRepo.save.mockImplementation((c) => Promise.resolve(c));

      const result = await service.cancel('contract-1', 'user-1', 'Breach');

      expect(result.status).toBe(ContractStatus.TERMINATED);
    });

    it('should throw BadRequestException when trying to cancel an already CANCELLED contract', async () => {
      const contract = buildContract({ status: ContractStatus.CANCELLED });
      contractRepo.findOne.mockResolvedValue(contract);

      await expect(
        service.cancel('contract-1', 'user-1', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to cancel a TERMINATED contract', async () => {
      const contract = buildContract({ status: ContractStatus.TERMINATED });
      contractRepo.findOne.mockResolvedValue(contract);

      await expect(
        service.cancel('contract-1', 'user-1', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user is neither a party nor the creator', async () => {
      const contract = buildContract();
      contractRepo.findOne.mockResolvedValue(contract);

      await expect(
        service.cancel('contract-1', 'stranger', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should add a CANCELLED event with reason', async () => {
      const contract = buildContract({ status: ContractStatus.DRAFT });
      contractRepo.findOne.mockResolvedValue(contract);
      contractRepo.save.mockImplementation((c) => Promise.resolve(c));

      await service.cancel('contract-1', 'user-1', 'Customer request');

      expect(eventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ContractEventType.CANCELLED,
          metadata: { reason: 'Customer request' },
        }),
      );
    });
  });

  // ─── getTimeline ────────────────────────────────────────────────────────────
  describe('getTimeline', () => {
    it('should return events in ascending order when contract exists', async () => {
      contractRepo.findOne.mockResolvedValue(buildContract());
      const events = [buildEvent(), buildEvent({ id: 'event-2', eventType: ContractEventType.SIGNED })];
      eventRepo.find.mockResolvedValue(events);

      const result = await service.getTimeline('contract-1');

      expect(result).toHaveLength(2);
      expect(eventRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contractId: 'contract-1' },
          order: { createdAt: 'ASC' },
        }),
      );
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      contractRepo.findOne.mockResolvedValue(null);

      await expect(service.getTimeline('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── generatePdf ────────────────────────────────────────────────────────────
  describe('generatePdf', () => {
    it('should generate a PDF buffer for a valid contract', async () => {
      const contract = buildContract({
        content: 'Full contract text here',
        parties: [
          {
            userId: 'user-1',
            name: 'Alice',
            document: '12345678901',
            email: 'alice@test.com',
            role: 'contractor',
            signed: true,
            signedAt: '2026-01-15',
          },
        ],
        clauses: [
          { number: 1, title: 'Object', content: 'Description of services', isOptional: false },
        ],
      });

      contractRepo.findOne.mockResolvedValue(contract);
      signatureRepo.find.mockResolvedValue([
        {
          id: 'sig-1',
          userId: 'user-1',
          signatureHash: 'abc123',
          signatureType: SignatureType.SIMPLE,
          signedAt: new Date('2026-01-15'),
          govbrValidated: false,
          certificateId: null,
        },
      ]);

      const pdfBuffer = await service.generatePdf('contract-1');

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should throw NotFoundException when contract does not exist for PDF generation', async () => {
      contractRepo.findOne.mockResolvedValue(null);

      await expect(service.generatePdf('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('should update a DRAFT contract', async () => {
      const contract = buildContract();
      contractRepo.findOne.mockResolvedValue(contract);
      contractRepo.save.mockImplementation((c) => Promise.resolve(c));

      const result = await service.update('contract-1', { title: 'Updated Title' }, 'user-1');

      expect(result.title).toBe('Updated Title');
    });

    it('should throw BadRequestException when trying to update a non-DRAFT contract', async () => {
      const contract = buildContract({ status: ContractStatus.ACTIVE });
      contractRepo.findOne.mockResolvedValue(contract);

      await expect(
        service.update('contract-1', { title: 'Nope' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when a non-creator tries to update', async () => {
      const contract = buildContract({ createdBy: 'user-1' });
      contractRepo.findOne.mockResolvedValue(contract);

      await expect(
        service.update('contract-1', { title: 'Nope' }, 'user-2'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
