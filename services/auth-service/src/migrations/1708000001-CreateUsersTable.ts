import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUsersTable1708000001 implements MigrationInterface {
  name = 'CreateUsersTable1708000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    );

    await queryRunner.query(
      `CREATE TYPE "user_role_enum" AS ENUM ('user', 'notary', 'admin', 'super_admin')`,
    );

    await queryRunner.query(
      `CREATE TYPE "kyc_level_enum" AS ENUM ('none', 'basic', 'bronze', 'silver', 'gold', 'full')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'cpf',
            type: 'varchar',
            length: '14',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'cnpj',
            type: 'varchar',
            length: '18',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'kycLevel',
            type: 'kyc_level_enum',
            default: `'none'`,
            isNullable: false,
          },
          {
            name: 'riskScore',
            type: 'float',
            default: 0,
            isNullable: false,
          },
          {
            name: 'govbrId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'role',
            type: 'user_role_enum',
            default: `'user'`,
            isNullable: false,
          },
          {
            name: 'twoFactorSecret',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'twoFactorEnabled',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'emailVerified',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'emailVerificationToken',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'emailVerificationExpires',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'passwordResetToken',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'passwordResetExpires',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastLoginAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_email',
        columnNames: ['email'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_cpf',
        columnNames: ['cpf'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_cnpj',
        columnNames: ['cnpj'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_govbr_id',
        columnNames: ['govbrId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'idx_users_govbr_id');
    await queryRunner.dropIndex('users', 'idx_users_cnpj');
    await queryRunner.dropIndex('users', 'idx_users_cpf');
    await queryRunner.dropIndex('users', 'idx_users_email');
    await queryRunner.dropTable('users');
    await queryRunner.query(`DROP TYPE IF EXISTS "kyc_level_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}
