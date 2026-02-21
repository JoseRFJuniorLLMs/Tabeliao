import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateDisputeTables1708000001 implements MigrationInterface {
  name = 'CreateDisputeTables1708000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    );

    // ── Enums ──────────────────────────────────────────────────────────

    await queryRunner.query(
      `CREATE TYPE "dispute_status_enum" AS ENUM ('OPENED', 'UNDER_MEDIATION', 'UNDER_ARBITRATION', 'AI_REVIEW', 'AWAITING_ACCEPTANCE', 'ESCALATED', 'RESOLVED', 'CLOSED')`,
    );

    await queryRunner.query(
      `CREATE TYPE "dispute_type_enum" AS ENUM ('BREACH_OF_CONTRACT', 'PAYMENT_DISPUTE', 'QUALITY_DISPUTE', 'DELIVERY_DISPUTE', 'OTHER')`,
    );

    await queryRunner.query(
      `CREATE TYPE "sender_role_enum" AS ENUM ('PLAINTIFF', 'DEFENDANT', 'ARBITRATOR', 'MEDIATOR', 'SYSTEM')`,
    );

    // ── arbitrators table (created first because disputes references it) ─

    await queryRunner.createTable(
      new Table({
        name: 'arbitrators',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'oabNumber',
            type: 'varchar',
            length: '20',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'oabState',
            type: 'varchar',
            length: '2',
            isNullable: false,
          },
          {
            name: 'specialties',
            type: 'jsonb',
            default: `'[]'`,
            isNullable: false,
          },
          {
            name: 'rating',
            type: 'float',
            default: 5.0,
            isNullable: false,
          },
          {
            name: 'totalCases',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'resolvedCases',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'averageResolutionDays',
            type: 'float',
            default: 0,
            isNullable: false,
          },
          {
            name: 'isAvailable',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'maxConcurrentCases',
            type: 'int',
            default: 5,
            isNullable: false,
          },
          {
            name: 'currentCases',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'bio',
            type: 'text',
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

    await queryRunner.createIndices('arbitrators', [
      new TableIndex({
        name: 'idx_arbitrators_oab_number_state',
        columnNames: ['oabNumber', 'oabState'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'idx_arbitrators_is_available',
        columnNames: ['isAvailable'],
      }),
      new TableIndex({
        name: 'idx_arbitrators_rating',
        columnNames: ['rating'],
      }),
      new TableIndex({
        name: 'idx_arbitrators_user_id',
        columnNames: ['userId'],
        isUnique: true,
      }),
    ]);

    // ── disputes table ─────────────────────────────────────────────────

    await queryRunner.createTable(
      new Table({
        name: 'disputes',
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
            name: 'openedBy',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'respondentId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'dispute_status_enum',
            default: `'OPENED'`,
            isNullable: false,
          },
          {
            name: 'type',
            type: 'dispute_type_enum',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'disputeValue',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'evidence',
            type: 'jsonb',
            default: `'[]'`,
            isNullable: false,
          },
          {
            name: 'arbitratorId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'mediatorId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'aiAnalysis',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'resolution',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'resolutionAcceptedByPlaintiff',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'resolutionAcceptedByDefendant',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'deadline',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'filedAt',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'resolvedAt',
            type: 'timestamp with time zone',
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

    await queryRunner.createForeignKey(
      'disputes',
      new TableForeignKey({
        name: 'fk_disputes_arbitrator',
        columnNames: ['arbitratorId'],
        referencedTableName: 'arbitrators',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndices('disputes', [
      new TableIndex({
        name: 'idx_disputes_opened_by_status',
        columnNames: ['openedBy', 'status'],
      }),
      new TableIndex({
        name: 'idx_disputes_respondent_status',
        columnNames: ['respondentId', 'status'],
      }),
      new TableIndex({
        name: 'idx_disputes_contract_id',
        columnNames: ['contractId'],
      }),
      new TableIndex({
        name: 'idx_disputes_status',
        columnNames: ['status'],
      }),
      new TableIndex({
        name: 'idx_disputes_arbitrator_id',
        columnNames: ['arbitratorId'],
      }),
      new TableIndex({
        name: 'idx_disputes_mediator_id',
        columnNames: ['mediatorId'],
      }),
      new TableIndex({
        name: 'idx_disputes_deadline',
        columnNames: ['deadline'],
      }),
    ]);

    // ── dispute_messages table ─────────────────────────────────────────

    await queryRunner.createTable(
      new Table({
        name: 'dispute_messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'disputeId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'senderId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'senderRole',
            type: 'sender_role_enum',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'attachments',
            type: 'jsonb',
            default: `'[]'`,
            isNullable: false,
          },
          {
            name: 'isPrivate',
            type: 'boolean',
            default: false,
            isNullable: false,
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
      'dispute_messages',
      new TableForeignKey({
        name: 'fk_dispute_messages_dispute',
        columnNames: ['disputeId'],
        referencedTableName: 'disputes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndices('dispute_messages', [
      new TableIndex({
        name: 'idx_dispute_messages_dispute_created',
        columnNames: ['disputeId', 'createdAt'],
      }),
      new TableIndex({
        name: 'idx_dispute_messages_sender_id',
        columnNames: ['senderId'],
      }),
    ]);

    // ── arbitrator_ratings table ───────────────────────────────────────

    await queryRunner.createTable(
      new Table({
        name: 'arbitrator_ratings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'arbitratorId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'disputeId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'rating',
            type: 'float',
            isNullable: false,
          },
          {
            name: 'feedback',
            type: 'text',
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
      'arbitrator_ratings',
      new TableForeignKey({
        name: 'fk_arbitrator_ratings_arbitrator',
        columnNames: ['arbitratorId'],
        referencedTableName: 'arbitrators',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'arbitrator_ratings',
      new TableForeignKey({
        name: 'fk_arbitrator_ratings_dispute',
        columnNames: ['disputeId'],
        referencedTableName: 'disputes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndices('arbitrator_ratings', [
      new TableIndex({
        name: 'idx_arbitrator_ratings_arbitrator_dispute',
        columnNames: ['arbitratorId', 'disputeId'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'idx_arbitrator_ratings_user_id',
        columnNames: ['userId'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('arbitrator_ratings', 'idx_arbitrator_ratings_user_id');
    await queryRunner.dropIndex('arbitrator_ratings', 'idx_arbitrator_ratings_arbitrator_dispute');

    await queryRunner.dropIndex('dispute_messages', 'idx_dispute_messages_sender_id');
    await queryRunner.dropIndex('dispute_messages', 'idx_dispute_messages_dispute_created');

    await queryRunner.dropIndex('disputes', 'idx_disputes_deadline');
    await queryRunner.dropIndex('disputes', 'idx_disputes_mediator_id');
    await queryRunner.dropIndex('disputes', 'idx_disputes_arbitrator_id');
    await queryRunner.dropIndex('disputes', 'idx_disputes_status');
    await queryRunner.dropIndex('disputes', 'idx_disputes_contract_id');
    await queryRunner.dropIndex('disputes', 'idx_disputes_respondent_status');
    await queryRunner.dropIndex('disputes', 'idx_disputes_opened_by_status');

    await queryRunner.dropIndex('arbitrators', 'idx_arbitrators_user_id');
    await queryRunner.dropIndex('arbitrators', 'idx_arbitrators_rating');
    await queryRunner.dropIndex('arbitrators', 'idx_arbitrators_is_available');
    await queryRunner.dropIndex('arbitrators', 'idx_arbitrators_oab_number_state');

    // Drop foreign keys
    await queryRunner.dropForeignKey('arbitrator_ratings', 'fk_arbitrator_ratings_dispute');
    await queryRunner.dropForeignKey('arbitrator_ratings', 'fk_arbitrator_ratings_arbitrator');
    await queryRunner.dropForeignKey('dispute_messages', 'fk_dispute_messages_dispute');
    await queryRunner.dropForeignKey('disputes', 'fk_disputes_arbitrator');

    // Drop tables (reverse order due to FK dependencies)
    await queryRunner.dropTable('arbitrator_ratings');
    await queryRunner.dropTable('dispute_messages');
    await queryRunner.dropTable('disputes');
    await queryRunner.dropTable('arbitrators');

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "sender_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "dispute_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "dispute_status_enum"`);
  }
}
