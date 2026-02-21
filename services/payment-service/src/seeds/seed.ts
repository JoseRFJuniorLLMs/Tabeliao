import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import {
  EscrowAccount,
  EscrowStatus,
  EscrowMilestone,
} from '../modules/escrow/entities/escrow-account.entity';
import {
  Invoice,
  InvoiceStatus,
  InvoiceSplit,
} from '../modules/billing/entities/invoice.entity';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Cross-service reference IDs
const USER_IDS = {
  admin: 'a0000000-0000-4000-8000-000000000001',
  maria: 'a0000000-0000-4000-8000-000000000002',
  joao: 'a0000000-0000-4000-8000-000000000003',
  ana: 'a0000000-0000-4000-8000-000000000004',
  carlos: 'a0000000-0000-4000-8000-000000000005',
  fernanda: 'a0000000-0000-4000-8000-000000000006',
  techCorp: 'a0000000-0000-4000-8000-000000000007',
};

const CONTRACT_IDS = {
  rentalMaria: 'c0000000-0000-4000-8000-000000000001',
  servicesTechCorp: 'c0000000-0000-4000-8000-000000000002',
  purchaseSale: 'c0000000-0000-4000-8000-000000000003',
  freelancerCarlos: 'c0000000-0000-4000-8000-000000000004',
  ndaMaria: 'c0000000-0000-4000-8000-000000000005',
  partnership: 'c0000000-0000-4000-8000-000000000006',
  rentalDraft: 'c0000000-0000-4000-8000-000000000007',
  pendingSignatures: 'c0000000-0000-4000-8000-000000000008',
  cancelledContract: 'c0000000-0000-4000-8000-000000000009',
  disputedContract: 'c0000000-0000-4000-8000-00000000000a',
};

// Fixed escrow IDs (referenced by contracts)
const ESCROW_IDS = {
  rentalEscrow: 'e0000000-0000-4000-8000-000000000001',
  servicesEscrow: 'e0000000-0000-4000-8000-000000000002',
  purchaseEscrow: 'e0000000-0000-4000-8000-000000000003',
};

// --- Escrow Accounts ---

function buildEscrowAccounts(): Partial<EscrowAccount>[] {
  return [
    // 1. FUNDED escrow - Rental contract (Joao pays Maria monthly)
    {
      id: ESCROW_IDS.rentalEscrow,
      contractId: CONTRACT_IDS.rentalMaria,
      depositorId: USER_IDS.joao,
      beneficiaryId: USER_IDS.maria,
      totalAmount: '10500.00',
      depositedAmount: '10500.00',
      releasedAmount: '3500.00',
      frozenAmount: '0.00',
      platformFee: '157.50',
      status: EscrowStatus.FUNDED,
      currency: 'BRL',
      pspAccountId: 'PSP-ESC-2026-001',
      depositDeadline: new Date('2026-02-01T23:59:59Z'),
      milestones: [
        {
          id: uuidv4(),
          label: 'Caucao (3 meses de aluguel)',
          amount: 10500,
          released: false,
          approvedBy: [],
        },
      ] as EscrowMilestone[],
      disputeId: null,
    },
    // 2. PARTIALLY_RELEASED escrow - Services contract (milestone-based)
    {
      id: ESCROW_IDS.servicesEscrow,
      contractId: CONTRACT_IDS.servicesTechCorp,
      depositorId: USER_IDS.techCorp,
      beneficiaryId: USER_IDS.carlos,
      totalAmount: '48000.00',
      depositedAmount: '48000.00',
      releasedAmount: '16000.00',
      frozenAmount: '0.00',
      platformFee: '720.00',
      status: EscrowStatus.PARTIALLY_RELEASED,
      currency: 'BRL',
      pspAccountId: 'PSP-ESC-2026-002',
      depositDeadline: new Date('2026-01-25T23:59:59Z'),
      milestones: [
        {
          id: uuidv4(),
          label: 'M1 - Modulo Contas a Pagar',
          amount: 16000,
          released: true,
          releasedAt: '2026-02-15T10:00:00Z',
          approvedBy: [USER_IDS.techCorp],
        },
        {
          id: uuidv4(),
          label: 'M2 - Modulo Contas a Receber + Fluxo de Caixa',
          amount: 16000,
          released: false,
          approvedBy: [],
        },
        {
          id: uuidv4(),
          label: 'M3 - DRE + Integracao Final',
          amount: 16000,
          released: false,
          approvedBy: [],
        },
      ] as EscrowMilestone[],
      disputeId: null,
    },
    // 3. FROZEN escrow - Purchase/sale under review (vehicle transaction)
    {
      id: ESCROW_IDS.purchaseEscrow,
      contractId: CONTRACT_IDS.purchaseSale,
      depositorId: USER_IDS.fernanda,
      beneficiaryId: USER_IDS.ana,
      totalAmount: '135000.00',
      depositedAmount: '135000.00',
      releasedAmount: '0.00',
      frozenAmount: '135000.00',
      platformFee: '2025.00',
      status: EscrowStatus.FROZEN,
      currency: 'BRL',
      pspAccountId: 'PSP-ESC-2026-003',
      depositDeadline: new Date('2026-02-05T23:59:59Z'),
      milestones: [
        {
          id: uuidv4(),
          label: 'Pagamento integral do veiculo',
          amount: 135000,
          released: false,
          approvedBy: [],
        },
      ] as EscrowMilestone[],
      disputeId: null,
    },
  ];
}

