import {
  ARBITRATION_FEE_MAX,
  ARBITRATION_FEE_MIN,
  ESCROW_FEE_PERCENTAGE,
  LATE_PAYMENT_FINE_PERCENTAGE,
  LATE_PAYMENT_INTEREST_MONTHLY,
} from './constants';

/**
 * Generates a unique contract number in the format TAB-YYYYMMDD-XXXXX.
 * The 5-digit suffix is a random number to ensure uniqueness.
 */
export function generateContractNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `TAB-${year}${month}${day}-${random}`;
}

/**
 * Calculates late payment fees according to Brazilian CDC limits.
 * Fine: 2% flat on the principal amount.
 * Interest: 1% per month, pro-rated daily (month = 30 days).
 * Returns the fine, interest, and total (principal + fine + interest).
 */
export function calculateLateFee(
  amount: number,
  daysLate: number,
): { fine: number; interest: number; total: number } {
  if (daysLate <= 0) {
    return { fine: 0, interest: 0, total: amount };
  }

  const fine = amount * LATE_PAYMENT_FINE_PERCENTAGE;
  const dailyRate = LATE_PAYMENT_INTEREST_MONTHLY / 30;
  const interest = amount * dailyRate * daysLate;

  return {
    fine: Math.round(fine * 100) / 100,
    interest: Math.round(interest * 100) / 100,
    total: Math.round((amount + fine + interest) * 100) / 100,
  };
}

/**
 * Calculates the escrow service fee (1.5% of the amount).
 */
export function calculateEscrowFee(amount: number): number {
  return Math.round(amount * ESCROW_FEE_PERCENTAGE * 100) / 100;
}

/**
 * Calculates the arbitration fee based on the dispute value.
 * The fee is 5% of the dispute value, clamped between the minimum (R$150)
 * and maximum (R$2000) thresholds.
 */
export function calculateArbitrationFee(disputeValue: number): number {
  const fee = disputeValue * 0.05;
  const clamped = Math.max(ARBITRATION_FEE_MIN, Math.min(ARBITRATION_FEE_MAX, fee));
  return Math.round(clamped * 100) / 100;
}

/**
 * Formats a CPF string into the pattern XXX.XXX.XXX-XX.
 * Expects an 11-digit numeric string (digits only).
 */
export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formats a CNPJ string into the pattern XX.XXX.XXX/XXXX-XX.
 * Expects a 14-digit numeric string (digits only).
 */
export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  return digits.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    '$1.$2.$3/$4-$5',
  );
}

/**
 * Validates a CPF using the modulo 11 algorithm.
 * Returns true if the CPF is valid.
 */
export function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');

  if (digits.length !== 11) {
    return false;
  }

  // Reject known invalid sequences (all same digit)
  if (/^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) {
    remainder = 0;
  }
  if (remainder !== parseInt(digits.charAt(9), 10)) {
    return false;
  }

  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) {
    remainder = 0;
  }
  if (remainder !== parseInt(digits.charAt(10), 10)) {
    return false;
  }

  return true;
}

/**
 * Validates a CNPJ using the modulo 11 algorithm.
 * Returns true if the CNPJ is valid.
 */
export function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');

  if (digits.length !== 14) {
    return false;
  }

  // Reject known invalid sequences (all same digit)
  if (/^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  // Validate first check digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits.charAt(i), 10) * weights1[i]!;
  }
  let remainder = sum % 11;
  const firstCheck = remainder < 2 ? 0 : 11 - remainder;
  if (firstCheck !== parseInt(digits.charAt(12), 10)) {
    return false;
  }

  // Validate second check digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits.charAt(i), 10) * weights2[i]!;
  }
  remainder = sum % 11;
  const secondCheck = remainder < 2 ? 0 : 11 - remainder;
  if (secondCheck !== parseInt(digits.charAt(13), 10)) {
    return false;
  }

  return true;
}

/**
 * Formats a numeric value as Brazilian Real (BRL) currency.
 * Defaults to BRL if no currency is provided.
 */
export function formatCurrency(value: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Computes the SHA-256 hash of a document content string.
 * Returns the hash as a lowercase hexadecimal string.
 */
export async function hashDocument(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
