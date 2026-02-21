export type Severity = 'INFORMATIVO' | 'ATENCAO' | 'CRITICO';

export type RiskLevel = 'BAIXO' | 'MODERADO' | 'ALTO' | 'CRITICO';

export interface ReviewIssue {
  /** Numero da clausula onde o problema foi encontrado */
  clauseNumber: string;
  /** Texto da clausula problematica (trecho relevante) */
  clauseText: string;
  /** Tipo do problema identificado */
  issueType: string;
  /** Severidade do problema */
  severity: Severity;
  /** Descricao detalhada do problema */
  description: string;
  /** Base legal que fundamenta a analise */
  legalBasis: string;
  /** Sugestao de correcao para a clausula */
  suggestion: string;
}

export interface ReviewResult {
  /** ID unico da revisao */
  reviewId: string;
  /** Pontuacao geral de risco (0-100, onde 100 = risco maximo) */
  overallRisk: number;
  /** Nivel de risco categorizado */
  riskLevel: RiskLevel;
  /** Lista de problemas encontrados */
  issues: ReviewIssue[];
  /** Resumo geral da analise em linguagem acessivel */
  summary: string;
  /** Recomendacoes gerais */
  recommendations: string[];
  /** Total de clausulas analisadas */
  totalClausesAnalyzed: number;
  /** Data da revisao */
  reviewedAt: string;
}

export interface ReviewUploadResult {
  success: boolean;
  review?: ReviewResult;
  extractedText?: string;
  error?: string;
}
