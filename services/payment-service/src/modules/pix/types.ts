/** PIX payment method types */
export enum PaymentMethod {
  PIX = 'PIX',
  BOLETO = 'BOLETO',
  TRANSFER = 'TRANSFER',
}

/** PIX charge status from PSP */
export enum PixChargeStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  REMOVED_BY_RECEIVER = 'REMOVED_BY_RECEIVER',
  REMOVED_BY_PSP = 'REMOVED_BY_PSP',
  EXPIRED = 'EXPIRED',
}

/** PIX refund status */
export enum PixRefundStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

/** Result of generating a PIX charge (Copia e Cola + QR Code) */
export interface PixCharge {
  /** PIX Copia e Cola string */
  pixCode: string;
  /** QR Code image as base64-encoded PNG */
  qrCodeBase64: string;
  /** Transaction ID (txid) assigned by PSP */
  txid: string;
  /** Charge creation timestamp */
  createdAt: Date;
  /** Charge expiration timestamp */
  expiresAt: Date;
  /** Amount in BRL (centavos precision) */
  amount: number;
  /** Human-readable description */
  description: string;
}

/** Status check result for a PIX charge */
export interface PixStatus {
  /** Transaction ID */
  txid: string;
  /** Current status */
  status: PixChargeStatus;
  /** Amount charged in BRL */
  amount: number;
  /** Payer name (from endToEndId resolution) */
  payerName: string | null;
  /** Payer CPF/CNPJ */
  payerDocument: string | null;
  /** End-to-end ID (provided by BACEN on settlement) */
  endToEndId: string | null;
  /** Payment timestamp (null if not yet paid) */
  paidAt: Date | null;
  /** Refunded amount (partial or full) */
  refundedAmount: number;
}

/** PIX refund result */
export interface PixRefund {
  /** Refund ID from PSP */
  refundId: string;
  /** Original transaction ID */
  txid: string;
  /** Refunded amount in BRL */
  amount: number;
  /** Refund status */
  status: PixRefundStatus;
  /** Refund request timestamp */
  requestedAt: Date;
  /** Refund settlement timestamp */
  settledAt: Date | null;
}

/** Boleto generation result */
export interface BoletoResult {
  /** Boleto unique ID */
  boletoId: string;
  /** Digitavel line (codigo de barras numerico) */
  boletoCode: string;
  /** Barcode representation */
  barcode: string;
  /** URL to view/download the boleto PDF */
  boletoUrl: string;
  /** Amount in BRL */
  amount: number;
  /** Due date */
  dueDate: Date;
  /** Payer data */
  payerName: string;
  /** Payer CPF/CNPJ */
  payerDocument: string;
  /** Description */
  description: string;
}

/** Split payment entry */
export interface SplitEntry {
  /** Receiving user ID */
  userId: string;
  /** Percentage of payment (0-100) */
  percentage: number;
  /** Calculated amount in BRL */
  amount: number;
}

/** Result of a split payment operation */
export interface SplitResult {
  /** Invoice ID that was split */
  invoiceId: string;
  /** Total amount that was split */
  totalAmount: number;
  /** Individual split entries */
  splits: SplitEntry[];
  /** Whether the split was successfully registered with PSP */
  registeredWithPsp: boolean;
  /** Timestamp */
  createdAt: Date;
}

/** Deposit result for escrow */
export interface DepositResult {
  /** Escrow account ID */
  escrowId: string;
  /** Deposit amount */
  amount: number;
  /** Payment method used */
  paymentMethod: PaymentMethod;
  /** PIX data if payment method is PIX */
  pix?: PixCharge;
  /** Boleto data if payment method is BOLETO */
  boleto?: BoletoResult;
  /** Deposit status */
  status: 'PENDING' | 'CONFIRMED';
}

/** Escrow release result */
export interface ReleaseResult {
  /** Escrow account ID */
  escrowId: string;
  /** Amount released */
  amountReleased: number;
  /** Remaining escrow balance */
  remainingBalance: number;
  /** Transfer transaction ID */
  transferTxId: string;
  /** Beneficiary ID who received funds */
  beneficiaryId: string;
  /** Milestone label (for partial releases) */
  milestone?: string;
  /** Timestamp */
  releasedAt: Date;
}

/** Escrow refund result */
export interface RefundResult {
  /** Escrow account ID */
  escrowId: string;
  /** Amount refunded */
  amountRefunded: number;
  /** Refund reason */
  reason: string;
  /** Depositor ID who received the refund */
  depositorId: string;
  /** Transaction ID of the refund transfer */
  refundTxId: string;
  /** Timestamp */
  refundedAt: Date;
}

/** PSP OAuth2 token response */
export interface PspTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/** PIX webhook payload from PSP */
export interface PixWebhookPayload {
  pix: Array<{
    endToEndId: string;
    txid: string;
    chave: string;
    valor: string;
    horario: string;
    infoPagador?: string;
    devolucoes?: Array<{
      id: string;
      rtrId: string;
      valor: string;
      horario: {
        solicitacao: string;
        liquidacao?: string;
      };
      status: string;
    }>;
  }>;
}
