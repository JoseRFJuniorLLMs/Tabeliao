export const API_VERSIONS = {
  V1: 'v1',
} as const;

export const SERVICE_PORTS = {
  AUTH: 3001,
  CONTRACT: 3002,
  AI: 3003,
  BLOCKCHAIN: 3004,
  PAYMENT: 3005,
  NOTIFICATION: 3006,
  DISPUTE: 3007,
  GATEWAY: 3000,
  FRONTEND: 4000,
} as const;

/** Escrow fee: 1.5% of the escrowed amount */
export const ESCROW_FEE_PERCENTAGE = 0.015;

/** Minimum arbitration fee in BRL */
export const ARBITRATION_FEE_MIN = 150;

/** Maximum arbitration fee in BRL */
export const ARBITRATION_FEE_MAX = 2000;

/** Maximum dispute value eligible for AI-only arbitration (BRL) */
export const AI_ARBITRATION_MAX_VALUE = 5000;

/** Maximum contracts on the free plan */
export const MAX_CONTRACTS_FREE = 3;

/** Plan prices in centavos (BRL) */
export const PLAN_PRICES = {
  FREE: 0,
  PRO: 4900,
  BUSINESS_MIN: 19900,
  BUSINESS_MAX: 99900,
} as const;

/** Late payment fine: 2% (CDC limit) */
export const LATE_PAYMENT_FINE_PERCENTAGE = 0.02;

/** Late payment monthly interest: 1% */
export const LATE_PAYMENT_INTEREST_MONTHLY = 0.01;

/** Days before contract expiration to send renewal notices */
export const CONTRACT_RENEWAL_NOTICE_DAYS = [30, 15, 7, 1] as const;

/** Days before payment due date to send notices (0 = on due date) */
export const PAYMENT_DUE_NOTICE_DAYS = [7, 3, 1, 0] as const;

/** Maximum days allowed for arbitration resolution */
export const MAX_ARBITRATION_DAYS = 15;

/** Number of blockchain confirmations required */
export const BLOCKCHAIN_CONFIRMATIONS = 12;
