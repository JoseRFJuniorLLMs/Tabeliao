import { ContractType, PaymentMethod } from './enums';

/**
 * DTO for creating a new contract.
 * Validation: title is required, type must be a valid ContractType,
 * parties must have at least 2 entries.
 */
export class CreateContractDto {
  title!: string;
  type!: ContractType;
  description?: string;
  parties!: { userId: string; role: 'CREATOR' | 'COUNTERPARTY' | 'WITNESS' }[];
  templateId?: string;
}

/**
 * DTO for updating an existing contract.
 * All fields are optional (partial update).
 */
export class UpdateContractDto {
  title?: string;
  type?: ContractType;
  description?: string;
  parties?: { userId: string; role: 'CREATOR' | 'COUNTERPARTY' | 'WITNESS' }[];
  templateId?: string;
}

/**
 * DTO for creating a new user account.
 * Validation: email must be valid, password min 8 chars,
 * cpf must pass modulo 11 validation.
 */
export class CreateUserDto {
  email!: string;
  password!: string;
  name!: string;
  cpf!: string;
  cnpj?: string;
}

/**
 * DTO for user authentication.
 * Validation: email and password required,
 * totpCode required when 2FA is enabled.
 */
export class LoginDto {
  email!: string;
  password!: string;
  totpCode?: string;
}

/**
 * DTO for opening a dispute on a contract.
 * Validation: contractId and description are required,
 * evidence is optional array of file references.
 */
export class CreateDisputeDto {
  contractId!: string;
  description!: string;
  evidence?: { type: string; url: string; description: string }[];
}

/**
 * DTO for creating a payment for a contract.
 * Validation: amount must be positive, method must be valid,
 * installments must be >= 1 when provided.
 */
export class CreatePaymentDto {
  contractId!: string;
  amount!: number;
  method!: PaymentMethod;
  dueDate!: string;
  installments?: number;
}

/**
 * DTO for AI-powered contract generation.
 * Validation: prompt min 20 chars, type must be valid,
 * language fixed to pt-BR.
 */
export class GenerateContractDto {
  prompt!: string;
  type!: ContractType;
  language: 'pt-BR' = 'pt-BR';
}

/**
 * DTO for AI-powered contract review and clause analysis.
 * Validation: content min 100 chars, type is optional for context.
 */
export class ReviewContractDto {
  content!: string;
  type?: ContractType;
}

/**
 * DTO for running a KYC (Know Your Customer) check.
 * Validation: cpf must pass modulo 11, cnpj optional.
 */
export class KycCheckDto {
  cpf!: string;
  cnpj?: string;
}
