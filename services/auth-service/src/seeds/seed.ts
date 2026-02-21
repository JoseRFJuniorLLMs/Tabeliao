import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole, KycLevel } from '../modules/users/user.entity';

// Load .env from the auth-service directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Fallback: load from root .env if service .env not found
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const SALT_ROUNDS = 12;
const DEFAULT_PASSWORD = 'Tabeliao@2026';

interface SeedUser {
  id: string;
  email: string;
  password: string;
  name: string;
  cpf: string;
  cnpj: string | null;
  phone: string | null;
  kycLevel: KycLevel;
  riskScore: number;
  govbrId: string | null;
  role: UserRole;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  lastLoginAt: Date | null;
}

// Fixed UUIDs for cross-service referencing
export const USER_IDS = {
  admin: 'a0000000-0000-4000-8000-000000000001',
  maria: 'a0000000-0000-4000-8000-000000000002',
  joao: 'a0000000-0000-4000-8000-000000000003',
  ana: 'a0000000-0000-4000-8000-000000000004',
  carlos: 'a0000000-0000-4000-8000-000000000005',
  fernanda: 'a0000000-0000-4000-8000-000000000006',
  techCorp: 'a0000000-0000-4000-8000-000000000007',
  arbitratorDrPaulo: 'a0000000-0000-4000-8000-000000000008',
  arbitratorDraLucia: 'a0000000-0000-4000-8000-000000000009',
  arbitratorDrRoberto: 'a0000000-0000-4000-8000-00000000000a',
};

async function buildSeedUsers(hashedPassword: string): Promise<SeedUser[]> {
  return [
    // 1. Admin user
    {
      id: USER_IDS.admin,
      email: 'admin@tabeliao.com.br',
      password: hashedPassword,
      name: 'Administrador Tabeliao',
      cpf: '00000000000',
      cnpj: null,
      phone: '+5511999990000',
      kycLevel: KycLevel.FULL,
      riskScore: 0,
      govbrId: 'govbr-admin-001',
      role: UserRole.ADMIN,
      twoFactorEnabled: true,
      emailVerified: true,
      lastLoginAt: new Date('2026-02-20T14:30:00Z'),
    },
    // 2. Regular user - Maria Silva (FULL KYC, active)
    {
      id: USER_IDS.maria,
      email: 'maria.silva@email.com',
      password: hashedPassword,
      name: 'Maria Aparecida da Silva',
      cpf: '52998224725',
      cnpj: null,
      phone: '+5511987654321',
      kycLevel: KycLevel.FULL,
      riskScore: 0.05,
      govbrId: 'govbr-maria-002',
      role: UserRole.USER,
      twoFactorEnabled: true,
      emailVerified: true,
      lastLoginAt: new Date('2026-02-19T10:15:00Z'),
    },
    // 3. Regular user - Joao Santos (SILVER KYC)
    {
      id: USER_IDS.joao,
      email: 'joao.santos@email.com',
      password: hashedPassword,
      name: 'Joao Pedro dos Santos',
      cpf: '71428793860',
      cnpj: null,
      phone: '+5521976543210',
      kycLevel: KycLevel.SILVER,
      riskScore: 0.12,
      govbrId: 'govbr-joao-003',
      role: UserRole.USER,
      twoFactorEnabled: false,
      emailVerified: true,
      lastLoginAt: new Date('2026-02-18T08:00:00Z'),
    },
    // 4. Regular user - Ana Oliveira (BASIC KYC, new user)
    {
      id: USER_IDS.ana,
      email: 'ana.oliveira@email.com',
      password: hashedPassword,
      name: 'Ana Carolina Oliveira',
      cpf: '83056471520',
      cnpj: null,
      phone: '+5531965432109',
      kycLevel: KycLevel.BASIC,
      riskScore: 0.3,
      govbrId: null,
      role: UserRole.USER,
      twoFactorEnabled: false,
      emailVerified: true,
      lastLoginAt: new Date('2026-02-17T16:45:00Z'),
    },
    // 5. Regular user - Carlos Ferreira (BRONZE KYC)
    {
      id: USER_IDS.carlos,
      email: 'carlos.ferreira@email.com',
      password: hashedPassword,
      name: 'Carlos Eduardo Ferreira',
      cpf: '64209138745',
      cnpj: null,
      phone: '+5541954321098',
      kycLevel: KycLevel.BRONZE,
      riskScore: 0.18,
      govbrId: null,
      role: UserRole.USER,
      twoFactorEnabled: false,
      emailVerified: false,
      lastLoginAt: null,
    },
    // 6. Regular user - Fernanda Costa (NONE KYC, freshly registered)
    {
      id: USER_IDS.fernanda,
      email: 'fernanda.costa@email.com',
      password: hashedPassword,
      name: 'Fernanda Beatriz Costa',
      cpf: '95137284601',
      cnpj: null,
      phone: '+5551943210987',
      kycLevel: KycLevel.NONE,
      riskScore: 0.5,
      govbrId: null,
      role: UserRole.USER,
      twoFactorEnabled: false,
      emailVerified: false,
      lastLoginAt: null,
    },
    // 7. Business user - TechCorp Solucoes (with CNPJ)
    {
      id: USER_IDS.techCorp,
      email: 'contato@techcorp.com.br',
      password: hashedPassword,
      name: 'TechCorp Solucoes Digitais Ltda',
      cpf: '38274619504',
      cnpj: '12345678000195',
      phone: '+5511932109876',
      kycLevel: KycLevel.GOLD,
      riskScore: 0.08,
      govbrId: 'govbr-techcorp-007',
      role: UserRole.USER,
      twoFactorEnabled: true,
      emailVerified: true,
      lastLoginAt: new Date('2026-02-20T09:00:00Z'),
    },
    // 8. Arbitrator - Dr. Paulo Mendes
    {
      id: USER_IDS.arbitratorDrPaulo,
      email: 'dr.paulo.mendes@oab-sp.org.br',
      password: hashedPassword,
      name: 'Dr. Paulo Ricardo Mendes',
      cpf: '15926374800',
      cnpj: null,
      phone: '+5511991234567',
      kycLevel: KycLevel.FULL,
      riskScore: 0,
      govbrId: 'govbr-paulo-008',
      role: UserRole.NOTARY,
      twoFactorEnabled: true,
      emailVerified: true,
      lastLoginAt: new Date('2026-02-19T14:00:00Z'),
    },
    // 9. Arbitrator - Dra. Lucia Barbosa
    {
      id: USER_IDS.arbitratorDraLucia,
      email: 'dra.lucia.barbosa@oab-rj.org.br',
      password: hashedPassword,
      name: 'Dra. Lucia Helena Barbosa',
      cpf: '26837415900',
      cnpj: null,
      phone: '+5521992345678',
      kycLevel: KycLevel.FULL,
      riskScore: 0,
      govbrId: 'govbr-lucia-009',
      role: UserRole.NOTARY,
      twoFactorEnabled: true,
      emailVerified: true,
      lastLoginAt: new Date('2026-02-18T11:30:00Z'),
    },
    // 10. Arbitrator - Dr. Roberto Almeida
    {
      id: USER_IDS.arbitratorDrRoberto,
      email: 'dr.roberto.almeida@oab-mg.org.br',
      password: hashedPassword,
      name: 'Dr. Roberto de Almeida Neto',
      cpf: '37948526100',
      cnpj: null,
      phone: '+5531993456789',
      kycLevel: KycLevel.FULL,
      riskScore: 0,
      govbrId: 'govbr-roberto-010',
      role: UserRole.NOTARY,
      twoFactorEnabled: true,
      emailVerified: true,
      lastLoginAt: new Date('2026-02-20T10:00:00Z'),
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
    database: process.env['DB_DATABASE'] ?? 'tabeliao_auth',
    entities: [User],
    synchronize: true,
    logging: false,
  });
}

