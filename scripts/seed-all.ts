import * as path from 'path';
import * as dotenv from 'dotenv';

// Load root .env first as fallback
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Master seed script - populates all service databases with realistic test data.
 *
 * Execution order matters because of cross-service data references:
 *   1. auth-service   (users - referenced by all other services)
 *   2. contract-service (contracts - referenced by payments and disputes)
 *   3. payment-service  (escrows/invoices - references contracts and users)
 *   4. dispute-service  (disputes - references contracts and users)
 *
 * Usage:
 *   npx ts-node scripts/seed-all.ts
 *   npm run seed
 */

interface SeedStep {
  name: string;
  run: () => Promise<void>;
}

async function loadSeedModules(): Promise<SeedStep[]> {
  // Dynamic imports to allow each seed to load its own .env
  const { seedAuth } = await import(
    '../services/auth-service/src/seeds/seed'
  );
  const { seedContracts } = await import(
    '../services/contract-service/src/seeds/seed'
  );
  const { seedPayments } = await import(
    '../services/payment-service/src/seeds/seed'
  );
  const { seedDisputes } = await import(
    '../services/dispute-service/src/seeds/seed'
  );

  return [
    { name: 'auth-service', run: seedAuth },
    { name: 'contract-service', run: seedContracts },
    { name: 'payment-service', run: seedPayments },
    { name: 'dispute-service', run: seedDisputes },
  ];
}

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('  TABELIAO - Database Seed');
  console.log('  Populating all databases with realistic test data');
  console.log('='.repeat(70));
  console.log('');

  const startTime = Date.now();
  const steps = await loadSeedModules();
  const results: { name: string; success: boolean; error?: unknown; durationMs: number }[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const stepStart = Date.now();

    console.log(`\n[${ i + 1}/${steps.length}] Seeding ${step.name}...`);
    console.log('-'.repeat(50));

    try {
      await step.run();
      const durationMs = Date.now() - stepStart;
      results.push({ name: step.name, success: true, durationMs });
      console.log(`[${step.name}] Completed in ${durationMs}ms`);
    } catch (error) {
      const durationMs = Date.now() - stepStart;
      results.push({ name: step.name, success: false, error, durationMs });
      console.error(`[${step.name}] FAILED after ${durationMs}ms:`, error);

      // Continue with remaining seeds even if one fails
      console.log(`[${step.name}] Continuing with remaining seeds...`);
    }
  }

  // Summary
  const totalDuration = Date.now() - startTime;
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log('\n');
  console.log('='.repeat(70));
  console.log('  SEED SUMMARY');
  console.log('='.repeat(70));
  console.log('');

  for (const result of results) {
    const icon = result.success ? '[OK]' : '[FAIL]';
    console.log(`  ${icon} ${result.name.padEnd(25)} ${result.durationMs}ms`);
    if (!result.success && result.error instanceof Error) {
      console.log(`       Error: ${result.error.message}`);
    }
  }

  console.log('');
  console.log(`  Total: ${succeeded} succeeded, ${failed} failed`);
  console.log(`  Duration: ${totalDuration}ms`);
  console.log('='.repeat(70));

  if (failed > 0) {
    console.log('\nSome seeds failed. Check the output above for details.');
    process.exit(1);
  }

  console.log('\nAll seeds completed successfully!');
  console.log('');
  console.log('Test credentials:');
  console.log('  Email:    admin@tabeliao.com.br');
  console.log('  Password: Tabeliao@2026');
  console.log('  Role:     ADMIN');
  console.log('');
  console.log('See individual seed files for all test user credentials.');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error in seed-all:', err);
    process.exit(1);
  });
