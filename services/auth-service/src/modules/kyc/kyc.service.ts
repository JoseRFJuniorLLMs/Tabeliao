import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { UsersService } from '../users/users.service';
import { KycLevel } from '../users/user.entity';

export interface SerasaCheckResult {
  cpf: string;
  score: number;
  status: 'clean' | 'pending' | 'restricted';
  lastUpdated: string;
  restrictions: string[];
}

export interface LawsuitCheckResult {
  cpf: string;
  totalLawsuits: number;
  activeLawsuits: number;
  lawsuits: LawsuitEntry[];
}

export interface LawsuitEntry {
  caseNumber: string;
  court: string;
  type: string;
  status: 'active' | 'closed' | 'archived';
  filedAt: string;
  value?: number;
}

export interface PepCheckResult {
  cpf: string;
  isPep: boolean;
  category?: string;
  relatedEntities?: string[];
  lastChecked: string;
}

export interface KycCheckResults {
  serasa: SerasaCheckResult;
  lawsuits: LawsuitCheckResult;
  pep: PepCheckResult;
  cnpjCheck?: CnpjCheckResult;
}

export interface CnpjCheckResult {
  cnpj: string;
  companyName: string;
  status: 'active' | 'inactive' | 'suspended';
  registrationDate: string;
  mainActivity: string;
  partners: string[];
}

