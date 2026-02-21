import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import {
  PixCharge,
  PixStatus,
  PixRefund,
  PixChargeStatus,
  PixRefundStatus,
  BoletoResult,
  PixWebhookPayload,
  PspTokenResponse,
} from './types';
import type { PaymentConfig } from '../../config/payment.config';

@Injectable()
export class PixService {
  private readonly logger = new Logger(PixService.name);
  private pspClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private readonly paymentConfig: PaymentConfig;

  constructor(private readonly configService: ConfigService) {
    this.paymentConfig = this.configService.get<PaymentConfig>('payment')!;

    this.pspClient = axios.create({
      baseURL: this.paymentConfig.provider.pspBaseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.pspClient.interceptors.request.use(async (config) => {
      const token = await this.getAccessToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.pspClient.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error(
          `PSP API Error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
        );
        throw error;
      },
    );
  }

  /**
   * Authenticate with PSP using OAuth2 client credentials.
   * Caches the token until expiry.
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const { pspClientId, pspClientSecret, pspBaseUrl } = this.paymentConfig.provider;

      const credentials = Buffer.from(`${pspClientId}:${pspClientSecret}`).toString('base64');

      const response = await axios.post<PspTokenResponse>(
        `${pspBaseUrl}/oauth/token`,
        { grant_type: 'client_credentials' },
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      this.accessToken = response.data.access_token;
      // Expire 60 seconds early to avoid edge cases
      this.tokenExpiresAt = new Date(Date.now() + (response.data.expires_in - 60) * 1000);

      this.logger.log('PSP OAuth2 token refreshed successfully');
      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to obtain PSP access token', error);
      throw new HttpException(
        'Failed to authenticate with payment provider',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Generate a PIX Copia e Cola charge and QR Code.
   *
   * @param amount - Amount in BRL (e.g. 150.00)
   * @param payerCpf - Payer's CPF/CNPJ
   * @param description - Human-readable description
   * @param expiresIn - Expiration in seconds (default from config)
   * @returns PixCharge with pixCode, qrCodeBase64, txid, expiresAt
   */
  async generatePixCharge(
    amount: number,
    payerCpf: string,
    description: string,
    expiresIn?: number,
  ): Promise<PixCharge> {
    const decimalAmount = new Decimal(amount);

    if (decimalAmount.lessThanOrEqualTo(0)) {
      throw new HttpException('Amount must be greater than zero', HttpStatus.BAD_REQUEST);
    }

    const txid = this.generateTxId();
    const expiration = expiresIn ?? this.paymentConfig.pixDefaultExpirationSeconds;

    try {
      const payload = {
        calendario: {
          expiracao: expiration,
        },
        devedor: {
          cpf: payerCpf.replace(/\D/g, ''),
          nome: 'Pagador',
        },
        valor: {
          original: decimalAmount.toFixed(2),
        },
        chave: this.paymentConfig.provider.pixKey,
        solicitacaoPagador: description.substring(0, 140),
        infoAdicionais: [
          {
            nome: 'Plataforma',
            valor: 'Tabeliao',
          },
        ],
      };

      const response = await this.pspClient.put(`/v2/cob/${txid}`, payload);

      const pixCopiaECola: string = response.data.pixCopiaECola ?? response.data.location ?? '';
      const qrCodeBase64 = await this.generatePixQrCode(pixCopiaECola);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + expiration * 1000);

      const charge: PixCharge = {
        pixCode: pixCopiaECola,
        qrCodeBase64,
        txid,
        createdAt: now,
        expiresAt,
        amount: decimalAmount.toNumber(),
        description,
      };

      this.logger.log(`PIX charge created: txid=${txid}, amount=R$${decimalAmount.toFixed(2)}`);
      return charge;
    } catch (error) {
      this.logger.error(`Failed to create PIX charge: txid=${txid}`, error);
      throw new HttpException(
        'Failed to generate PIX charge with payment provider',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Generate a QR Code image (base64 PNG) from a PIX Copia e Cola string.
   *
   * @param pixCode - PIX Copia e Cola string
   * @returns Base64-encoded PNG image
   */
  async generatePixQrCode(pixCode: string): Promise<string> {
    if (!pixCode) {
      throw new HttpException('PIX code is required to generate QR Code', HttpStatus.BAD_REQUEST);
    }

    try {
      const qrCodeDataUrl = await QRCode.toDataURL(pixCode, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });

      // Strip data:image/png;base64, prefix to return pure base64
      return qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
    } catch (error) {
      this.logger.error('Failed to generate QR Code', error);
      throw new HttpException('Failed to generate PIX QR Code', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Check the payment status of a PIX charge.
   *
   * @param txid - Transaction ID
   * @returns PixStatus with current status and payment details
   */
  async checkPixStatus(txid: string): Promise<PixStatus> {
    try {
      const response = await this.pspClient.get(`/v2/cob/${txid}`);
      const data = response.data;

      const pixPayments: Array<{
        endToEndId: string;
        valor: string;
        horario: string;
        infoPagador?: string;
        nomePagador?: string;
        cpfPagador?: string;
        cnpjPagador?: string;
        devolucoes?: Array<{ valor: string }>;
      }> = data.pix ?? [];
      const lastPayment = pixPayments.length > 0 ? pixPayments[pixPayments.length - 1] : null;

      let refundedAmount = new Decimal(0);
      if (lastPayment?.devolucoes) {
        for (const dev of lastPayment.devolucoes) {
          refundedAmount = refundedAmount.plus(new Decimal(dev.valor));
        }
      }

      let status: PixChargeStatus;
      switch (data.status) {
        case 'ATIVA':
          status = PixChargeStatus.ACTIVE;
          break;
        case 'CONCLUIDA':
          status = PixChargeStatus.COMPLETED;
          break;
        case 'REMOVIDA_PELO_USUARIO_RECEBEDOR':
          status = PixChargeStatus.REMOVED_BY_RECEIVER;
          break;
        case 'REMOVIDA_PELO_PSP':
          status = PixChargeStatus.REMOVED_BY_PSP;
          break;
        default:
          status = data.calendario?.expiracao &&
            new Date(data.calendario.criacao).getTime() + data.calendario.expiracao * 1000 < Date.now()
            ? PixChargeStatus.EXPIRED
            : PixChargeStatus.ACTIVE;
      }

      const pixStatus: PixStatus = {
        txid,
        status,
        amount: parseFloat(data.valor.original),
        payerName: lastPayment?.nomePagador ?? null,
        payerDocument: lastPayment?.cpfPagador ?? lastPayment?.cnpjPagador ?? null,
        endToEndId: lastPayment?.endToEndId ?? null,
        paidAt: lastPayment ? new Date(lastPayment.horario) : null,
        refundedAmount: refundedAmount.toNumber(),
      };

      return pixStatus;
    } catch (error) {
      this.logger.error(`Failed to check PIX status: txid=${txid}`, error);
      throw new HttpException(
        'Failed to check PIX payment status',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Process incoming PIX webhook notification from PSP.
   * Called when a PIX payment is confirmed or refunded.
   *
   * @param payload - Webhook payload from PSP
   */
  async handlePixWebhook(payload: PixWebhookPayload): Promise<void> {
    if (!payload.pix || !Array.isArray(payload.pix)) {
      this.logger.warn('Received invalid PIX webhook payload');
      return;
    }

    for (const pixEvent of payload.pix) {
      try {
        const { txid, endToEndId, valor, horario } = pixEvent;
        const amount = new Decimal(valor);

        this.logger.log(
          `PIX webhook received: txid=${txid}, e2eId=${endToEndId}, ` +
          `amount=R$${amount.toFixed(2)}, time=${horario}`,
        );

        // Check for refund events (devolucoes)
        if (pixEvent.devolucoes && pixEvent.devolucoes.length > 0) {
          for (const devolucao of pixEvent.devolucoes) {
            this.logger.log(
              `PIX refund event: id=${devolucao.id}, rtrId=${devolucao.rtrId}, ` +
              `amount=R$${devolucao.valor}, status=${devolucao.status}`,
            );
          }
        }

        // In production, emit events to other services via message broker:
        // - Update invoice status to PAID
        // - Update escrow deposit status
        // - Trigger notification to user
        // - Record transaction in ledger
        this.logger.log(`PIX payment confirmed: txid=${txid}, endToEndId=${endToEndId}`);
      } catch (error) {
        this.logger.error(
          `Failed to process PIX webhook event for txid=${pixEvent.txid}`,
          error,
        );
      }
    }
  }

  /**
   * Request a full or partial PIX refund (devolucao).
   *
   * @param txid - Original transaction ID
   * @param amount - Amount to refund (undefined = full refund)
   * @returns PixRefund result
   */
  async refundPix(txid: string, amount?: number): Promise<PixRefund> {
    try {
      // First, get the original charge to determine the amount
      const originalStatus = await this.checkPixStatus(txid);

      if (originalStatus.status !== PixChargeStatus.COMPLETED) {
        throw new HttpException(
          'Can only refund completed PIX payments',
          HttpStatus.CONFLICT,
        );
      }

      if (!originalStatus.endToEndId) {
        throw new HttpException(
          'Original payment endToEndId not found',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const refundAmount = amount
        ? new Decimal(amount)
        : new Decimal(originalStatus.amount).minus(new Decimal(originalStatus.refundedAmount));

      if (refundAmount.lessThanOrEqualTo(0)) {
        throw new HttpException(
          'Refund amount must be greater than zero',
          HttpStatus.BAD_REQUEST,
        );
      }

      const maxRefundable = new Decimal(originalStatus.amount).minus(
        new Decimal(originalStatus.refundedAmount),
      );
      if (refundAmount.greaterThan(maxRefundable)) {
        throw new HttpException(
          `Refund amount R$${refundAmount.toFixed(2)} exceeds refundable balance R$${maxRefundable.toFixed(2)}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const refundId = uuidv4().replace(/-/g, '').substring(0, 35);

      const response = await this.pspClient.put(
        `/v2/pix/${originalStatus.endToEndId}/devolucao/${refundId}`,
        {
          valor: refundAmount.toFixed(2),
        },
      );

      const refundResult: PixRefund = {
        refundId: response.data.id ?? refundId,
        txid,
        amount: refundAmount.toNumber(),
        status: this.mapRefundStatus(response.data.status),
        requestedAt: new Date(),
        settledAt: response.data.horario?.liquidacao
          ? new Date(response.data.horario.liquidacao)
          : null,
      };

      this.logger.log(
        `PIX refund requested: txid=${txid}, refundId=${refundId}, amount=R$${refundAmount.toFixed(2)}`,
      );

      return refundResult;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to refund PIX: txid=${txid}`, error);
      throw new HttpException('Failed to process PIX refund', HttpStatus.BAD_GATEWAY);
    }
  }

  /**
   * Generate a boleto bancario via PSP.
   *
   * @param amount - Amount in BRL
   * @param payerData - Payer data (name, CPF/CNPJ, address)
   * @param dueDate - Due date
   * @param description - Description
   * @returns BoletoResult with boletoCode and PDF URL
   */
  async generateBoleto(
    amount: number,
    payerData: { name: string; document: string; address?: string; city?: string; state?: string; cep?: string },
    dueDate: Date,
    description: string,
  ): Promise<BoletoResult> {
    const decimalAmount = new Decimal(amount);

    if (decimalAmount.lessThanOrEqualTo(0)) {
      throw new HttpException('Amount must be greater than zero', HttpStatus.BAD_REQUEST);
    }

    try {
      const cleanDocument = payerData.document.replace(/\D/g, '');
      const isCnpj = cleanDocument.length > 11;

      const payload = {
        payment: {
          banking_billet: {
            expire_at: this.formatDateBrazil(dueDate),
            customer: {
              name: payerData.name,
              cpf: isCnpj ? undefined : cleanDocument,
              cnpj: isCnpj ? cleanDocument : undefined,
              address: payerData.address ?? '',
              city: payerData.city ?? '',
              state: payerData.state ?? '',
              zipcode: payerData.cep?.replace(/\D/g, '') ?? '',
            },
            message: description.substring(0, 80),
          },
        },
        items: [
          {
            name: description.substring(0, 255),
            value: parseInt(decimalAmount.times(100).toFixed(0), 10),
            amount: 1,
          },
        ],
      };

      const response = await this.pspClient.post('/v1/charge/one-step', payload);
      const boletoData = response.data.data?.banking_billet ?? response.data;

      const boletoResult: BoletoResult = {
        boletoId: response.data.data?.charge_id?.toString() ?? uuidv4(),
        boletoCode: boletoData.barcode ?? boletoData.typeful_line ?? '',
        barcode: boletoData.barcode ?? '',
        boletoUrl: boletoData.link ?? boletoData.pdf?.charge ?? '',
        amount: decimalAmount.toNumber(),
        dueDate,
        payerName: payerData.name,
        payerDocument: cleanDocument,
        description,
      };

      this.logger.log(
        `Boleto generated: id=${boletoResult.boletoId}, amount=R$${decimalAmount.toFixed(2)}, due=${this.formatDateBrazil(dueDate)}`,
      );

      return boletoResult;
    } catch (error) {
      this.logger.error('Failed to generate boleto', error);
      throw new HttpException(
        'Failed to generate boleto with payment provider',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Generate a unique txid for PIX charges.
   * Must be 26-35 alphanumeric characters per BACEN spec.
   */
  private generateTxId(): string {
    const uuid = uuidv4().replace(/-/g, '');
    return `TAB${uuid}`.substring(0, 35);
  }

  /**
   * Format a Date to dd/mm/yyyy (Brazilian format) for boleto.
   */
  private formatDateBrazil(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  }

  /**
   * Map PSP refund status string to PixRefundStatus enum.
   */
  private mapRefundStatus(pspStatus: string): PixRefundStatus {
    switch (pspStatus?.toUpperCase()) {
      case 'EM_PROCESSAMENTO':
        return PixRefundStatus.PROCESSING;
      case 'DEVOLVIDO':
        return PixRefundStatus.CONFIRMED;
      case 'NAO_REALIZADO':
        return PixRefundStatus.REJECTED;
      default:
        return PixRefundStatus.PENDING;
    }
  }
}
