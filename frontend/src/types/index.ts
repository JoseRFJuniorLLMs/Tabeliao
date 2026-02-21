export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  cnpj?: string;
  avatar?: string;
  role: "user" | "admin" | "arbitrator";
  kycStatus: "pending" | "verified" | "rejected";
  plan: "free" | "pro" | "business";
  createdAt: string;
  updatedAt: string;
}

export interface Party {
  id: string;
  userId: string;
  name: string;
  email: string;
  cpf: string;
  role: "contractor" | "contractee" | "witness" | "guarantor";
  signedAt?: string;
  kycStatus: "pending" | "verified" | "rejected";
  avatar?: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  content: string;
  parties: Party[];
  value: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  signedAt?: string;
  blockchainHash?: string;
  blockchainNetwork?: string;
  aiReview?: ContractReview;
  payments: Payment[];
  documents: Document[];
  timeline: TimelineEvent[];
}

export type ContractType =
  | "rental"
  | "service"
  | "purchase"
  | "employment"
  | "nda"
  | "partnership"
  | "loan"
  | "custom";

export type ContractStatus =
  | "draft"
  | "pending_signature"
  | "active"
  | "completed"
  | "expired"
  | "cancelled"
  | "disputed";

export interface ContractReview {
  id: string;
  riskScore: number;
  issues: ReviewIssue[];
  suggestions: string[];
  legalReferences: LegalReference[];
  reviewedAt: string;
}

export interface ReviewIssue {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  clause?: string;
  suggestion?: string;
}

export interface LegalReference {
  code: string;
  article: string;
  description: string;
}

export interface Payment {
  id: string;
  contractId: string;
  contractTitle: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  dueDate: string;
  paidAt?: string;
  method?: "pix" | "boleto" | "credit_card" | "escrow";
  pixCode?: string;
  installment?: number;
  totalInstallments?: number;
}

export type PaymentStatus =
  | "pending"
  | "paid"
  | "overdue"
  | "in_escrow"
  | "released"
  | "refunded";

export interface Dispute {
  id: string;
  contractId: string;
  contractTitle: string;
  status: DisputeStatus;
  type: "breach" | "payment" | "quality" | "termination" | "other";
  description: string;
  value: number;
  openedAt: string;
  deadline: string;
  parties: Party[];
  messages: DisputeMessage[];
  evidence: Evidence[];
  aiAnalysis?: DisputeAnalysis;
  resolution?: Resolution;
}

export type DisputeStatus =
  | "opened"
  | "mediation"
  | "arbitration"
  | "resolved"
  | "closed";

export interface DisputeMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "party" | "arbitrator" | "system";
  content: string;
  createdAt: string;
}

export interface Evidence {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  size: number;
}

export interface DisputeAnalysis {
  riskLevel: "low" | "medium" | "high";
  summary: string;
  recommendation: string;
  legalBasis: string[];
  estimatedOutcome: string;
}

export interface Resolution {
  type: "agreement" | "arbitration_decision" | "dismissed";
  description: string;
  amount?: number;
  resolvedAt: string;
  resolvedBy: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedAt: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  actor?: string;
}

export interface Notification {
  id: string;
  type: "contract" | "payment" | "dispute" | "system";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  type: ContractType;
  icon: string;
  fields: TemplateField[];
}

export interface TemplateField {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea";
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface DashboardStats {
  totalContracts: number;
  activeContracts: number;
  pendingPayments: number;
  openDisputes: number;
  totalRevenue: number;
  contractsTrend: number;
  paymentsTrend: number;
  disputesTrend: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  contractPreview?: string;
}

export interface PricingPlan {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
}