export async function seedAuth(): Promise<void> {
  console.log('[auth-service] Starting seed...');
  const dataSource = createDataSource();

  try {
    await dataSource.initialize();
    console.log('[auth-service] Database connected.');

    const userRepo = dataSource.getRepository(User);

    // Check if already seeded
    const existingAdmin = await userRepo.findOne({
      where: { email: 'admin@tabeliao.com.br' },
    });

    if (existingAdmin) {
      console.log('[auth-service] Seed data already exists. Clearing and re-seeding...');
      await userRepo.delete({});
    }

    // Hash password once for all users
    console.log('[auth-service] Hashing passwords...');
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

    // Build seed data
    const seedUsers = await buildSeedUsers(hashedPassword);

    // Insert users
    console.log(`[auth-service] Inserting ${seedUsers.length} users...`);

    for (const userData of seedUsers) {
      const user = userRepo.create({
        id: userData.id,
        email: userData.email,
        password: userData.password,
        name: userData.name,
        cpf: userData.cpf,
        cnpj: userData.cnpj,
        phone: userData.phone,
        kycLevel: userData.kycLevel,
        riskScore: userData.riskScore,
        govbrId: userData.govbrId,
        role: userData.role,
        twoFactorSecret: null,
        twoFactorEnabled: userData.twoFactorEnabled,
        emailVerified: userData.emailVerified,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        lastLoginAt: userData.lastLoginAt,
      });

      await userRepo.save(user);
      console.log(`  - Created user: ${userData.name} (${userData.email}) [${userData.role}/${userData.kycLevel}]`);
    }

    console.log(`[auth-service] Seed completed. ${seedUsers.length} users created.`);
  } catch (error) {
    console.error('[auth-service] Seed failed:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

// Allow running directly with ts-node
if (require.main === module) {
  seedAuth()
    .then(() => {
      console.log('[auth-service] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[auth-service] Fatal error:', err);
      process.exit(1);
    });
}
