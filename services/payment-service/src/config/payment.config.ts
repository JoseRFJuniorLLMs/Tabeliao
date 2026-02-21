import { registerAs } from '@nestjs/config';

export interface PaymentProviderConfig {
  /** PSP (Payment Service Provider) base URL */
  pspBaseUrl: string;
  /** PSP Client ID for OAuth2 */
  pspClientId: string;
  /** PSP Client Secret for OAuth2 */
  pspClientSecret: string;
  /** PSP Certificate path (mTLS for PIX) */
  pspCertPath: string;
  /** PSP Certificate key path */
  pspCertKeyPath: string;
  /** Webhook URL for receiving payment notifications */
  webhookUrl: string;
  /** PIX key registered with the PSP (e.g. CNPJ, email, phone, EVP) */
  pixKey: string;
  /** PIX key type */
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'evp';
}

export interface FeeConfig {
  /** Platform escrow fee percentage (e.g. 1.5 = 1.5%) */
  escrowFeePercent: number;
  /** PIX transaction fee in BRL (fixed) */
  pixTransactionFee: number;
  /** Boleto generation fee in BRL (fixed) */
  boletoGenerationFee: number;
  /** Late payment fine percentage (multa CDC: 2%) */
  latePaymentFinePercent: number;
  /** Monthly interest rate for late payments (juros CDC: 1% a.m.) */
  latePaymentMonthlyInterestPercent: number;
}

export interface PaymentConfig {
  provider: PaymentProviderConfig;
  fees: FeeConfig;
  /** Default PIX charge expiration in seconds (e.g. 3600 = 1 hour) */
  pixDefaultExpirationSeconds: number;
  /** Default boleto days until expiration */
  boletoDefaultExpirationDays: number;
  /** Maximum number of installments allowed */
  maxInstallments: number;
  /** Minimum installment amount in BRL */
  minInstallmentAmount: number;
  /** Open Finance redirect URI */
  openFinanceRedirectUri: string;
}

export default registerAs('payment', (): PaymentConfig => ({
  provider: {
    pspBaseUrl: process.env['PSP_BASE_URL'] ?? 'https://pix.api.efipay.com.br',
    pspClientId: process.env['PSP_CLIENT_ID'] ?? '',
    pspClientSecret: process.env['PSP_CLIENT_SECRET'] ?? '',
    pspCertPath: process.env['PSP_CERT_PATH'] ?? './certs/psp-cert.pem',
    pspCertKeyPath: process.env['PSP_CERT_KEY_PATH'] ?? './certs/psp-key.pem',
    webhookUrl: process.env['PSP_WEBHOOK_URL'] ?? 'https://api.tabeliao.com.br/api/v1/payments/pix/webhook',
    pixKey: process.env['PIX_KEY'] ?? '',
    pixKeyType: (process.env['PIX_KEY_TYPE'] as PaymentProviderConfig['pixKeyType']) ?? 'cnpj',
  },
  fees: {
    escrowFeePercent: parseFloat(process.env['ESCROW_FEE_PERCENT'] ?? '1.5'),
    pixTransactionFee: parseFloat(process.env['PIX_TRANSACTION_FEE'] ?? '0.00'),
    boletoGenerationFee: parseFloat(process.env['BOLETO_GENERATION_FEE'] ?? '3.50'),
    latePaymentFinePercent: parseFloat(process.env['LATE_FINE_PERCENT'] ?? '2.0'),
    latePaymentMonthlyInterestPercent: parseFloat(process.env['LATE_INTEREST_MONTHLY_PERCENT'] ?? '1.0'),
  },
  pixDefaultExpirationSeconds: parseInt(process.env['PIX_DEFAULT_EXPIRATION_SECONDS'] ?? '3600', 10),
  boletoDefaultExpirationDays: parseInt(process.env['BOLETO_DEFAULT_EXPIRATION_DAYS'] ?? '3', 10),
  maxInstallments: parseInt(process.env['MAX_INSTALLMENTS'] ?? '48', 10),
  minInstallmentAmount: parseFloat(process.env['MIN_INSTALLMENT_AMOUNT'] ?? '50.00'),
  openFinanceRedirectUri: process.env['OPEN_FINANCE_REDIRECT_URI'] ?? 'https://app.tabeliao.com.br/open-finance/callback',
}));
