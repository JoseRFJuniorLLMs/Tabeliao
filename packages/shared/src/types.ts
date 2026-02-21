import {
  ContractStatus,
  ContractType,
  DisputeStatus,
  KycLevel,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  RiskLevel,
  SignatureType,
  UserRole,
} from './enums';

export interface IUser {
  id: string;
  email: string;
  name: string;
  cpf: string;
  cnpj?: string;
  kycLevel: KycLevel;
  riskScore: number;
  govbrId?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContractParty {
  userId: string;
  role: 'CREATOR' | 'COUNTERPARTY' | 'WITNESS';
  signedAt?: Date;
  ipAddress?: string;
}

export interface IClause {
  id: string;
  title: string;
  content: string;
  isAbusive: boolean;
  riskLevel: RiskLevel;
  suggestion?: string;
}

export interface ISignature {
  userId: string;
  signedAt: Date;
  signatureHash: string;
  signatureType: SignatureType;
  govbrValidated: boolean;
}

export interface IPayment {
  id: string;
  contractId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  dueDate: Date;
  paidAt?: Date;
  installmentNumber?: number;
  escrowReleaseDate?: Date;
}

export interface IEvidence {
  id: string;
  type: string;
  url: string;
  description: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface IDispute {
  id: string;
  contractId: string;
  openedBy: string;
  status: DisputeStatus;
  description: string;
  evidence: IEvidence[];
  arbitratorId?: string;
  aiAnalysis?: string;
  resolution?: string;
  resolvedAt?: Date;
}

export interface IContract {
  id: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  content: string;
  parties: IContractParty[];
  clauses: IClause[];
  signatures: ISignature[];
  payments: IPayment[];
  blockchainHash?: string;
  blockchainTxId?: string;
  escrowId?: string;
  disputeId?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface IEscrow {
  id: string;
  contractId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  depositedAt?: Date;
  releasedAt?: Date;
  blockchainAddress?: string;
}

export interface INotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationType;
  sentAt: Date;
  readAt?: Date;
}

export interface ILawsuit {
  number: string;
  court: string;
  subject: string;
  status: string;
  value?: number;
}

export interface IKycResult {
  userId: string;
  serasaScore?: number;
  lawsuits: ILawsuit[];
  pepStatus: boolean;
  restrictions: string[];
  riskLevel: RiskLevel;
  checkedAt: Date;
}

export interface IAuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  ip: string;
  timestamp: Date;
}
