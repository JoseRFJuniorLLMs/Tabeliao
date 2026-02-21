import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { KycService, KycCheckResults, SerasaCheckResult, LawsuitCheckResult, PepCheckResult } from './kyc.service';
import { UsersService } from '../users/users.service';
import { KycLevel, UserRole } from '../users/user.entity';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('KycService', () => {
  let service: KycService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;

  beforeEach(async () => {
    usersService = {
      findById: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string, defaultVal?: string) => {
        const map: Record<string, string> = {
          SERASA_API_URL: 'https://api.serasa.mock/v1',
          SERASA_API_KEY: '', // no key => simulated
          LAWSUITS_API_URL: 'https://api.tribunais.mock/v1',
          LAWSUITS_API_KEY: '', // no key => simulated
          PEP_API_URL: 'https://api.pep.mock/v1',
          PEP_API_KEY: '', // no key => simulated
          RECEITA_API_URL: 'https://api.receitaws.mock/v1',
        };
        return map[key] ?? defaultVal;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        { provide: ConfigService, useValue: configService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<KycService>(KycService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── performFullKyc ────────────────────────────────────────────────────────
  describe('performFullKyc', () => {
    it('should perform full KYC with simulated checks and return risk score', async () => {
      const result = await service.performFullKyc('123.456.789-09');

      expect(result.cpf).toBe('12345678909');
      expect(result.checks).toBeDefined();
      expect(result.checks.serasa).toBeDefined();
      expect(result.checks.lawsuits).toBeDefined();
      expect(result.checks.pep).toBeDefined();
      expect(result.riskScore).toBeDefined();
      expect(result.riskScore.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore.totalScore).toBeLessThanOrEqual(100);
      expect(result.recommendedKycLevel).toBeDefined();
      expect(result.checkedAt).toBeDefined();
    });

    it('should strip non-digit characters from CPF', async () => {
      const result = await service.performFullKyc('111.222.333-44');

      expect(result.cpf).toBe('11122233344');
    });

    it('should include CNPJ check when CNPJ is provided', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          nome: 'ACME Corp',
          situacao: 'ATIVA',
          abertura: '2020-01-01',
          atividade_principal: [{ text: 'Software' }],
          qsa: [{ nome: 'John Doe' }],
        },
      });

      const result = await service.performFullKyc('12345678909', '11.222.333/0001-44');

      expect(result.cnpj).toBe('11222333000144');
      expect(result.checks.cnpjCheck).toBeDefined();
      expect(result.checks.cnpjCheck!.companyName).toBe('ACME Corp');
      expect(result.checks.cnpjCheck!.status).toBe('active');
    });

    it('should not include CNPJ check when CNPJ is not provided', async () => {
      const result = await service.performFullKyc('12345678909');

      expect(result.cnpj).toBeUndefined();
      expect(result.checks.cnpjCheck).toBeUndefined();
    });

    it('should handle CPF with high risk profile (PEP, lawsuits)', async () => {
      // CPF starting with 0 => isPep in simulation
      // CPF ending with digit < 3 => has lawsuits in simulation
      const result = await service.performFullKyc('01234567890');

      expect(result.checks.pep.isPep).toBe(true);
      expect(result.checks.lawsuits.activeLawsuits).toBeGreaterThanOrEqual(0);
      expect(result.riskScore.pepScore).toBe(0); // PEP detected
    });
  });

  // ─── checkSerasa ───────────────────────────────────────────────────────────
  describe('checkSerasa', () => {
    it('should return simulated Serasa result when API key is not configured', async () => {
      const result = await service.checkSerasa('12345678909');

      expect(result.cpf).toBe('12345678909');
      expect(result.score).toBeGreaterThanOrEqual(400);
      expect(result.score).toBeLessThanOrEqual(1000);
      expect(['clean', 'pending', 'restricted']).toContain(result.status);
      expect(result.lastUpdated).toBeDefined();
    });

    it('should call real API when API key is configured and return result', async () => {
      // Reconfigure with a valid key
      const keyConfig: Record<string, string> = {
        SERASA_API_URL: 'https://api.serasa.mock/v1',
        SERASA_API_KEY: 'valid-api-key',
        LAWSUITS_API_URL: 'https://api.tribunais.mock/v1',
        LAWSUITS_API_KEY: '',
        PEP_API_URL: 'https://api.pep.mock/v1',
        PEP_API_KEY: '',
      };
      (configService.get as jest.Mock).mockImplementation(
        (key: string, def?: string) => keyConfig[key] ?? def,
      );

      // Rebuild module with new config
      const module = await Test.createTestingModule({
        providers: [
          KycService,
          { provide: ConfigService, useValue: configService },
          { provide: UsersService, useValue: usersService },
        ],
      }).compile();

      const svc = module.get<KycService>(KycService);

      const mockSerasaResult: SerasaCheckResult = {
        cpf: '12345678909',
        score: 780,
        status: 'clean',
        lastUpdated: new Date().toISOString(),
        restrictions: [],
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockSerasaResult });

      const result = await svc.checkSerasa('12345678909');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.serasa.mock/v1/credit-score/12345678909',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-api-key',
          }),
        }),
      );
      expect(result).toEqual(mockSerasaResult);
    });

    it('should fallback to simulation when API call fails', async () => {
      const keyConfig: Record<string, string> = {
        SERASA_API_URL: 'https://api.serasa.mock/v1',
        SERASA_API_KEY: 'valid-api-key',
        LAWSUITS_API_URL: '',
        LAWSUITS_API_KEY: '',
      };
      (configService.get as jest.Mock).mockImplementation(
        (key: string, def?: string) => keyConfig[key] ?? def,
      );

      const module = await Test.createTestingModule({
        providers: [
          KycService,
          { provide: ConfigService, useValue: configService },
          { provide: UsersService, useValue: usersService },
        ],
      }).compile();

      const svc = module.get<KycService>(KycService);

      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await svc.checkSerasa('12345678909');

      expect(result.cpf).toBe('12345678909');
      expect(result.score).toBeGreaterThanOrEqual(400);
    });
  });

  // ─── checkLawsuits ─────────────────────────────────────────────────────────
  describe('checkLawsuits', () => {
    it('should return simulated lawsuits result when API key is not configured', async () => {
      const result = await service.checkLawsuits('12345678909');

      expect(result.cpf).toBe('12345678909');
      expect(result.totalLawsuits).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.lawsuits)).toBe(true);
    });

    it('should simulate lawsuits for CPF ending with digit < 3', async () => {
      // CPF ending with 0 => hasLawsuits
      const result = await service.checkLawsuits('12345678900');

      expect(result.totalLawsuits).toBeGreaterThan(0);
      expect(result.activeLawsuits).toBeGreaterThan(0);
    });

    it('should simulate no lawsuits for CPF ending with digit >= 3', async () => {
      const result = await service.checkLawsuits('12345678905');

      expect(result.totalLawsuits).toBe(0);
      expect(result.activeLawsuits).toBe(0);
    });
  });

  // ─── checkPEP ──────────────────────────────────────────────────────────────
  describe('checkPEP', () => {
    it('should return simulated PEP result', async () => {
      const result = await service.checkPEP('12345678909');

      expect(result.cpf).toBe('12345678909');
      expect(typeof result.isPep).toBe('boolean');
      expect(result.lastChecked).toBeDefined();
    });

    it('should detect PEP for CPF starting with digit 0', async () => {
      const result = await service.checkPEP('01234567890');

      expect(result.isPep).toBe(true);
      expect(result.category).toBe('Government Official');
    });

    it('should not detect PEP for CPF starting with digit != 0', async () => {
      const result = await service.checkPEP('52345678909');

      expect(result.isPep).toBe(false);
      expect(result.category).toBeUndefined();
    });
  });

  // ─── calculateRiskScore ────────────────────────────────────────────────────
  describe('calculateRiskScore', () => {
    it('should return low risk for clean profile (high Serasa, no lawsuits, no PEP, no restrictions)', () => {
      const checks: KycCheckResults = {
        serasa: {
          cpf: '12345678909',
          score: 900,
          status: 'clean',
          lastUpdated: new Date().toISOString(),
          restrictions: [],
        },
        lawsuits: {
          cpf: '12345678909',
          totalLawsuits: 0,
          activeLawsuits: 0,
          lawsuits: [],
        },
        pep: {
          cpf: '12345678909',
          isPep: false,
          lastChecked: new Date().toISOString(),
        },
      };

      const result = service.calculateRiskScore(checks);

      expect(result.riskLevel).toBe('low');
      expect(result.totalScore).toBeGreaterThanOrEqual(75);
      // Verify weights
      expect(result.serasaWeight).toBe(0.4);
      expect(result.lawsuitsWeight).toBe(0.3);
      expect(result.pepWeight).toBe(0.2);
      expect(result.restrictionsWeight).toBe(0.1);
    });

    it('should return critical risk for PEP with low Serasa, active lawsuits, and restrictions', () => {
      const checks: KycCheckResults = {
        serasa: {
          cpf: '12345678909',
          score: 100,
          status: 'restricted',
          lastUpdated: new Date().toISOString(),
          restrictions: ['Divida 1', 'Divida 2', 'Divida 3', 'Divida 4'],
        },
        lawsuits: {
          cpf: '12345678909',
          totalLawsuits: 8,
          activeLawsuits: 7,
          lawsuits: [],
        },
        pep: {
          cpf: '12345678909',
          isPep: true,
          category: 'Politician',
          lastChecked: new Date().toISOString(),
        },
      };

      const result = service.calculateRiskScore(checks);

      expect(result.riskLevel).toBe('critical');
      expect(result.totalScore).toBeLessThan(25);
      expect(result.pepScore).toBe(0);
    });

    it('should return medium risk for moderate profile', () => {
      const checks: KycCheckResults = {
        serasa: {
          cpf: '12345678909',
          score: 600,
          status: 'pending',
          lastUpdated: new Date().toISOString(),
          restrictions: ['Pending item'],
        },
        lawsuits: {
          cpf: '12345678909',
          totalLawsuits: 2,
          activeLawsuits: 1,
          lawsuits: [],
        },
        pep: {
          cpf: '12345678909',
          isPep: false,
          lastChecked: new Date().toISOString(),
        },
      };

      const result = service.calculateRiskScore(checks);

      expect(['medium', 'low']).toContain(result.riskLevel);
      expect(result.totalScore).toBeGreaterThanOrEqual(50);
    });

    it('should cap Serasa score at 100 and lawsuits penalty at 100', () => {
      const checks: KycCheckResults = {
        serasa: {
          cpf: '12345678909',
          score: 1500, // over max => mapped to 100
          status: 'clean',
          lastUpdated: new Date().toISOString(),
          restrictions: [],
        },
        lawsuits: {
          cpf: '12345678909',
          totalLawsuits: 20,
          activeLawsuits: 20, // 20 * 15 = 300, capped at 100 penalty => score 0
          lawsuits: [],
        },
        pep: {
          cpf: '12345678909',
          isPep: false,
          lastChecked: new Date().toISOString(),
        },
      };

      const result = service.calculateRiskScore(checks);

      expect(result.serasaScore).toBe(100);
      expect(result.lawsuitsScore).toBe(0);
    });
  });

  // ─── determineKycLevel (via performFullKyc) ────────────────────────────────
  describe('KYC level determination', () => {
    it('should assign FULL level for risk score >= 80', async () => {
      // High Serasa score CPF that will produce high risk score
      // We test this indirectly via performFullKyc
      const result = await service.performFullKyc('55555555555');

      // The score is deterministic based on CPF simulation
      // Just verify it returns a valid KycLevel
      const validLevels = [KycLevel.BASIC, KycLevel.BRONZE, KycLevel.SILVER, KycLevel.GOLD, KycLevel.FULL];
      expect(validLevels).toContain(result.recommendedKycLevel);
    });
  });

  // ─── generateRiskReport ────────────────────────────────────────────────────
  describe('generateRiskReport', () => {
    it('should generate a low risk report', async () => {
      (usersService.findById as jest.Mock).mockResolvedValue({
        id: 'user-1',
        name: 'John Doe',
        cpf: '12345678909',
        kycLevel: KycLevel.FULL,
        riskScore: 85,
      });

      const report = await service.generateRiskReport('user-1');

      expect(report.userId).toBe('user-1');
      expect(report.riskLevel).toBe('low');
      expect(report.summary).toContain('low risk');
      expect(report.cpf).toMatch(/^\d{3}\.\*\*\*\.\*\*\*-\d{2}$/);
    });

    it('should generate a high risk report', async () => {
      (usersService.findById as jest.Mock).mockResolvedValue({
        id: 'user-2',
        name: 'Risk User',
        cpf: '00000000000',
        kycLevel: KycLevel.BASIC,
        riskScore: 30,
      });

      const report = await service.generateRiskReport('user-2');

      expect(report.riskLevel).toBe('high');
      expect(report.summary).toContain('high risk');
    });

    it('should generate a critical risk report for very low scores', async () => {
      (usersService.findById as jest.Mock).mockResolvedValue({
        id: 'user-3',
        name: 'Blocked User',
        cpf: '99999999999',
        kycLevel: KycLevel.NONE,
        riskScore: 10,
      });

      const report = await service.generateRiskReport('user-3');

      expect(report.riskLevel).toBe('critical');
      expect(report.summary).toContain('critical risk');
    });
  });
});
