import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../modules/email/email.service';
import { WhatsappService } from '../modules/whatsapp/whatsapp.service';
import { SmsService } from '../modules/sms/sms.service';
import { PushService } from '../modules/push/push.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export enum NotificationType {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  PUSH = 'push',
}

export enum NotificationEventType {
  CONTRACT_CREATED = 'contract_created',
  SIGNATURE_REQUEST = 'signature_request',
  CONTRACT_SIGNED = 'contract_signed',
  PAYMENT_REMINDER = 'payment_reminder',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  CONTRACT_EXPIRING = 'contract_expiring',
  DISPUTE_OPENED = 'dispute_opened',
  DISPUTE_RESOLVED = 'dispute_resolved',
  OVERDUE_NOTICE = 'overdue_notice',
  WELCOME = 'welcome',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  KYC_ALERT = 'kyc_alert',
  VERIFICATION_CODE = 'verification_code',
  CRITICAL_ALERT = 'critical_alert',
}

export interface NotificationPayload {
  userId: string;
  eventType: NotificationEventType;
  channels: NotificationType[];
  data: NotificationData;
}

export interface NotificationData {
  // Recipient info
  email?: string;
  phone?: string;

  // User info
  userName?: string;

  // Contract info
  contractTitle?: string;
  contractId?: string;

  // Signature info
  signerName?: string;
  signUrl?: string;
  allPartiesSigned?: boolean;

  // Payment info
  amount?: number;
  dueDate?: string;
  pixCode?: string;

  // Expiration info
  daysRemaining?: number;
  renewalUrl?: string;
  newValue?: string;

  // Dispute info
  disputeId?: string;
  resolution?: string;

  // Overdue info
  daysOverdue?: number;
  fineAmount?: number;

  // Auth info
  token?: string;
  verificationCode?: string;

  // KYC info
  counterpartyName?: string;
  riskLevel?: string;
  issues?: string[];

  // Push info
  pushTitle?: string;
  pushBody?: string;
  pushData?: Record<string, string>;

  // Generic
  action?: string;
  message?: string;
}

/**
 * Default channel configuration per event type.
 * Defines the recommended channels for each event when no explicit channels are given.
 */
const DEFAULT_CHANNELS: Record<NotificationEventType, NotificationType[]> = {
  [NotificationEventType.CONTRACT_CREATED]: [
    NotificationType.EMAIL,
    NotificationType.PUSH,
  ],
  [NotificationEventType.SIGNATURE_REQUEST]: [
    NotificationType.EMAIL,
    NotificationType.WHATSAPP,
    NotificationType.PUSH,
  ],
  [NotificationEventType.CONTRACT_SIGNED]: [
    NotificationType.EMAIL,
    NotificationType.PUSH,
  ],
  [NotificationEventType.PAYMENT_REMINDER]: [
    NotificationType.EMAIL,
    NotificationType.WHATSAPP,
    NotificationType.PUSH,
  ],
  [NotificationEventType.PAYMENT_CONFIRMED]: [
    NotificationType.EMAIL,
    NotificationType.PUSH,
  ],
  [NotificationEventType.CONTRACT_EXPIRING]: [
    NotificationType.EMAIL,
    NotificationType.WHATSAPP,
    NotificationType.PUSH,
  ],
  [NotificationEventType.DISPUTE_OPENED]: [
    NotificationType.EMAIL,
    NotificationType.WHATSAPP,
    NotificationType.SMS,
    NotificationType.PUSH,
  ],
  [NotificationEventType.DISPUTE_RESOLVED]: [
    NotificationType.EMAIL,
    NotificationType.WHATSAPP,
    NotificationType.PUSH,
  ],
  [NotificationEventType.OVERDUE_NOTICE]: [
    NotificationType.EMAIL,
    NotificationType.WHATSAPP,
    NotificationType.SMS,
    NotificationType.PUSH,
  ],
  [NotificationEventType.WELCOME]: [
    NotificationType.EMAIL,
  ],
  [NotificationEventType.EMAIL_VERIFICATION]: [
    NotificationType.EMAIL,
  ],
  [NotificationEventType.PASSWORD_RESET]: [
    NotificationType.EMAIL,
  ],
  [NotificationEventType.KYC_ALERT]: [
    NotificationType.EMAIL,
    NotificationType.PUSH,
  ],
  [NotificationEventType.VERIFICATION_CODE]: [
    NotificationType.SMS,
  ],
  [NotificationEventType.CRITICAL_ALERT]: [
    NotificationType.EMAIL,
    NotificationType.WHATSAPP,
    NotificationType.SMS,
    NotificationType.PUSH,
  ],
};

