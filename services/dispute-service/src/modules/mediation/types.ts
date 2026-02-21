export interface AiAnalysisResult {
  summary: string;
  legalAssessment: string;
  factualFindings: string[];
  recommendedResolution: string;
  confidenceScore: number;
  reasoning: string;
  applicableLaws: ApplicableLaw[];
}

export interface ApplicableLaw {
  law: string;
  article: string;
  description: string;
  relevance: string;
}

export interface MediationProposal {
  proposalText: string;
  amount: number | null;
  deadline: string | null;
  conditions: string[];
  acceptedByPlaintiff: boolean;
  acceptedByDefendant: boolean;
}
