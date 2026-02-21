import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly httpClient: AxiosInstance;
  private readonly provider: 'twilio' | 'zenvia';
  private readonly fromNumber: string;

  // Twilio-specific
  private readonly twilioAccountSid: string;
  private readonly twilioAuthToken: string;

  // Zenvia-specific
  private readonly zenviaApiToken: string;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<string>('SMS_PROVIDER', 'twilio') as 'twilio' | 'zenvia';
    this.fromNumber = this.configService.get<string>('SMS_FROM_NUMBER', '');

    this.twilioAccountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID', '');
    this.twilioAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN', '');
    this.zenviaApiToken = this.configService.get<string>('ZENVIA_API_TOKEN', '');

    if (this.provider === 'twilio') {
      this.httpClient = axios.create({
        baseURL: `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}`,
        auth: {
          username: this.twilioAccountSid,
          password: this.twilioAuthToken,
        },
        timeout: 15000,
      });
    } else {
      this.httpClient = axios.create({
        baseURL: 'https://api.zenvia.com/v2',
        headers: {
          'X-API-TOKEN': this.zenviaApiToken,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });
    }

    this.logger.log(`SmsService initialized [provider: ${this.provider}]`);
  }

  /**
   * Send an SMS message to the specified phone number.
   */
  async sendSms(phone: string, message: string): Promise<void> {
    const normalizedPhone = this.normalizePhone(phone);

    try {
      if (this.provider === 'twilio') {
        await this.sendViaTwilio(normalizedPhone, message);
      } else {
        await this.sendViaZenvia(normalizedPhone, message);
      }

      this.logger.log(`SMS sent to ${normalizedPhone}`);
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send SMS to ${normalizedPhone}: ${errMessage}`);
      throw error;
    }
  }

  /**
   * Send a critical alert SMS. These are high-priority messages for
   * disputes, large payments, and security alerts.
   */
  async sendCriticalAlert(phone: string, message: string): Promise<void> {
    const prefixedMessage = `[TABELIAO - URGENTE] ${message}`;
    await this.sendSms(phone, prefixedMessage);
  }

  /**
   * Send an SMS verification code for 2FA or phone verification.
   */
  async sendVerificationCode(phone: string, code: string): Promise<void> {
    const message = `Tabeliao: Seu codigo de verificacao e ${code}. Valido por 10 minutos. Nao compartilhe este codigo.`;
    await this.sendSms(phone, message);
  }

  /**
   * Send SMS via Twilio API.
   */
  private async sendViaTwilio(phone: string, message: string): Promise<void> {
    const params = new URLSearchParams();
    params.append('To', `+${phone}`);
    params.append('From', this.fromNumber);
    params.append('Body', message);

    await this.httpClient.post('/Messages.json', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  /**
   * Send SMS via Zenvia API.
   */
  private async sendViaZenvia(phone: string, message: string): Promise<void> {
    const payload = {
      from: 'tabeliao',
      to: phone,
      contents: [
        {
          type: 'text',
          text: message,
        },
      ],
    };

    await this.httpClient.post('/channels/sms/messages', payload);
  }

  /**
   * Normalize a Brazilian phone number to E.164 format (without +).
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
