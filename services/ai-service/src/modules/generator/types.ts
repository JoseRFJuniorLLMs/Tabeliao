export interface GeneratedClause {
  /** Numero sequencial da clausula */
  number: number;
  /** Titulo da clausula */
  title: string;
  /** Conteudo completo da clausula */
  content: string;
  /** Base legal referenciada (ex: "Art. 421 do Codigo Civil") */
  legalBasis?: string;
}

export interface GeneratedContract {
  /** Titulo do contrato */
  title: string;
  /** Conteudo completo do contrato em texto formatado */
  content: string;
  /** Lista de clausulas estruturadas */
  clauses: GeneratedClause[];
  /** Partes envolvidas no contrato */
  parties: string[];
  /** Valor sugerido para o contrato (quando aplicavel) */
  suggestedValue?: string;
  /** Avisos e observacoes importantes */
  warnings: string[];
  /** Tipo do contrato gerado */
  contractType: string;
  /** Legislacao principal aplicavel */
  applicableLegislation: string[];
  /** Timestamp de geracao */
  generatedAt: string;
}

export interface GenerateContractResult {
  success: boolean;
  contract?: GeneratedContract;
  clarifyingQuestions?: string[];
  error?: string;
}

export interface RefineContractResult {
  success: boolean;
  contract?: GeneratedContract;
  changesApplied: string[];
  error?: string;
}
