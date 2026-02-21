export interface RegistrationResult {
  contractId: string;
  contentHash: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  registeredBy: string;
  explorerUrl: string;
  status: 'CONFIRMED' | 'PENDING' | 'FAILED';
}

export interface VerificationResult {
  contractId: string;
  contentHash: string;
  isVerified: boolean;
  registeredAt: number | null;
  blockNumber: number | null;
  registeredBy: string | null;
  message: string;
}