// --- Invoices ---

function buildInvoices(): Partial<Invoice>[] {
  const today = new Date();
  const pastDate = (daysAgo: number) => new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const futureDate = (daysAhead: number) => new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  // Sample PIX code (EMV format mock)
  const samplePixCode = '00020126580014br.gov.bcb.pix0136a0000000-0000-4000-8000-0000000000015204000053039865802BR5925TABELIAO PLATAFORMA LTDA6009SAO PAULO62070503***63041D3D';
  // Sample boleto code
  const sampleBoletoCode = '23793.38128 60000.000003 00000.000400 1 90260000035000';

  return [
    // --- Rental contract invoices (monthly rent) ---
    // Invoice 1: PAID - January rent
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.rentalMaria,
      payerId: USER_IDS.joao,
      payeeId: USER_IDS.maria,
      originalAmount: '3500.00',
      fineAmount: '0.00',
      interestAmount: '0.00',
      totalAmount: '3500.00',
      currency: 'BRL',
      status: InvoiceStatus.PAID,
      dueDate: new Date('2026-01-10'),
      paidAt: new Date('2026-01-09T14:30:00Z'),
      paymentMethod: 'PIX',
      installmentNumber: 1,
      totalInstallments: 30,
      description: 'Aluguel residencial - Janeiro/2026 - Rua dos Pinheiros, 450, Apt 72',
      pixCode: samplePixCode,
      boletoCode: null,
      boletoUrl: null,
      splits: [
        { userId: USER_IDS.maria, percentage: 98.5, amount: 3447.50 },
        { userId: USER_IDS.admin, percentage: 1.5, amount: 52.50 },
      ] as InvoiceSplit[],
      metadata: { monthRef: '01/2026', escrowId: ESCROW_IDS.rentalEscrow },
    },
    // Invoice 2: PAID - February rent
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.rentalMaria,
      payerId: USER_IDS.joao,
      payeeId: USER_IDS.maria,
      originalAmount: '3500.00',
      fineAmount: '0.00',
      interestAmount: '0.00',
      totalAmount: '3500.00',
      currency: 'BRL',
      status: InvoiceStatus.PAID,
      dueDate: new Date('2026-02-10'),
      paidAt: new Date('2026-02-10T08:15:00Z'),
      paymentMethod: 'PIX',
      installmentNumber: 2,
      totalInstallments: 30,
      description: 'Aluguel residencial - Fevereiro/2026 - Rua dos Pinheiros, 450, Apt 72',
      pixCode: samplePixCode,
      boletoCode: null,
      boletoUrl: null,
      splits: [
        { userId: USER_IDS.maria, percentage: 98.5, amount: 3447.50 },
        { userId: USER_IDS.admin, percentage: 1.5, amount: 52.50 },
      ] as InvoiceSplit[],
      metadata: { monthRef: '02/2026', escrowId: ESCROW_IDS.rentalEscrow },
    },
    // Invoice 3: PENDING - March rent (upcoming)
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.rentalMaria,
      payerId: USER_IDS.joao,
      payeeId: USER_IDS.maria,
      originalAmount: '3500.00',
      fineAmount: '0.00',
      interestAmount: '0.00',
      totalAmount: '3500.00',
      currency: 'BRL',
      status: InvoiceStatus.PENDING,
      dueDate: new Date('2026-03-10'),
      paidAt: null,
      paymentMethod: null,
      installmentNumber: 3,
      totalInstallments: 30,
      description: 'Aluguel residencial - Marco/2026 - Rua dos Pinheiros, 450, Apt 72',
      pixCode: samplePixCode,
      boletoCode: sampleBoletoCode,
      boletoUrl: 'https://boleto.tabeliao.com.br/v1/TAB-2026-000001-03',
      splits: [
        { userId: USER_IDS.maria, percentage: 98.5, amount: 3447.50 },
        { userId: USER_IDS.admin, percentage: 1.5, amount: 52.50 },
      ] as InvoiceSplit[],
      metadata: { monthRef: '03/2026', escrowId: ESCROW_IDS.rentalEscrow },
    },

    // --- Services contract invoices (milestone-based) ---
    // Invoice 4: PAID - Milestone 1
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.servicesTechCorp,
      payerId: USER_IDS.techCorp,
      payeeId: USER_IDS.carlos,
      originalAmount: '16000.00',
      fineAmount: '0.00',
      interestAmount: '0.00',
      totalAmount: '16000.00',
      currency: 'BRL',
      status: InvoiceStatus.PAID,
      dueDate: new Date('2026-02-15'),
      paidAt: new Date('2026-02-15T10:00:00Z'),
      paymentMethod: 'PIX',
      installmentNumber: 1,
      totalInstallments: 3,
      description: 'Milestone 1 - Modulo Contas a Pagar - Sistema ERP TechCorp',
      pixCode: samplePixCode,
      boletoCode: null,
      boletoUrl: null,
      splits: [
        { userId: USER_IDS.carlos, percentage: 98.5, amount: 15760.00 },
        { userId: USER_IDS.admin, percentage: 1.5, amount: 240.00 },
      ] as InvoiceSplit[],
      metadata: { milestone: 1, escrowId: ESCROW_IDS.servicesEscrow },
    },
    // Invoice 5: PENDING - Milestone 2
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.servicesTechCorp,
      payerId: USER_IDS.techCorp,
      payeeId: USER_IDS.carlos,
      originalAmount: '16000.00',
      fineAmount: '0.00',
      interestAmount: '0.00',
      totalAmount: '16000.00',
      currency: 'BRL',
      status: InvoiceStatus.PENDING,
      dueDate: new Date('2026-04-15'),
      paidAt: null,
      paymentMethod: null,
      installmentNumber: 2,
      totalInstallments: 3,
      description: 'Milestone 2 - Modulo Contas a Receber + Fluxo de Caixa - Sistema ERP TechCorp',
      pixCode: null,
      boletoCode: null,
      boletoUrl: null,
      splits: [
        { userId: USER_IDS.carlos, percentage: 98.5, amount: 15760.00 },
        { userId: USER_IDS.admin, percentage: 1.5, amount: 240.00 },
      ] as InvoiceSplit[],
      metadata: { milestone: 2, escrowId: ESCROW_IDS.servicesEscrow },
    },
    // Invoice 6: PENDING - Milestone 3
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.servicesTechCorp,
      payerId: USER_IDS.techCorp,
      payeeId: USER_IDS.carlos,
      originalAmount: '16000.00',
      fineAmount: '0.00',
      interestAmount: '0.00',
      totalAmount: '16000.00',
      currency: 'BRL',
      status: InvoiceStatus.PENDING,
      dueDate: new Date('2026-06-15'),
      paidAt: null,
      paymentMethod: null,
      installmentNumber: 3,
      totalInstallments: 3,
      description: 'Milestone 3 - DRE + Integracao Final - Sistema ERP TechCorp',
      pixCode: null,
      boletoCode: null,
      boletoUrl: null,
      splits: [
        { userId: USER_IDS.carlos, percentage: 98.5, amount: 15760.00 },
        { userId: USER_IDS.admin, percentage: 1.5, amount: 240.00 },
      ] as InvoiceSplit[],
      metadata: { milestone: 3, escrowId: ESCROW_IDS.servicesEscrow },
    },

    // --- Purchase/sale invoice ---
    // Invoice 7: PAID - Vehicle purchase (full amount via escrow)
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.purchaseSale,
      payerId: USER_IDS.fernanda,
      payeeId: USER_IDS.ana,
      originalAmount: '135000.00',
      fineAmount: '0.00',
      interestAmount: '0.00',
      totalAmount: '135000.00',
      currency: 'BRL',
      status: InvoiceStatus.PAID,
      dueDate: new Date('2026-02-01'),
      paidAt: new Date('2026-02-01T16:30:00Z'),
      paymentMethod: 'PIX',
      installmentNumber: null,
      totalInstallments: null,
      description: 'Compra de veiculo Honda Civic EXL 2024 - Placa ABC-1D23',
      pixCode: samplePixCode,
      boletoCode: null,
      boletoUrl: null,
      splits: [
        { userId: USER_IDS.ana, percentage: 98.5, amount: 132975.00 },
        { userId: USER_IDS.admin, percentage: 1.5, amount: 2025.00 },
      ] as InvoiceSplit[],
      metadata: { escrowId: ESCROW_IDS.purchaseEscrow, vehiclePlate: 'ABC-1D23' },
    },

    // --- Disputed contract invoices ---
    // Invoice 8: PAID - First installment of renovation
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.disputedContract,
      payerId: USER_IDS.joao,
      payeeId: USER_IDS.carlos,
      originalAmount: '15000.00',
      fineAmount: '0.00',
      interestAmount: '0.00',
      totalAmount: '15000.00',
      currency: 'BRL',
      status: InvoiceStatus.PAID,
      dueDate: new Date('2025-11-10'),
      paidAt: new Date('2025-11-08T11:00:00Z'),
      paymentMethod: 'PIX',
      installmentNumber: 1,
      totalInstallments: 3,
      description: 'Parcela 1/3 - Reforma residencial - Rua Consolacao, 350, AP 101',
      pixCode: samplePixCode,
      boletoCode: null,
      boletoUrl: null,
      splits: [],
      metadata: { renovation: true },
    },
    // Invoice 9: OVERDUE - Second installment (part of dispute)
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.disputedContract,
      payerId: USER_IDS.joao,
      payeeId: USER_IDS.carlos,
      originalAmount: '10000.00',
      fineAmount: '200.00',
      interestAmount: '150.00',
      totalAmount: '10350.00',
      currency: 'BRL',
      status: InvoiceStatus.OVERDUE,
      dueDate: new Date('2025-12-10'),
      paidAt: null,
      paymentMethod: null,
      installmentNumber: 2,
      totalInstallments: 3,
      description: 'Parcela 2/3 - Reforma residencial - EM ATRASO (disputa aberta)',
      pixCode: null,
      boletoCode: sampleBoletoCode,
      boletoUrl: 'https://boleto.tabeliao.com.br/v1/TAB-2026-000010-02',
      splits: [],
      metadata: { renovation: true, overdueDays: 72, disputeHold: true },
    },
    // Invoice 10: PENDING - Third installment (held due to dispute)
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.disputedContract,
      payerId: USER_IDS.joao,
      payeeId: USER_IDS.carlos,
      originalAmount: '10000.00',
      fineAmount: '0.00',
      interestAmount: '0.00',
      totalAmount: '10000.00',
      currency: 'BRL',
      status: InvoiceStatus.PENDING,
      dueDate: new Date('2026-01-10'),
      paidAt: null,
      paymentMethod: null,
      installmentNumber: 3,
      totalInstallments: 3,
      description: 'Parcela 3/3 - Reforma residencial - SUSPENSO (disputa aberta)',
      pixCode: null,
      boletoCode: null,
      boletoUrl: null,
      splits: [],
      metadata: { renovation: true, suspendedDueToDispute: true },
    },

    // --- Freelancer contract invoices (Maria design work) ---
    // Invoice 11: PAID - Freelancer milestone 1
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.freelancerCarlos,
      payerId: USER_IDS.techCorp,
      payeeId: USER_IDS.maria,
      originalAmount: '6000.00',
      fineAmount: '0.00',
      interestAmount: '0.00',
      totalAmount: '6000.00',
      currency: 'BRL',
      status: InvoiceStatus.PAID,
      dueDate: new Date('2026-02-20'),
      paidAt: new Date('2026-02-19T16:45:00Z'),
      paymentMethod: 'PIX',
      installmentNumber: 1,
      totalInstallments: 3,
      description: 'Milestone 1 - Wireframes - Design App Mobile TechCorp',
      pixCode: samplePixCode,
      boletoCode: null,
      boletoUrl: null,
      splits: [
        { userId: USER_IDS.maria, percentage: 98.5, amount: 5910.00 },
        { userId: USER_IDS.admin, percentage: 1.5, amount: 90.00 },
      ] as InvoiceSplit[],
      metadata: { milestone: 1, projectName: 'redesign-mobile-techcorp' },
    },
    // Invoice 12: PENDING - Freelancer milestone 2
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.freelancerCarlos,
      payerId: USER_IDS.techCorp,
      payeeId: USER_IDS.maria,
      originalAmount: '6000.00',
      fineAmount: '0.00',
      interestAmount: '0.00',
      totalAmount: '6000.00',
      currency: 'BRL',
      status: InvoiceStatus.PENDING,
      dueDate: new Date('2026-03-20'),
      paidAt: null,
      paymentMethod: null,
      installmentNumber: 2,
      totalInstallments: 3,
      description: 'Milestone 2 - Prototipos Interativos - Design App Mobile TechCorp',
      pixCode: null,
      boletoCode: null,
      boletoUrl: null,
      splits: [
        { userId: USER_IDS.maria, percentage: 98.5, amount: 5910.00 },
        { userId: USER_IDS.admin, percentage: 1.5, amount: 90.00 },
      ] as InvoiceSplit[],
      metadata: { milestone: 2, projectName: 'redesign-mobile-techcorp' },
    },
    // Invoice 13: PENDING - Freelancer milestone 3
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.freelancerCarlos,
      payerId: USER_IDS.techCorp,
      payeeId: USER_IDS.maria,
      originalAmount: '6000.00',
      fineAmount: '0.00',
      interestAmount: '0.00',
      totalAmount: '6000.00',
      currency: 'BRL',
      status: InvoiceStatus.PENDING,
      dueDate: new Date('2026-04-20'),
      paidAt: null,
      paymentMethod: null,
      installmentNumber: 3,
      totalInstallments: 3,
      description: 'Milestone 3 - Design System - Design App Mobile TechCorp',
      pixCode: null,
      boletoCode: null,
      boletoUrl: null,
      splits: [
        { userId: USER_IDS.maria, percentage: 98.5, amount: 5910.00 },
        { userId: USER_IDS.admin, percentage: 1.5, amount: 90.00 },
      ] as InvoiceSplit[],
      metadata: { milestone: 3, projectName: 'redesign-mobile-techcorp' },
    },

    // --- Platform fee invoices ---
    // Invoice 14: CANCELLED - Cancelled contract invoice (was generated but then cancelled)
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.cancelledContract,
      payerId: USER_IDS.joao,
      payeeId: USER_IDS.fernanda,
      originalAmount: '2800.00',
      fineAmount: '0.00',
      interestAmount: '0.00',
      totalAmount: '2800.00',
      currency: 'BRL',
      status: InvoiceStatus.CANCELLED,
      dueDate: new Date('2026-02-10'),
      paidAt: null,
      paymentMethod: null,
      installmentNumber: null,
      totalInstallments: null,
      description: 'Aluguel residencial - Campinas/SP - CANCELADO (contrato cancelado)',
      pixCode: null,
      boletoCode: null,
      boletoUrl: null,
      splits: [],
      metadata: { cancelledWithContract: true, cancellationDate: '2026-01-28' },
    },

    // Invoice 15: OVERDUE - Old consultation invoice from partnership contract
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.partnership,
      payerId: USER_IDS.joao,
      payeeId: USER_IDS.maria,
      originalAmount: '25000.00',
      fineAmount: '500.00',
      interestAmount: '375.00',
      totalAmount: '25875.00',
      currency: 'BRL',
      status: InvoiceStatus.OVERDUE,
      dueDate: new Date('2026-01-30'),
      paidAt: null,
      paymentMethod: null,
      installmentNumber: null,
      totalInstallments: null,
      description: 'Aporte de capital - Socio Joao Pedro dos Santos - MJ Consultoria Digital Ltda',
      pixCode: samplePixCode,
      boletoCode: sampleBoletoCode,
      boletoUrl: 'https://boleto.tabeliao.com.br/v1/TAB-2026-000006-APORTE',
      splits: [],
      metadata: { capitalContribution: true, overdueDays: 22 },
    },
  ];
}

