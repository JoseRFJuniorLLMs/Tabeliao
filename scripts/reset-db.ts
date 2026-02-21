import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

// Load root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Database reset script - drops all tables, recreates schema via synchronize,
 * and re-runs all seeds.
 *
 * WARNING: This is destructive! All data will be lost.
 *
 * Usage:
 *   npx ts-node scripts/reset-db.ts
 *   npm run db:reset
 */

// Import entities from all services
import { User } from '../services/auth-service/src/modules/users/user.entity';
import { Contract } from '../services/contract-service/src/modules/contracts/entities/contract.entity';
import { Signature } from '../services/contract-service/src/modules/contracts/entities/signature.entity';
import { ContractEvent } from '../services/contract-service/src/modules/contracts/entities/contract-event.entity';
import { Template } from '../services/contract-service/src/modules/templates/entities/template.entity';
import { EscrowAccount } from '../services/payment-service/src/modules/escrow/entities/escrow-account.entity';
import { Invoice } from '../services/payment-service/src/modules/billing/entities/invoice.entity';
import { Dispute } from '../services/dispute-service/src/modules/disputes/entities/dispute.entity';
import { DisputeMessage } from '../services/dispute-service/src/modules/disputes/entities/dispute-message.entity';
import { Arbitrator } from '../services/dispute-service/src/modules/arbitration/entities/arbitrator.entity';
import { ArbitratorRating } from '../services/dispute-service/src/modules/arbitration/entities/arbitrator-rating.entity';

interface DatabaseConfig {
  name: string;
  database: string;
  envKey: string;
  entities: Function[];
}

const DATABASE_CONFIGS: DatabaseConfig[] = [
  {
    name: 'auth',
    database: process.env['AUTH_DB_DATABASE'] ?? process.env['DB_DATABASE'] ?? 'tabeliao_auth',
    envKey: 'AUTH_DB_DATABASE',
    entities: [User],
  },
  {
    name: 'contracts',
    database: process.env['CONTRACT_DB_DATABASE'] ?? 'tabeliao_contracts',
    envKey: 'CONTRACT_DB_DATABASE',
    entities: [Contract, Signature, ContractEvent, Template],
  },
  {
    name: 'payments',
    database: process.env['PAYMENT_DB_DATABASE'] ?? 'tabeliao_payments',
    envKey: 'PAYMENT_DB_DATABASE',
    entities: [EscrowAccount, Invoice],
  },
  {
    name: 'disputes',
    database: process.env['DISPUTE_DB_DATABASE'] ?? 'tabeliao_disputes',
    envKey: 'DISPUTE_DB_DATABASE',
    entities: [Dispute, DisputeMessage, Arbitrator, ArbitratorRating],
  },
];

async function dropAndRecreate(config: DatabaseConfig): Promise<void> {
  console.log(`\n[${config.name}] Connecting to database: ${config.database}...`);

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    username: process.env['DB_USERNAME'] ?? 'tabeliao',
    password: process.env['DB_PASSWORD'] ?? 'tabeliao',
    database: config.database,
    entities: config.entities,
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log(`[${config.name}] Connected.`);

    // Drop all tables
    console.log(`[${config.name}] Dropping all tables...`);
    await dataSource.dropDatabase();
    console.log(`[${config.name}] All tables dropped.`);

    // Recreate schema using synchronize
    console.log(`[${config.name}] Recreating schema (synchronize)...`);
    await dataSource.synchronize();
    console.log(`[${config.name}] Schema recreated.`);
  } catch (error) {
    // If database doesn't exist, try to create it
    if (error instanceof Error && error.message.includes('does not exist')) {
      console.log(`[${config.name}] Database "${config.database}" does not exist. Attempting to create...`);
      await createDatabase(config.database);

      // Retry connection
      const retryDs = new DataSource({
        type: 'postgres',
        host: process.env['DB_HOST'] ?? 'localhost',
        port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
        username: process.env['DB_USERNAME'] ?? 'tabeliao',
        password: process.env['DB_PASSWORD'] ?? 'tabeliao',
        database: config.database,
        entities: config.entities,
        synchronize: true,
        logging: false,
      });

      await retryDs.initialize();
      console.log(`[${config.name}] Database created and schema synchronized.`);
      await retryDs.destroy();
      return;
    }

    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

async function createDatabase(dbName: string): Promise<void> {
  // Connect to the default 'postgres' database to create the target database
  const adminDs = new DataSource({
    type: 'postgres',
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    username: process.env['DB_USERNAME'] ?? 'tabeliao',
    password: process.env['DB_PASSWORD'] ?? 'tabeliao',
    database: 'postgres',
    logging: false,
  });

  try {
    await adminDs.initialize();
    // Use parameterized identifier escaping
    const safeName = dbName.replace(/[^a-zA-Z0-9_]/g, '');
    await adminDs.query(`CREATE DATABASE "${safeName}"`);
    console.log(`  Database "${safeName}" created.`);
  } finally {
    if (adminDs.isInitialized) {
      await adminDs.destroy();
    }
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('  TABELIAO - Database Reset');
  console.log('  WARNING: This will DROP ALL TABLES and reseed!');
  console.log('='.repeat(70));

  // Check for --force flag or CI environment
  const isForced = process.argv.includes('--force') || process.env['CI'] === 'true';

  if (!isForced) {
    console.log('\nThis action is DESTRUCTIVE. All data will be lost.');
    console.log('Run with --force flag to proceed without confirmation.');
    console.log('');
    console.log('  npx ts-node scripts/reset-db.ts --force');
    console.log('');

    // Simple stdin confirmation for interactive use
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('Type "RESET" to confirm: ', (ans) => {
        rl.close();
        resolve(ans);
      });
    });

    if (answer !== 'RESET') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  const startTime = Date.now();

  // Step 1: Drop and recreate all databases
  console.log('\n--- STEP 1: Drop and recreate schemas ---');

  for (const config of DATABASE_CONFIGS) {
    try {
      await dropAndRecreate(config);
    } catch (error) {
      console.error(`[${config.name}] Failed to reset:`, error);
      console.log(`[${config.name}] Continuing with remaining databases...`);
    }
  }

  // Step 2: Run all seeds
  console.log('\n--- STEP 2: Running seeds ---');

  try {
    const { seedAuth } = await import(
      '../services/auth-service/src/seeds/seed'
    );
    await seedAuth();
  } catch (error) {
    console.error('[auth-service] Seed failed:', error);
  }

  try {
    const { seedContracts } = await import(
      '../services/contract-service/src/seeds/seed'
    );
    await seedContracts();
  } catch (error) {
    console.error('[contract-service] Seed failed:', error);
  }

  try {
    const { seedPayments } = await import(
      '../services/payment-service/src/seeds/seed'
    );
    await seedPayments();
  } catch (error) {
    console.error('[payment-service] Seed failed:', error);
  }

  try {
    const { seedDisputes } = await import(
      '../services/dispute-service/src/seeds/seed'
    );
    await seedDisputes();
  } catch (error) {
    console.error('[dispute-service] Seed failed:', error);
  }

  const totalDuration = Date.now() - startTime;

  console.log('\n');
  console.log('='.repeat(70));
  console.log(`  Database reset completed in ${totalDuration}ms`);
  console.log('='.repeat(70));
  console.log('');
  console.log('Test credentials:');
  console.log('  Email:    admin@tabeliao.com.br');
  console.log('  Password: Tabeliao@2026');
  console.log('  Role:     ADMIN');
  console.log('');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error in reset-db:', err);
    process.exit(1);
  });
