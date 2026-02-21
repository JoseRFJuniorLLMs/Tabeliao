import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  HttpException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EscrowPaymentService } from './escrow-payment.service';
import { EscrowAccount, EscrowStatus } from './entities/escrow-account.entity';
import { PixService } from '../pix/pix.service';
import { PaymentMethod } from '../pix/types';

// ─── Helper: build a fake EscrowAccount ──────────────────────────────────────
const buildEscrow = (overrides: Partial<EscrowAccount> = {}): EscrowAccount =>
  ({
    id: 'escrow-1',
    contractId: 'contract-1',
    depositorId: 'depositor-1',
    beneficiaryId: 'beneficiary-1',
    totalAmount: '10000.00',
    depositedAmount: '0.00',
    releasedAmount: '0.00',
    frozenAmount: '0.00',
    platformFee: '150.00',
    status: EscrowStatus.PENDING,
    currency: 'BRL',
    pspAccountId: null,
    depositDeadline: null,
    milestones: [],
    disputeId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }) as EscrowAccount;

describe('EscrowPaymentService', () => {
  let service: EscrowPaymentService;
  let escrowRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };
  let pixService: {
    generatePixCharge: jest.Mock;
    generateBoleto: jest.Mock;
  };
  let configService: jest.Mocked<Partial<ConfigService>>;

  beforeEach(async () => {
    escrowRepo = {
      create: jest.fn((data) => ({ id: 'escrow-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
    };

    pixService = {
      generatePixCharge: jest.fn().mockResolvedValue({
        pixCode: 'PIX123',
        qrCodeBase64: 'base64data',
        txid: 'txid-1',
        createdAt: new Date(),
        expiresAt: new Date(),
        amount: 10000,
        description: 'test',
      }),
      generateBoleto: jest.fn().mockResolvedValue({
        boletoId: 'bol-1',
        boletoCode: '12345',
        barcode: 'barcode',
        boletoUrl: 'https://boleto.url',
        amount: 10000,
        dueDate: new Date(),
        payerName: 'Test',
        payerDocument: '123',
        description: 'test',
      }),
    };

    configService = {
      get: jest.fn().mockReturnValue({
        fees: {
          escrowFeePercent: 1.5,
          pixFeePercent: 0.5,
          boletoFeeFixed: 3.50,
        },
        pix: { key: 'test-pix-key' },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowPaymentService,
        { provide: getRepositoryToken(EscrowAccount), useValue: escrowRepo },
        { provide: PixService, useValue: pixService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<EscrowPaymentService>(EscrowPaymentService);
  });

  // ─── createEscrow ──────────────────────────────────────────────────────────
  describe('createEscrow', () => {
    it('should create an escrow with PENDING status and calculated fee', async () => {
      escrowRepo.save.mockImplementation((e) => Promise.resolve({ ...e, id: 'escrow-1' }));

      const result = await service.createEscrow(
        'contract-1',
        10000,
        'depositor-1',
        'beneficiary-1',
      );

      expect(escrowRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: 'contract-1',
          depositorId: 'depositor-1',
          beneficiaryId: 'beneficiary-1',
          totalAmount: '10000.00',
          depositedAmount: '0.00',
          releasedAmount: '0.00',
          frozenAmount: '0.00',
          status: EscrowStatus.PENDING,
          currency: 'BRL',
        }),
      );
      expect(result).toBeDefined();
    });

    it('should throw when amount is zero or negative', async () => {
      await expect(
        service.createEscrow('c-1', 0, 'd-1', 'b-1'),
      ).rejects.toThrow(HttpException);

      await expect(
        service.createEscrow('c-1', -500, 'd-1', 'b-1'),
      ).rejects.toThrow(HttpException);
    });

    it('should validate that milestones sum equals total amount', async () => {
      await expect(
        service.createEscrow('c-1', 10000, 'd-1', 'b-1', undefined, [
          { label: 'Phase 1', amount: 3000 },
          { label: 'Phase 2', amount: 5000 },
          // Missing Phase 3 => sum is 8000, not 10000
        ]),
      ).rejects.toThrow(HttpException);
    });

    it('should accept milestones when their sum equals the total amount', async () => {
      escrowRepo.save.mockImplementation((e) => Promise.resolve({ ...e, id: 'escrow-1' }));

      const result = await service.createEscrow(
        'c-1',
        10000,
        'd-1',
        'b-1',
        undefined,
        [
          { label: 'Phase 1', amount: 4000 },
          { label: 'Phase 2', amount: 6000 },
        ],
      );

      const createCall = escrowRepo.create.mock.calls[0][0];
      expect(createCall.milestones).toHaveLength(2);
      expect(createCall.milestones[0].label).toBe('Phase 1');
      expect(createCall.milestones[0].released).toBe(false);
    });

    it('should store deposit deadline when provided', async () => {
      const deadline = new Date('2026-06-01');
      escrowRepo.save.mockImplementation((e) => Promise.resolve(e));

      await service.createEscrow('c-1', 5000, 'd-1', 'b-1', deadline);

      expect(escrowRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ depositDeadline: deadline }),
      );
    });
  });

  // ─── depositToEscrow ───────────────────────────────────────────────────────
  describe('depositToEscrow', () => {
    it('should generate a PIX charge for deposit', async () => {
      const escrow = buildEscrow({ status: EscrowStatus.PENDING });
      escrowRepo.findOne.mockResolvedValue(escrow);

      const result = await service.depositToEscrow(
        'escrow-1',
        PaymentMethod.PIX,
        { cpf: '12345678901' },
      );

      expect(result.paymentMethod).toBe(PaymentMethod.PIX);
      expect(result.status).toBe('PENDING');
      expect(result.pix).toBeDefined();
      expect(pixService.generatePixCharge).toHaveBeenCalledWith(
        10000,
        '12345678901',
        expect.stringContaining('Deposito Escrow'),
      );
    });

    it('should generate a boleto for deposit', async () => {
      const escrow = buildEscrow({ status: EscrowStatus.PENDING });
      escrowRepo.findOne.mockResolvedValue(escrow);

      const result = await service.depositToEscrow(
        'escrow-1',
        PaymentMethod.BOLETO,
        { cpf: '12345678901', name: 'John' },
      );

      expect(result.paymentMethod).toBe(PaymentMethod.BOLETO);
      expect(result.boleto).toBeDefined();
    });

    it('should throw ConflictException when escrow is already fully funded', async () => {
      const escrow = buildEscrow({
        status: EscrowStatus.FUNDED,
        depositedAmount: '10000.00',
      });
      escrowRepo.findOne.mockResolvedValue(escrow);

      await expect(
        service.depositToEscrow('escrow-1', PaymentMethod.PIX, {}),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when escrow is RELEASED', async () => {
      const escrow = buildEscrow({ status: EscrowStatus.RELEASED });
      escrowRepo.findOne.mockResolvedValue(escrow);

      await expect(
        service.depositToEscrow('escrow-1', PaymentMethod.PIX, {}),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when escrow is FROZEN', async () => {
      const escrow = buildEscrow({ status: EscrowStatus.FROZEN });
      escrowRepo.findOne.mockResolvedValue(escrow);

      await expect(
        service.depositToEscrow('escrow-1', PaymentMethod.PIX, {}),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw HttpException for unsupported payment method', async () => {
      const escrow = buildEscrow({ status: EscrowStatus.PENDING });
      escrowRepo.findOne.mockResolvedValue(escrow);

      await expect(
        service.depositToEscrow('escrow-1', PaymentMethod.TRANSFER, {}),
      ).rejects.toThrow(HttpException);
    });

    it('should throw NotFoundException when escrow does not exist', async () => {
      escrowRepo.findOne.mockResolvedValue(null);

      await expect(
        service.depositToEscrow('non-existent', PaymentMethod.PIX, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── releaseEscrow ─────────────────────────────────────────────────────────
  describe('releaseEscrow', () => {
    it('should release escrow when both depositor and beneficiary approve', async () => {
      const escrow = buildEscrow({
        status: EscrowStatus.FUNDED,
        depositedAmount: '10000.00',
        platformFee: '150.00',
      });
      escrowRepo.findOne.mockResolvedValue(escrow);
      escrowRepo.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.releaseEscrow('escrow-1', ['depositor-1', 'beneficiary-1']);

      expect(result.amountReleased).toBeCloseTo(9850, 0); // 10000 - 150 fee
      expect(result.remainingBalance).toBe(0);
      expect(result.beneficiaryId).toBe('beneficiary-1');
      expect(result.transferTxId).toMatch(/^TRF-/);
    });

    it('should release escrow when an arbiter approves', async () => {
      const escrow = buildEscrow({
        status: EscrowStatus.FUNDED,
        depositedAmount: '10000.00',
        platformFee: '150.00',
      });
      escrowRepo.findOne.mockResolvedValue(escrow);
      escrowRepo.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.releaseEscrow('escrow-1', ['arbiter-1']);

      expect(result.amountReleased).toBeCloseTo(9850, 0);
    });

    it('should throw FORBIDDEN when neither both parties nor arbiter approves', async () => {
      const escrow = buildEscrow({
        status: EscrowStatus.FUNDED,
        depositedAmount: '10000.00',
      });
      escrowRepo.findOne.mockResolvedValue(escrow);

      await expect(
        service.releaseEscrow('escrow-1', ['depositor-1']), // only depositor
      ).rejects.toThrow(HttpException);
    });

    it('should throw ConflictException when escrow is not funded (PENDING)', async () => {
      const escrow = buildEscrow({ status: EscrowStatus.PENDING });
      escrowRepo.findOne.mockResolvedValue(escrow);

      await expect(
        service.releaseEscrow('escrow-1', ['depositor-1', 'beneficiary-1']),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when escrow is already released', async () => {
      const escrow = buildEscrow({ status: EscrowStatus.RELEASED });
      escrowRepo.findOne.mockResolvedValue(escrow);

      await expect(
        service.releaseEscrow('escrow-1', ['depositor-1', 'beneficiary-1']),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when escrow is frozen', async () => {
      const escrow = buildEscrow({ status: EscrowStatus.FROZEN });
      escrowRepo.findOne.mockResolvedValue(escrow);

      await expect(
        service.releaseEscrow('escrow-1', ['depositor-1', 'beneficiary-1']),
      ).rejects.toThrow(ConflictException);
    });

    it('should mark all milestones as released on full release', async () => {
      const escrow = buildEscrow({
        status: EscrowStatus.FUNDED,
        depositedAmount: '10000.00',
        milestones: [
          { id: 'm1', label: 'Phase 1', amount: 5000, released: false },
          { id: 'm2', label: 'Phase 2', amount: 5000, released: false },
        ],
      });
      escrowRepo.findOne.mockResolvedValue(escrow);
      escrowRepo.save.mockImplementation((e) => Promise.resolve(e));

      await service.releaseEscrow('escrow-1', ['depositor-1', 'beneficiary-1']);

      const savedEscrow = escrowRepo.save.mock.calls[0][0];
      expect(savedEscrow.milestones[0].released).toBe(true);
      expect(savedEscrow.milestones[1].released).toBe(true);
    });
  });

  // ─── releasePartialEscrow ──────────────────────────────────────────────────
  describe('releasePartialEscrow', () => {
    it('should release a partial amount for a milestone', async () => {
      const escrow = buildEscrow({
        status: EscrowStatus.FUNDED,
        depositedAmount: '10000.00',
        platformFee: '150.00',
        milestones: [
          { id: 'm1', label: 'Phase 1', amount: 4000, released: false },
          { id: 'm2', label: 'Phase 2', amount: 6000, released: false },
        ],
      });
      escrowRepo.findOne.mockResolvedValue(escrow);
      escrowRepo.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.releasePartialEscrow('escrow-1', 4000, 'Phase 1');

      expect(result.amountReleased).toBe(4000);
      expect(result.remainingBalance).toBeGreaterThan(0);
      expect(result.milestone).toBe('Phase 1');
    });

    it('should set status to PARTIALLY_RELEASED when not fully released', async () => {
      const escrow = buildEscrow({
        status: EscrowStatus.FUNDED,
        depositedAmount: '10000.00',
        platformFee: '150.00',
      });
      escrowRepo.findOne.mockResolvedValue(escrow);
      escrowRepo.save.mockImplementation((e) => Promise.resolve(e));

      await service.releasePartialEscrow('escrow-1', 3000, 'Phase 1');

      const saved = escrowRepo.save.mock.calls[0][0];
      expect(saved.status).toBe(EscrowStatus.PARTIALLY_RELEASED);
    });

    it('should set status to RELEASED when partial release covers remaining balance', async () => {
      const escrow = buildEscrow({
        status: EscrowStatus.FUNDED,
        depositedAmount: '10000.00',
        releasedAmount: '0.00',
        platformFee: '150.00',
      });
      escrowRepo.findOne.mockResolvedValue(escrow);
      escrowRepo.save.mockImplementation((e) => Promise.resolve(e));

      await service.releasePartialEscrow('escrow-1', 9850, 'Final');

      const saved = escrowRepo.save.mock.calls[0][0];
      expect(saved.status).toBe(EscrowStatus.RELEASED);
    });

    it('should throw when requested amount exceeds available balance', async () => {
      const escrow = buildEscrow({
        status: EscrowStatus.FUNDED,
        depositedAmount: '10000.00',
        releasedAmount: '8000.00',
        platformFee: '150.00',
      });
      escrowRepo.findOne.mockResolvedValue(escrow);

      await expect(
        service.releasePartialEscrow('escrow-1', 5000, 'Too much'),
      ).rejects.toThrow(HttpException);
    });
  });

  // ─── freezeEscrow ──────────────────────────────────────────────────────────
  describe('freezeEscrow', () => {
    it('should freeze a funded escrow and set frozen amount', async () => {
      const escrow = buildEscrow({
        status: EscrowStatus.FUNDED,
        depositedAmount: '10000.00',
      });
      escrowRepo.findOne.mockResolvedValue(escrow);
      escrowRepo.save.mockImplementation((e) => Promise.resolve(e));

      await service.freezeEscrow('escrow-1', 'dispute-1');

      const saved = escrowRepo.save.mock.calls[0][0];
      expect(saved.status).toBe(EscrowStatus.FROZEN);
      expect(saved.frozenAmount).toBe('10000.00');
      expect(saved.disputeId).toBe('dispute-1');
    });

    it('should throw ConflictException when escrow is already released', async () => {
      const escrow = buildEscrow({ status: EscrowStatus.RELEASED });
      escrowRepo.findOne.mockResolvedValue(escrow);

      await expect(
        service.freezeEscrow('escrow-1', 'dispute-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when escrow is already frozen', async () => {
      const escrow = buildEscrow({ status: EscrowStatus.FROZEN });
      escrowRepo.findOne.mockResolvedValue(escrow);

      await expect(
        service.freezeEscrow('escrow-1', 'dispute-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when escrow is refunded', async () => {
      const escrow = buildEscrow({ status: EscrowStatus.REFUNDED });
      escrowRepo.findOne.mockResolvedValue(escrow);

      await expect(
        service.freezeEscrow('escrow-1', 'dispute-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── refundEscrow ──────────────────────────────────────────────────────────
  describe('refundEscrow', () => {
    it('should refund remaining balance to depositor', async () => {
      const escrow = buildEscrow({
        status: EscrowStatus.FUNDED,
        depositedAmount: '10000.00',
        releasedAmount: '3000.00',
      });
      escrowRepo.findOne.mockResolvedValue(escrow);
      escrowRepo.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.refundEscrow('escrow-1', 'Contract cancelled');

      expect(result.amountRefunded).toBe(7000);
      expect(result.reason).toBe('Contract cancelled');
      expect(result.depositorId).toBe('depositor-1');
      expect(result.refundTxId).toMatch(/^RFD-/);
      const saved = escrowRepo.save.mock.calls[0][0];
      expect(saved.status).toBe(EscrowStatus.REFUNDED);
    });

    it('should throw ConflictException when escrow is fully released', async () => {
      const escrow = buildEscrow({ status: EscrowStatus.RELEASED });
      escrowRepo.findOne.mockResolvedValue(escrow);

      await expect(
        service.refundEscrow('escrow-1', 'reason'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when escrow is already refunded', async () => {
      const escrow = buildEscrow({ status: EscrowStatus.REFUNDED });
      escrowRepo.findOne.mockResolvedValue(escrow);

      await expect(
        service.refundEscrow('escrow-1', 'reason'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when there are no funds to refund', async () => {
      const escrow = buildEscrow({
        status: EscrowStatus.FUNDED,
        depositedAmount: '5000.00',
        releasedAmount: '5000.00', // all released
      });
      escrowRepo.findOne.mockResolvedValue(escrow);

      await expect(
        service.refundEscrow('escrow-1', 'reason'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── confirmDeposit ────────────────────────────────────────────────────────
  describe('confirmDeposit', () => {
    it('should update deposit amount and set status to FUNDED when fully deposited', async () => {
      const escrow = buildEscrow({
        status: EscrowStatus.PENDING,
        depositedAmount: '0.00',
        totalAmount: '10000.00',
      });
      escrowRepo.findOne.mockResolvedValue(escrow);
      escrowRepo.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.confirmDeposit('escrow-1', 10000);

      expect(result.depositedAmount).toBe('10000.00');
      expect(result.status).toBe(EscrowStatus.FUNDED);
    });

    it('should set status to PARTIALLY_FUNDED for partial deposits', async () => {
      const escrow = buildEscrow({
        status: EscrowStatus.PENDING,
        depositedAmount: '0.00',
        totalAmount: '10000.00',
      });
      escrowRepo.findOne.mockResolvedValue(escrow);
      escrowRepo.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.confirmDeposit('escrow-1', 5000);

      expect(result.depositedAmount).toBe('5000.00');
      expect(result.status).toBe(EscrowStatus.PARTIALLY_FUNDED);
    });
  });

  // ─── calculateFee ──────────────────────────────────────────────────────────
  describe('calculateFee', () => {
    it('should calculate 1.5% fee on the amount', () => {
      const fee = service.calculateFee(10000);

      expect(fee).toBe(150);
    });

    it('should handle small amounts with proper decimal precision', () => {
      const fee = service.calculateFee(33.33);

      expect(fee).toBeCloseTo(0.5, 1);
    });
  });

  // ─── getEscrowBalance ─────────────────────────────────────────────────────
  describe('getEscrowBalance', () => {
    it('should return correct balance breakdown', async () => {
      const escrow = buildEscrow({
        depositedAmount: '10000.00',
        releasedAmount: '3000.00',
        frozenAmount: '2000.00',
        platformFee: '150.00',
      });
      escrowRepo.findOne.mockResolvedValue(escrow);

      const balance = await service.getEscrowBalance('escrow-1');

      expect(balance.available).toBe(4850); // 10000 - 3000 - 2000 - 150
      expect(balance.frozen).toBe(2000);
      expect(balance.released).toBe(3000);
      expect(balance.platformFee).toBe(150);
    });

    it('should return 0 available when all funds are allocated', async () => {
      const escrow = buildEscrow({
        depositedAmount: '10000.00',
        releasedAmount: '9850.00',
        frozenAmount: '0.00',
        platformFee: '150.00',
      });
      escrowRepo.findOne.mockResolvedValue(escrow);

      const balance = await service.getEscrowBalance('escrow-1');

      expect(balance.available).toBe(0);
    });
  });
});