function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    username: process.env['DB_USERNAME'] ?? 'tabeliao',
    password: process.env['DB_PASSWORD'] ?? 'tabeliao',
    database: process.env['DB_DATABASE'] ?? 'tabeliao_payments',
    entities: [EscrowAccount, Invoice],
    synchronize: true,
    logging: false,
  });
}

export async function seedPayments(): Promise<void> {
  console.log('[payment-service] Starting seed...');
  const dataSource = createDataSource();

  try {
    await dataSource.initialize();
    console.log('[payment-service] Database connected.');

    const escrowRepo = dataSource.getRepository(EscrowAccount);
    const invoiceRepo = dataSource.getRepository(Invoice);

    // Clear existing data
    console.log('[payment-service] Clearing existing data...');
    await invoiceRepo.delete({});
    await escrowRepo.delete({});

    // Seed escrow accounts
    const escrows = buildEscrowAccounts();
    console.log(`[payment-service] Inserting ${escrows.length} escrow accounts...`);
    for (const escrow of escrows) {
      await escrowRepo.save(escrowRepo.create(escrow));
      console.log(`  - Escrow: ${escrow.id} [${escrow.status}] - R$ ${escrow.totalAmount}`);
    }

    // Seed invoices
    const invoices = buildInvoices();
    console.log(`[payment-service] Inserting ${invoices.length} invoices...`);

    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let cancelledCount = 0;

    for (const invoice of invoices) {
      await invoiceRepo.save(invoiceRepo.create(invoice));

      switch (invoice.status) {
        case InvoiceStatus.PAID:
          paidCount++;
          break;
        case InvoiceStatus.PENDING:
          pendingCount++;
          break;
        case InvoiceStatus.OVERDUE:
          overdueCount++;
          break;
        case InvoiceStatus.CANCELLED:
          cancelledCount++;
          break;
      }
    }

    console.log(`  - Paid: ${paidCount}`);
    console.log(`  - Pending: ${pendingCount}`);
    console.log(`  - Overdue: ${overdueCount}`);
    console.log(`  - Cancelled: ${cancelledCount}`);

    console.log(`[payment-service] Seed completed. ${escrows.length} escrows + ${invoices.length} invoices created.`);
  } catch (error) {
    console.error('[payment-service] Seed failed:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

// Allow running directly
if (require.main === module) {
  seedPayments()
    .then(() => {
      console.log('[payment-service] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[payment-service] Fatal error:', err);
      process.exit(1);
    });
}