export interface RiskScoreBreakdown {
  serasaWeight: number;
  serasaScore: number;
  serasaWeighted: number;
  lawsuitsWeight: number;
  lawsuitsScore: number;
  lawsuitsWeighted: number;
  pepWeight: number;
  pepScore: number;
  pepWeighted: number;
  restrictionsWeight: number;
  restrictionsScore: number;
  restrictionsWeighted: number;
  totalScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface KycFullResult {
  cpf: string;
  cnpj?: string;
  checks: KycCheckResults;
  riskScore: RiskScoreBreakdown;
  recommendedKycLevel: KycLevel;
  checkedAt: string;
}

export interface RiskReport {
  userId: string;
  userName: string;
  cpf: string;
  currentKycLevel: KycLevel;
  currentRiskScore: number;
  riskLevel: string;
  summary: string;
  generatedAt: string;
}

const SERASA_WEIGHT = 0.4;
const LAWSUITS_WEIGHT = 0.3;
const PEP_WEIGHT = 0.2;
const RESTRICTIONS_WEIGHT = 0.1;

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  private readonly serasaApiUrl: string;
  private readonly serasaApiKey: string;
  private readonly lawsuitsApiUrl: string;
  private readonly lawsuitsApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    this.serasaApiUrl = this.configService.get<string>(
      'SERASA_API_URL',
      'https://api.serasa.com.br/v1',
    );
    this.serasaApiKey = this.configService.get<string>('SERASA_API_KEY', '');
    this.lawsuitsApiUrl = this.configService.get<string>(
      'LAWSUITS_API_URL',
      'https://api.tribunais.gov.br/v1',
    );
    this.lawsuitsApiKey = this.configService.get<string>('LAWSUITS_API_KEY', '');
  }

  async performFullKyc(cpf: string, cnpj?: string): Promise<KycFullResult> {
    const cleanedCpf = cpf.replace(/\D/g, '');
    const cleanedCnpj = cnpj ? cnpj.replace(/\D/g, '') : undefined;

    this.logger.log(`Starting full KYC check for CPF: ${this.maskCpf(cleanedCpf)}`);

    const [serasaResult, lawsuitsResult, pepResult] = await Promise.all([
      this.checkSerasa(cleanedCpf),
      this.checkLawsuits(cleanedCpf),
      this.checkPEP(cleanedCpf),
    ]);

    let cnpjCheck: CnpjCheckResult | undefined;
    if (cleanedCnpj) {
      cnpjCheck = await this.checkCnpj(cleanedCnpj);
    }

    const checks: KycCheckResults = {
      serasa: serasaResult,
      lawsuits: lawsuitsResult,
      pep: pepResult,
      cnpjCheck,
    };

    const riskScore = this.calculateRiskScore(checks);
    const recommendedKycLevel = this.determineKycLevel(riskScore.totalScore);

    this.logger.log(
      `KYC check complete for CPF ${this.maskCpf(cleanedCpf)}: risk=${riskScore.totalScore.toFixed(2)}, level=${riskScore.riskLevel}`,
    );

    return {
      cpf: cleanedCpf,
      cnpj: cleanedCnpj,
      checks,
      riskScore,
      recommendedKycLevel,
      checkedAt: new Date().toISOString(),
    };
  }

  async checkSerasa(cpf: string): Promise<SerasaCheckResult> {
    try {
      if (this.serasaApiKey) {
        const response = await axios.get<SerasaCheckResult>(
          `${this.serasaApiUrl}/credit-score/${cpf}`,
          {
            headers: {
              Authorization: `Bearer ${this.serasaApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          },
        );

        return response.data;
      }

      this.logger.warn('Serasa API key not configured, using simulated check');
      return this.simulateSerasaCheck(cpf);
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`Serasa check failed: ${axiosError.message}`);

      return this.simulateSerasaCheck(cpf);
    }
  }

  async checkLawsuits(cpf: string): Promise<LawsuitCheckResult> {
    try {
      if (this.lawsuitsApiKey) {
        const response = await axios.get<LawsuitCheckResult>(
          `${this.lawsuitsApiUrl}/lawsuits/person/${cpf}`,
          {
            headers: {
              Authorization: `Bearer ${this.lawsuitsApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          },
        );

        return response.data;
      }

      this.logger.warn('Lawsuits API key not configured, using simulated check');
      return this.simulateLawsuitsCheck(cpf);
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`Lawsuits check failed: ${axiosError.message}`);

      return this.simulateLawsuitsCheck(cpf);
    }
  }

  async checkPEP(cpf: string): Promise<PepCheckResult> {
    try {
      const pepApiUrl = this.configService.get<string>(
        'PEP_API_URL',
        'https://api.transparencia.gov.br/v1',
      );
      const pepApiKey = this.configService.get<string>('PEP_API_KEY', '');

      if (pepApiKey) {
        const response = await axios.get<PepCheckResult>(
          `${pepApiUrl}/pep/check/${cpf}`,
          {
            headers: {
              Authorization: `Bearer ${pepApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          },
        );

        return response.data;
      }

      this.logger.warn('PEP API key not configured, using simulated check');
      return this.simulatePepCheck(cpf);
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`PEP check failed: ${axiosError.message}`);

      return this.simulatePepCheck(cpf);
    }
  }

  calculateRiskScore(results: KycCheckResults): RiskScoreBreakdown {
    // Serasa score: 0-1000 mapped to 0-100 (higher is better)
    const serasaScore = Math.min(100, Math.max(0, results.serasa.score / 10));

    // Lawsuits score: penalize based on number of active lawsuits
    const maxLawsuitPenalty = 100;
    const lawsuitPenaltyPerCase = 15;
    const lawsuitsRaw = Math.min(
      maxLawsuitPenalty,
      results.lawsuits.activeLawsuits * lawsuitPenaltyPerCase,
    );
    const lawsuitsScore = 100 - lawsuitsRaw;

    // PEP score: binary - PEP is a significant risk factor
    const pepScore = results.pep.isPep ? 0 : 100;

    // Restrictions score: based on Serasa restrictions
    const maxRestrictionPenalty = 100;
    const restrictionPenaltyPerItem = 25;
    const restrictionsRaw = Math.min(
      maxRestrictionPenalty,
      results.serasa.restrictions.length * restrictionPenaltyPerItem,
    );
    const restrictionsScore = 100 - restrictionsRaw;

    // Weighted total (0-100, higher = lower risk)
    const serasaWeighted = serasaScore * SERASA_WEIGHT;
    const lawsuitsWeighted = lawsuitsScore * LAWSUITS_WEIGHT;
    const pepWeighted = pepScore * PEP_WEIGHT;
    const restrictionsWeighted = restrictionsScore * RESTRICTIONS_WEIGHT;

    const totalScore = serasaWeighted + lawsuitsWeighted + pepWeighted + restrictionsWeighted;

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (totalScore >= 75) {
      riskLevel = 'low';
    } else if (totalScore >= 50) {
      riskLevel = 'medium';
    } else if (totalScore >= 25) {
      riskLevel = 'high';
    } else {
      riskLevel = 'critical';
    }

    return {
      serasaWeight: SERASA_WEIGHT,
      serasaScore,
      serasaWeighted,
      lawsuitsWeight: LAWSUITS_WEIGHT,
      lawsuitsScore,
      lawsuitsWeighted,
      pepWeight: PEP_WEIGHT,
      pepScore,
      pepWeighted,
      restrictionsWeight: RESTRICTIONS_WEIGHT,
      restrictionsScore,
      restrictionsWeighted,
      totalScore,
      riskLevel,
    };
  }

  async generateRiskReport(userId: string): Promise<RiskReport> {
    const user = await this.usersService.findById(userId);

    const riskLevel = this.getRiskLevelFromScore(user.riskScore);

    let summary: string;
    switch (riskLevel) {
      case 'low':
        summary =
          'The user presents a low risk profile. Credit score is healthy, no significant lawsuits found, and no PEP associations detected. Recommended for standard operations.';
        break;
      case 'medium':
        summary =
          'The user presents a moderate risk profile. Some indicators require attention. Enhanced due diligence is recommended for high-value transactions.';
        break;
      case 'high':
        summary =
          'The user presents a high risk profile. Multiple risk indicators detected. Manual review is required before approving transactions. Enhanced monitoring recommended.';
        break;
      case 'critical':
        summary =
          'The user presents a critical risk profile. Significant risk indicators detected across multiple categories. Immediate manual review required. Transactions should be blocked pending review.';
        break;
      default:
        summary = 'Risk assessment pending. KYC check has not been performed yet.';
    }

    return {
      userId: user.id,
      userName: user.name,
      cpf: this.maskCpf(user.cpf),
      currentKycLevel: user.kycLevel,
      currentRiskScore: user.riskScore,
      riskLevel,
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  private determineKycLevel(riskScore: number): KycLevel {
    if (riskScore >= 80) return KycLevel.FULL;
    if (riskScore >= 60) return KycLevel.GOLD;
    if (riskScore >= 40) return KycLevel.SILVER;
    if (riskScore >= 20) return KycLevel.BRONZE;
    return KycLevel.BASIC;
  }

  private getRiskLevelFromScore(riskScore: number): string {
    if (riskScore >= 75) return 'low';
    if (riskScore >= 50) return 'medium';
    if (riskScore >= 25) return 'high';
    return 'critical';
  }

  private async checkCnpj(cnpj: string): Promise<CnpjCheckResult> {
    try {
      const receitaApiUrl = this.configService.get<string>(
        'RECEITA_API_URL',
        'https://api.receitaws.com.br/v1',
      );

      const response = await axios.get<{
        nome: string;
        situacao: string;
        abertura: string;
        atividade_principal: { text: string }[];
        qsa: { nome: string }[];
      }>(`${receitaApiUrl}/cnpj/${cnpj}`, {
        timeout: 15000,
      });

      const data = response.data;
      const statusMap: Record<string, 'active' | 'inactive' | 'suspended'> = {
        ATIVA: 'active',
        INATIVA: 'inactive',
        SUSPENSA: 'suspended',
      };

      return {
        cnpj,
        companyName: data.nome || 'Unknown',
        status: statusMap[data.situacao?.toUpperCase()] || 'inactive',
        registrationDate: data.abertura || '',
        mainActivity: data.atividade_principal?.[0]?.text || 'Unknown',
        partners: (data.qsa || []).map((partner) => partner.nome),
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`CNPJ check failed: ${axiosError.message}`);

      return {
        cnpj,
        companyName: 'Check failed',
        status: 'inactive',
        registrationDate: '',
        mainActivity: 'Unknown',
        partners: [],
      };
    }
  }

  private simulateSerasaCheck(cpf: string): SerasaCheckResult {
    const cpfSum = cpf.split('').reduce((sum, digit) => sum + parseInt(digit, 10), 0);
    const score = 400 + ((cpfSum * 37) % 600);

    return {
      cpf,
      score,
      status: score > 600 ? 'clean' : score > 400 ? 'pending' : 'restricted',
      lastUpdated: new Date().toISOString(),
      restrictions: score < 400 ? ['Negative record found'] : [],
    };
  }

  private simulateLawsuitsCheck(cpf: string): LawsuitCheckResult {
    const cpfLastDigit = parseInt(cpf.charAt(cpf.length - 1), 10);
    const hasLawsuits = cpfLastDigit < 3;

    const lawsuits: LawsuitEntry[] = hasLawsuits
      ? [
          {
            caseNumber: `0001234-56.2024.8.26.0100`,
            court: 'TJSP',
            type: 'civil',
            status: 'active',
            filedAt: '2024-03-15',
            value: 15000,
          },
        ]
      : [];

    return {
      cpf,
      totalLawsuits: lawsuits.length,
      activeLawsuits: lawsuits.filter((l) => l.status === 'active').length,
      lawsuits,
    };
  }

  private simulatePepCheck(cpf: string): PepCheckResult {
    const cpfFirstDigit = parseInt(cpf.charAt(0), 10);
    const isPep = cpfFirstDigit === 0;

    return {
      cpf,
      isPep,
      category: isPep ? 'Government Official' : undefined,
      relatedEntities: isPep ? ['Federal Government'] : undefined,
      lastChecked: new Date().toISOString(),
    };
  }

  private maskCpf(cpf: string): string {
    if (!cpf || cpf.length < 5) return '***';
    return `${cpf.substring(0, 3)}.***.***-${cpf.substring(cpf.length - 2)}`;
  }
}
