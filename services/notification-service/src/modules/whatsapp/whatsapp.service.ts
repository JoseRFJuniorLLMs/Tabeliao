import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly httpClient: AxiosInstance;
  private readonly phoneNumberId: string;
  private readonly businessAccountId: string;
  private readonly verifyToken: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN', '');
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID', '');
    this.businessAccountId = this.configService.get<string>('WHATSAPP_BUSINESS_ACCOUNT_ID', '');
    this.verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN', 'tabeliao-webhook-verify');
    this.baseUrl = this.configService.get<string>('APP_BASE_URL', 'https://app.tabeliao.com.br');

    this.httpClient = axios.create({
      baseURL: `https://graph.facebook.com/v18.0/${this.phoneNumberId}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    this.logger.log('WhatsappService initialized');
  }

  /**
   * Send a WhatsApp template message via Meta Business API.
   */
  async sendMessage(
    phone: string,
    templateName: string,
    params: string[],
  ): Promise<void> {
    try {
      const normalizedPhone = this.normalizePhone(phone);
      const components: Record<string, unknown>[] = [];

      if (params.length > 0) {
        components.push({
          type: 'body',
          parameters: params.map((value) => ({
            type: 'text',
            text: value,
          })),
        });
      }

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'pt_BR' },
          components,
        },
      };

      await this.httpClient.post('/messages', payload);
      this.logger.log(`WhatsApp message sent to ${normalizedPhone} [template: ${templateName}]`);
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send WhatsApp to ${phone}: ${errMessage}`);
      throw error;
    }
  }

  /**
   * Send a generic contract notification.
   */
  async sendContractNotification(
    phone: string,
    contractTitle: string,
    action: string,
  ): Promise<void> {
    await this.sendMessage(phone, 'tabeliao_contract_notification', [
      contractTitle,
      action,
      this.baseUrl,
    ]);
  }

  /**
   * Send a payment reminder via WhatsApp.
   */
  async sendPaymentReminder(
    phone: string,
    contractTitle: string,
    amount: string,
    dueDate: string,
  ): Promise<void> {
    await this.sendMessage(phone, 'tabeliao_payment_reminder', [
      contractTitle,
      amount,
      dueDate,
      `${this.baseUrl}/payments`,
    ]);
  }

  /**
   * Send a signature request notification via WhatsApp.
   */
  async sendSignatureRequest(
    phone: string,
    signerName: string,
    contractTitle: string,
    signUrl: string,
  ): Promise<void> {
    await this.sendMessage(phone, 'tabeliao_signature_request', [
      signerName,
      contractTitle,
      signUrl,
    ]);
  }

  /**
   * Send a contract expiring notification with optional new value (IGPM adjustment).
   * Template text:
   * "Seu contrato '{contractTitle}' vence em {daysRemaining} dias.
   *  O IGPM acumulado foi de X%. O novo valor sera R$ {newValue}.
   *  Clique aqui para renovar: {url}"
   */
  async sendContractExpiring(
    phone: string,
    contractTitle: string,
    daysRemaining: number,
    newValue?: string,
  ): Promise<void> {
    const params = [
      contractTitle,
      String(daysRemaining),
      newValue ?? 'a definir',
      `${this.baseUrl}/contracts/renew`,
    ];

    await this.sendMessage(phone, 'tabeliao_contract_expiring', params);
  }

  /**
   * Send an overdue payment alert.
   */
  async sendOverdueAlert(
    phone: string,
    contractTitle: string,
    amount: string,
    daysOverdue: number,
  ): Promise<void> {
    await this.sendMessage(phone, 'tabeliao_overdue_alert', [
      contractTitle,
      amount,
      String(daysOverdue),
      `${this.baseUrl}/payments`,
    ]);
  }

  /**
   * Send a dispute status notification.
   */
  async sendDisputeNotification(
    phone: string,
    contractTitle: string,
    status: string,
  ): Promise<void> {
    await this.sendMessage(phone, 'tabeliao_dispute_notification', [
      contractTitle,
      status,
      `${this.baseUrl}/disputes`,
    ]);
  }

  /**
   * Verify a webhook subscription from Meta.
   */
  verifyWebhook(
    mode: string | undefined,
    token: string | undefined,
    challenge: string | undefined,
  ): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('Webhook verified successfully');
      return challenge ?? null;
    }
    this.logger.warn('Webhook verification failed');
    return null;
  }

  /**
   * Process incoming webhook events (delivery status, incoming messages).
   */
  processWebhook(body: Record<string, unknown>): void {
    try {
      const entry = body['entry'] as Array<Record<string, unknown>> | undefined;
      if (!entry || entry.length === 0) {
        return;
      }

      for (const entryItem of entry) {
        const changes = entryItem['changes'] as Array<Record<string, unknown>> | undefined;
        if (!changes) continue;

        for (const change of changes) {
          const value = change['value'] as Record<string, unknown> | undefined;
          if (!value) continue;

          const statuses = value['statuses'] as Array<Record<string, unknown>> | undefined;
          if (statuses) {
            for (const status of statuses) {
              this.logger.log(
                `WhatsApp delivery status: ${String(status['id'])} -> ${String(status['status'])}`,
              );
            }
          }

          const messages = value['messages'] as Array<Record<string, unknown>> | undefined;
          if (messages) {
            for (const message of messages) {
              this.logger.log(
                `Incoming WhatsApp message from ${String(message['from'])}: ${String(message['type'])}`,
              );
            }
          }
        }
      }
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error processing WhatsApp webhook: ${errMessage}`);
    }
  }

  /**
   * Normalize a Brazilian phone number to E.164 format.
   */
  private normalizePhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    if (!cleaned.startsWith('55')) {
      cleaned = `55${cleaned}`;
    }

    return cleaned;
  }
}