// ---------------------------------------------------------------------------
// Dispatcher Service
// ---------------------------------------------------------------------------

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly whatsappService: WhatsappService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
  ) {
    this.logger.log('NotificationDispatcherService initialized');
  }

  /**
   * Dispatch a notification to all configured channels for the given event.
   * Uses explicitly provided channels if available, otherwise falls back
   * to the default channel configuration for the event type.
   */
  async dispatch(notification: NotificationPayload): Promise<void> {
    const channels =
      notification.channels.length > 0
        ? notification.channels
        : DEFAULT_CHANNELS[notification.eventType] ?? [];

    if (channels.length === 0) {
      this.logger.warn(
        `No channels configured for event '${notification.eventType}' [user: ${notification.userId}]`,
      );
      return;
    }

    this.logger.log(
      `Dispatching '${notification.eventType}' to [${channels.join(', ')}] for user ${notification.userId}`,
    );

    const promises: Promise<void>[] = [];

    for (const channel of channels) {
      switch (channel) {
        case NotificationType.EMAIL:
          promises.push(this.dispatchEmail(notification));
          break;
        case NotificationType.WHATSAPP:
          promises.push(this.dispatchWhatsapp(notification));
          break;
        case NotificationType.SMS:
          promises.push(this.dispatchSms(notification));
          break;
        case NotificationType.PUSH:
          promises.push(this.dispatchPush(notification));
          break;
      }
    }

    const results = await Promise.allSettled(promises);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const channel = channels[i];
      if (result && result.status === 'rejected') {
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
        this.logger.error(
          `Failed to dispatch via ${String(channel)} for event '${notification.eventType}': ${reason}`,
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Channel-specific dispatch helpers
  // ---------------------------------------------------------------------------

  private async dispatchEmail(notification: NotificationPayload): Promise<void> {
    const { eventType, data } = notification;
    const email = data.email;
    if (!email) {
      this.logger.warn(`No email address provided for event '${eventType}'`);
      return;
    }

    switch (eventType) {
      case NotificationEventType.CONTRACT_CREATED:
        await this.emailService.sendContractCreated(email, data.contractTitle ?? '', data.contractId ?? '');
        break;
      case NotificationEventType.SIGNATURE_REQUEST:
        await this.emailService.sendSignatureRequest(email, data.signerName ?? '', data.contractTitle ?? '', data.signUrl ?? '');
        break;
      case NotificationEventType.CONTRACT_SIGNED:
        await this.emailService.sendContractSigned(email, data.contractTitle ?? '', data.allPartiesSigned ?? false);
        break;
      case NotificationEventType.PAYMENT_REMINDER:
        await this.emailService.sendPaymentReminder(email, data.contractTitle ?? '', data.amount ?? 0, data.dueDate ?? '', data.pixCode ?? '');
        break;
      case NotificationEventType.PAYMENT_CONFIRMED:
        await this.emailService.sendPaymentConfirmed(email, data.contractTitle ?? '', data.amount ?? 0);
        break;
      case NotificationEventType.CONTRACT_EXPIRING:
        await this.emailService.sendContractExpiring(email, data.contractTitle ?? '', data.daysRemaining ?? 0, data.renewalUrl ?? '');
        break;
      case NotificationEventType.DISPUTE_OPENED:
        await this.emailService.sendDisputeOpened(email, data.contractTitle ?? '', data.disputeId ?? '');
        break;
      case NotificationEventType.DISPUTE_RESOLVED:
        await this.emailService.sendDisputeResolved(email, data.contractTitle ?? '', data.resolution ?? '');
        break;
      case NotificationEventType.OVERDUE_NOTICE:
        await this.emailService.sendOverdueNotice(email, data.contractTitle ?? '', data.amount ?? 0, data.daysOverdue ?? 0, data.fineAmount ?? 0);
        break;
      case NotificationEventType.WELCOME:
        await this.emailService.sendWelcome(email, data.userName ?? '');
        break;
      case NotificationEventType.EMAIL_VERIFICATION:
        await this.emailService.sendEmailVerification(email, data.token ?? '');
        break;
      case NotificationEventType.PASSWORD_RESET:
        await this.emailService.sendPasswordReset(email, data.token ?? '');
        break;
      case NotificationEventType.KYC_ALERT:
        await this.emailService.sendKycAlert(email, data.counterpartyName ?? '', data.riskLevel ?? '', data.issues ?? []);
        break;
      default:
        await this.emailService.sendEmail(email, `Notificacao Tabeliao: ${eventType}`, 'generic', {
          title: data.pushTitle ?? 'Notificacao',
          message: data.message ?? '',
        });
    }
  }

  private async dispatchWhatsapp(notification: NotificationPayload): Promise<void> {
    const { eventType, data } = notification;
    const phone = data.phone;
    if (!phone) {
      this.logger.warn(`No phone number provided for WhatsApp event '${eventType}'`);
      return;
    }

    switch (eventType) {
      case NotificationEventType.CONTRACT_CREATED:
        await this.whatsappService.sendContractNotification(phone, data.contractTitle ?? '', data.action ?? 'criado');
        break;
      case NotificationEventType.SIGNATURE_REQUEST:
        await this.whatsappService.sendSignatureRequest(phone, data.signerName ?? '', data.contractTitle ?? '', data.signUrl ?? '');
        break;
      case NotificationEventType.PAYMENT_REMINDER:
        await this.whatsappService.sendPaymentReminder(phone, data.contractTitle ?? '', String(data.amount ?? 0), data.dueDate ?? '');
        break;
      case NotificationEventType.CONTRACT_EXPIRING:
        await this.whatsappService.sendContractExpiring(phone, data.contractTitle ?? '', data.daysRemaining ?? 0, data.newValue);
        break;
      case NotificationEventType.OVERDUE_NOTICE:
        await this.whatsappService.sendOverdueAlert(phone, data.contractTitle ?? '', String(data.amount ?? 0), data.daysOverdue ?? 0);
        break;
      case NotificationEventType.DISPUTE_OPENED:
      case NotificationEventType.DISPUTE_RESOLVED:
        await this.whatsappService.sendDisputeNotification(phone, data.contractTitle ?? '', eventType === NotificationEventType.DISPUTE_OPENED ? 'aberta' : 'resolvida');
        break;
      case NotificationEventType.CONTRACT_SIGNED:
        await this.whatsappService.sendContractNotification(phone, data.contractTitle ?? '', 'assinado');
        break;
      case NotificationEventType.PAYMENT_CONFIRMED:
        await this.whatsappService.sendContractNotification(phone, data.contractTitle ?? '', 'pagamento confirmado');
        break;
      case NotificationEventType.CRITICAL_ALERT:
        await this.whatsappService.sendContractNotification(phone, data.contractTitle ?? data.message ?? '', data.action ?? 'alerta critico');
        break;
      default:
        this.logger.warn(`No WhatsApp handler for event '${eventType}'`);
    }
  }

  private async dispatchSms(notification: NotificationPayload): Promise<void> {
    const { eventType, data } = notification;
    const phone = data.phone;
    if (!phone) {
      this.logger.warn(`No phone number provided for SMS event '${eventType}'`);
      return;
    }

    switch (eventType) {
      case NotificationEventType.VERIFICATION_CODE:
        await this.smsService.sendVerificationCode(phone, data.verificationCode ?? '');
        break;
      case NotificationEventType.CRITICAL_ALERT:
        await this.smsService.sendCriticalAlert(phone, data.message ?? 'Alerta critico na sua conta Tabeliao.');
        break;
      case NotificationEventType.DISPUTE_OPENED:
        await this.smsService.sendCriticalAlert(phone, `Disputa aberta no contrato: ${data.contractTitle ?? 'N/A'}`);
        break;
      case NotificationEventType.OVERDUE_NOTICE:
        await this.smsService.sendSms(phone, `Tabeliao: Pagamento em atraso (${data.daysOverdue ?? 0} dias) - ${data.contractTitle ?? 'N/A'}. Acesse a plataforma para regularizar.`);
        break;
      default:
        await this.smsService.sendSms(phone, `Tabeliao: ${data.message ?? `Notificacao sobre ${data.contractTitle ?? 'seu contrato'}`}`);
    }
  }

  private async dispatchPush(notification: NotificationPayload): Promise<void> {
    const { userId, eventType, data } = notification;

    const titleMap: Record<string, string> = {
      [NotificationEventType.CONTRACT_CREATED]: 'Novo Contrato',
      [NotificationEventType.SIGNATURE_REQUEST]: 'Assinatura Solicitada',
      [NotificationEventType.CONTRACT_SIGNED]: 'Contrato Assinado',
      [NotificationEventType.PAYMENT_REMINDER]: 'Lembrete de Pagamento',
      [NotificationEventType.PAYMENT_CONFIRMED]: 'Pagamento Confirmado',
      [NotificationEventType.CONTRACT_EXPIRING]: 'Contrato Vencendo',
      [NotificationEventType.DISPUTE_OPENED]: 'Disputa Aberta',
      [NotificationEventType.DISPUTE_RESOLVED]: 'Disputa Resolvida',
      [NotificationEventType.OVERDUE_NOTICE]: 'Pagamento em Atraso',
      [NotificationEventType.KYC_ALERT]: 'Alerta KYC',
      [NotificationEventType.CRITICAL_ALERT]: 'Alerta Critico',
    };

    const bodyMap: Record<string, string> = {
      [NotificationEventType.CONTRACT_CREATED]: `Contrato "${data.contractTitle ?? ''}" criado.`,
      [NotificationEventType.SIGNATURE_REQUEST]: `${data.signerName ?? 'Voce'}, assine o contrato "${data.contractTitle ?? ''}".`,
      [NotificationEventType.CONTRACT_SIGNED]: data.allPartiesSigned
        ? `Todas as partes assinaram "${data.contractTitle ?? ''}".`
        : `Nova assinatura em "${data.contractTitle ?? ''}".`,
      [NotificationEventType.PAYMENT_REMINDER]: `Pagamento de R$ ${String(data.amount ?? 0)} vence em ${data.dueDate ?? ''}.`,
      [NotificationEventType.PAYMENT_CONFIRMED]: `Pagamento de R$ ${String(data.amount ?? 0)} confirmado.`,
      [NotificationEventType.CONTRACT_EXPIRING]: `"${data.contractTitle ?? ''}" vence em ${String(data.daysRemaining ?? 0)} dias.`,
      [NotificationEventType.DISPUTE_OPENED]: `Disputa aberta em "${data.contractTitle ?? ''}".`,
      [NotificationEventType.DISPUTE_RESOLVED]: `Disputa resolvida em "${data.contractTitle ?? ''}".`,
      [NotificationEventType.OVERDUE_NOTICE]: `Pagamento em atraso ha ${String(data.daysOverdue ?? 0)} dias.`,
      [NotificationEventType.KYC_ALERT]: `Alerta de risco: ${data.counterpartyName ?? ''} (${data.riskLevel ?? ''}).`,
      [NotificationEventType.CRITICAL_ALERT]: data.message ?? 'Alerta critico na sua conta.',
    };

    const title = data.pushTitle ?? titleMap[eventType] ?? 'Tabeliao';
    const body = data.pushBody ?? bodyMap[eventType] ?? data.message ?? 'Voce tem uma nova notificacao.';
    const pushData: Record<string, string> = {
      ...data.pushData,
      eventType,
      ...(data.contractId ? { contractId: data.contractId } : {}),
      ...(data.disputeId ? { disputeId: data.disputeId } : {}),
    };

    await this.pushService.sendPush(userId, title, body, pushData);
  }
}
