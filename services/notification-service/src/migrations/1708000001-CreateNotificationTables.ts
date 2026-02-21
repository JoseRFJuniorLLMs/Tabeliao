import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

export class CreateNotificationTables1708000001 implements MigrationInterface {
  name = 'CreateNotificationTables1708000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    );

    // ── Enums ──────────────────────────────────────────────────────────

    await queryRunner.query(
      `CREATE TYPE "device_platform_enum" AS ENUM ('ios', 'android', 'web')`,
    );

    await queryRunner.query(
      `CREATE TYPE "notification_channel_enum" AS ENUM ('push', 'email', 'sms', 'in_app')`,
    );

    await queryRunner.query(
      `CREATE TYPE "notification_status_enum" AS ENUM ('pending', 'sent', 'delivered', 'failed', 'read')`,
    );

    // ── devices table ──────────────────────────────────────────────────

    await queryRunner.createTable(
      new Table({
        name: 'devices',
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
            isNullable: false,
          },
          {
            name: 'deviceToken',
            type: 'varchar',
            length: '512',
            isNullable: false,
          },
          {
            name: 'platform',
            type: 'device_platform_enum',
            isNullable: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'registeredAt',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'lastUsedAt',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('devices', [
      new TableIndex({
        name: 'idx_devices_user_token',
        columnNames: ['userId', 'deviceToken'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'idx_devices_user_active',
        columnNames: ['userId', 'isActive'],
      }),
      new TableIndex({
        name: 'idx_devices_user_id',
        columnNames: ['userId'],
      }),
    ]);

    // ── notification_logs table ────────────────────────────────────────

    await queryRunner.createTable(
      new Table({
        name: 'notification_logs',
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
            isNullable: false,
          },
          {
            name: 'channel',
            type: 'notification_channel_enum',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'subject',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'notification_status_enum',
            default: `'pending'`,
            isNullable: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: `'{}'`,
            isNullable: true,
          },
          {
            name: 'sentAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('notification_logs', [
      new TableIndex({
        name: 'idx_notification_logs_user_id',
        columnNames: ['userId'],
      }),
      new TableIndex({
        name: 'idx_notification_logs_user_status',
        columnNames: ['userId', 'status'],
      }),
      new TableIndex({
        name: 'idx_notification_logs_channel',
        columnNames: ['channel'],
      }),
      new TableIndex({
        name: 'idx_notification_logs_created_at',
        columnNames: ['createdAt'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('notification_logs', 'idx_notification_logs_created_at');
    await queryRunner.dropIndex('notification_logs', 'idx_notification_logs_channel');
    await queryRunner.dropIndex('notification_logs', 'idx_notification_logs_user_status');
    await queryRunner.dropIndex('notification_logs', 'idx_notification_logs_user_id');

    await queryRunner.dropIndex('devices', 'idx_devices_user_id');
    await queryRunner.dropIndex('devices', 'idx_devices_user_active');
    await queryRunner.dropIndex('devices', 'idx_devices_user_token');

    // Drop tables
    await queryRunner.dropTable('notification_logs');
    await queryRunner.dropTable('devices');

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_channel_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "device_platform_enum"`);
  }
}
