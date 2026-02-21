import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateContractTables1708000001 implements MigrationInterface {
  name = 'CreateContractTables1708000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    );

    // ── Enums ──────────────────────────────────────────────────────────

    await queryRunner.query(
      `CREATE TYPE "contract_type_enum" AS ENUM ('RENTAL', 'SERVICE', 'FREELANCER', 'NDA', 'LOAN', 'PURCHASE_SALE', 'EMPLOYMENT', 'PARTNERSHIP', 'OTHER')`,
    );

    await queryRunner.query(
      `CREATE TYPE "contract_status_enum" AS ENUM ('DRAFT', 'PENDING_SIGNATURES', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED', 'TERMINATED', 'DISPUTED', 'RENEWAL_PROPOSED', 'RENEWED')`,
    );

    await queryRunner.query(
      `CREATE TYPE "signature_type_enum" AS ENUM ('SIMPLE', 'ADVANCED', 'QUALIFIED', 'GOVBR', 'ICP_BRASIL')`,
    );

    // ── contracts table ────────────────────────────────────────────────

    await queryRunner.createTable(
      new Table({
        name: 'contracts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'contractNumber',
            type: 'varchar',
            length: '30',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'contract_type_enum',
            default: `'OTHER'`,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'contract_status_enum',
            default: `'DRAFT'`,
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'rawPrompt',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'parties',
            type: 'jsonb',
            default: `'[]'`,
            isNullable: false,
          },
          {
            name: 'clauses',
            type: 'jsonb',
            default: `'[]'`,
            isNullable: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: `'{}'`,
            isNullable: false,
          },
          {
            name: 'blockchainHash',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'blockchainTxId',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'escrowId',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'totalValue',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: `'BRL'`,
            isNullable: false,
          },
          {
            name: 'renewalDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: false,
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

    await queryRunner.createIndices('contracts', [
      new TableIndex({
        name: 'idx_contracts_contract_number',
        columnNames: ['contractNumber'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'idx_contracts_created_by_status',
        columnNames: ['createdBy', 'status'],
      }),
      new TableIndex({
        name: 'idx_contracts_status',
        columnNames: ['status'],
      }),
      new TableIndex({
        name: 'idx_contracts_type',
        columnNames: ['type'],
      }),
      new TableIndex({
        name: 'idx_contracts_expires_at',
        columnNames: ['expiresAt'],
      }),
    ]);

    // ── signatures table ───────────────────────────────────────────────

    await queryRunner.createTable(
      new Table({
        name: 'signatures',
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
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'signatureHash',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'signatureType',
            type: 'signature_type_enum',
            default: `'SIMPLE'`,
            isNullable: false,
          },
          {
            name: 'signedAt',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'govbrValidated',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'certificateId',
            type: 'varchar',
            length: '256',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'signatures',
      new TableForeignKey({
        name: 'fk_signatures_contract',
        columnNames: ['contractId'],
        referencedTableName: 'contracts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndices('signatures', [
      new TableIndex({
        name: 'idx_signatures_contract_user',
        columnNames: ['contractId', 'userId'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'idx_signatures_contract_id',
        columnNames: ['contractId'],
      }),
      new TableIndex({
        name: 'idx_signatures_user_id',
        columnNames: ['userId'],
      }),
    ]);

    // ── contract_events table ──────────────────────────────────────────

    await queryRunner.createTable(
      new Table({
        name: 'contract_events',
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
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'eventType',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: `'{}'`,
            isNullable: false,
          },
          {
            name: 'performedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'contract_events',
      new TableForeignKey({
        name: 'fk_contract_events_contract',
        columnNames: ['contractId'],
        referencedTableName: 'contracts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndices('contract_events', [
      new TableIndex({
        name: 'idx_contract_events_contract_created',
        columnNames: ['contractId', 'createdAt'],
      }),
      new TableIndex({
        name: 'idx_contract_events_contract_id',
        columnNames: ['contractId'],
      }),
      new TableIndex({
        name: 'idx_contract_events_event_type',
        columnNames: ['eventType'],
      }),
    ]);

    // ── templates table ────────────────────────────────────────────────

    await queryRunner.createTable(
      new Table({
        name: 'templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'category',
            type: 'contract_type_enum',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'variables',
            type: 'jsonb',
            default: `'[]'`,
            isNullable: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            isNullable: false,
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

    await queryRunner.createIndex(
      'templates',
      new TableIndex({
        name: 'idx_templates_category_active',
        columnNames: ['category', 'isActive'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('templates', 'idx_templates_category_active');

    await queryRunner.dropIndex('contract_events', 'idx_contract_events_event_type');
    await queryRunner.dropIndex('contract_events', 'idx_contract_events_contract_id');
    await queryRunner.dropIndex('contract_events', 'idx_contract_events_contract_created');

    await queryRunner.dropIndex('signatures', 'idx_signatures_user_id');
    await queryRunner.dropIndex('signatures', 'idx_signatures_contract_id');
    await queryRunner.dropIndex('signatures', 'idx_signatures_contract_user');

    await queryRunner.dropIndex('contracts', 'idx_contracts_expires_at');
    await queryRunner.dropIndex('contracts', 'idx_contracts_type');
    await queryRunner.dropIndex('contracts', 'idx_contracts_status');
    await queryRunner.dropIndex('contracts', 'idx_contracts_created_by_status');
    await queryRunner.dropIndex('contracts', 'idx_contracts_contract_number');

    // Drop foreign keys
    await queryRunner.dropForeignKey('contract_events', 'fk_contract_events_contract');
    await queryRunner.dropForeignKey('signatures', 'fk_signatures_contract');

    // Drop tables (reverse order due to FK dependencies)
    await queryRunner.dropTable('templates');
    await queryRunner.dropTable('contract_events');
    await queryRunner.dropTable('signatures');
    await queryRunner.dropTable('contracts');

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "signature_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "contract_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "contract_type_enum"`);
  }
}
