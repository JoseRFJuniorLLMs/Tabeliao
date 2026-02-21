import { EscrowMilestone, EscrowStatus } from '../entities/escrow.entity';

export interface EscrowResult {
  escrowId: string;
  contractId: string;
  blockchainAddress: string;
  depositorAddress: string;
  beneficiaryAddress: string;
  amount: number;
  currency: string;
  status: EscrowStatus;
  transactionHash: string;
  explorerUrl: string;
}

export interface EscrowStatusResult {
  escrowId: string;
  contractId: string;
  blockchainAddress: string | null;
  amount: number;
  currency: string;
  depositorAddress: string;
  beneficiaryAddress: string;
  status: EscrowStatus;
  depositTxHash: string | null;
  releaseTxHash: string | null;
  refundTxHash: string | null;
  freezeReason: string | null;
  milestones: EscrowMilestone[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReleaseResult {
  escrowId: string;
  transactionHash: string;
  amount: number;
  releasedTo: string;
  explorerUrl: string;
}

export interface RefundResult {
  escrowId: string;
  transactionHash: string;
  amount: number;
  refundedTo: string;
  reason: string;
  explorerUrl: string;
}

export interface EscrowParties {
  depositor: string;
  beneficiary: string;
}

export interface ReleaseConditions {
  type: 'MUTUAL_APPROVAL' | 'ORACLE' | 'TIMEOUT' | 'MILESTONE';
  timeoutSeconds?: number;
  oracleCondition?: {
    conditionType: string;
    params: Record<string, unknown>;
  };
  milestones?: {
    id: string;
    description: string;
    amount: number;
  }[];
}
