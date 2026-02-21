import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

export class CreatePaymentTables1708000001 implements MigrationInterface {
  name = 'CreatePaymentTables1708000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    );

    // ── Enums ──────────────────────────────────────────────────────────

    await queryRunner.query(
      `CREATE TYPE "escrow_status_enum" AS ENUM ('PENDING', 'PARTIALLY_FUNDED', 'FUNDED', 'PARTIALLY_RELEASED', 'RELEASED', 'REFUNDED', 'FROZEN')`,
    );

    await queryRunner.query(
      `CREATE TYPE "invoice_status_enum" AS ENUM ('PENDING', 'OVERDUE', 'PAID', 'CANCELLED', 'REFUNDED')`,
    );

    // ── escrow_accounts table ──────────────────────────────────────────

    await queryRunner.createTable(
      new Table({
        name: 'escrow_accounts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'contractId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'depositorId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'beneficiaryId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'totalAmount',
            type: 'decimal',
            precision: 14,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'depositedAmount',
            type: 'decimal',
            precision: 14,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'releasedAmount',
            type: 'decimal',
            precision: 14,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'frozenAmount',
            type: 'decimal',
            precision: 14,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'platformFee',
            type: 'decimal',
            precision: 14,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'escrow_status_enum',
            default: `'PENDING'`,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: `'BRL'`,
            isNullable: false,
          },
          {
            name: 'pspAccountId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'depositDeadline',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'milestones',
            type: 'jsonb',
            default: `'[]'`,
            isNullable: true,
          },
          {
            name: 'disputeId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('escrow_accounts', [
      new TableIndex({
        name: 'idx_escrow_accounts_contract_id',
        columnNames: ['contractId'],
      }),
      new TableIndex({
        name: 'idx_escrow_accounts_depositor_id',
        columnNames: ['depositorId'],
      }),
      new TableIndex({
        name: 'idx_escrow_accounts_beneficiary_id',
        columnNames: ['beneficiaryId'],
      }),
      new TableIndex({
        name: 'idx_escrow_accounts_status',
        columnNames: ['status'],
      }),
    ]);

    // ── invoices table ─────────────────────────────────────────────────

    await queryRunner.createTable(
      new Table({
        name: 'invoices',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'contractId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'payerId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'payeeId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'originalAmount',
            type: 'decimal',
            precision: 14,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'fineAmount',
            type: 'decimal',
            precision: 14,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'interestAmount',
            type: 'decimal',
            precision: 14,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'totalAmount',
            type: 'decimal',
            precision: 14,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: `'BRL'`,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'invoice_status_enum',
            default: `'PENDING'`,
            isNullable: false,
          },
          {
            name: 'dueDate',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'paidAt',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'paymentMethod',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'installmentNumber',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'totalInstallments',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'pixCode',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'boletoCode',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'boletoUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'splits',
            type: 'jsonb',
            default: `'[]'`,
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: `'{}'`,
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('invoices', [
      new TableIndex({
        name: 'idx_invoices_contract_id',
        columnNames: ['contractId'],
      }),
      new TableIndex({
        name: 'idx_invoices_payer_id',
        columnNames: ['payerId'],
      }),
      new TableIndex({
        name: 'idx_invoices_payee_id',
        columnNames: ['payeeId'],
      }),
      new TableIndex({
        name: 'idx_invoices_status',
        columnNames: ['status'],
      }),
      new TableIndex({
        name: 'idx_invoices_due_date',
        columnNames: ['dueDate'],
      }),
      new TableIndex({
        name: 'idx_invoices_contract_installment',
        columnNames: ['contractId', 'installmentNumber'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('invoices', 'idx_invoices_contract_installment');
    await queryRunner.dropIndex('invoices', 'idx_invoices_due_date');
    await queryRunner.dropIndex('invoices', 'idx_invoices_status');
    await queryRunner.dropIndex('invoices', 'idx_invoices_payee_id');
    await queryRunner.dropIndex('invoices', 'idx_invoices_payer_id');
    await queryRunner.dropIndex('invoices', 'idx_invoices_contract_id');

    await queryRunner.dropIndex('escrow_accounts', 'idx_escrow_accounts_status');
    await queryRunner.dropIndex('escrow_accounts', 'idx_escrow_accounts_beneficiary_id');
    await queryRunner.dropIndex('escrow_accounts', 'idx_escrow_accounts_depositor_id');
    await queryRunner.dropIndex('escrow_accounts', 'idx_escrow_accounts_contract_id');

    // Drop tables
    await queryRunner.dropTable('invoices');
    await queryRunner.dropTable('escrow_accounts');

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "invoice_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "escrow_status_enum"`);
  }
}
