import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import * as Handlebars from 'handlebars';

// ---------------------------------------------------------------------------
// Handlebars email template definitions
// ---------------------------------------------------------------------------

const BASE_LAYOUT = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .wrapper { width: 100%; background-color: #f4f6f9; padding: 40px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a237e 0%, #283593 100%); padding: 32px 40px; text-align: center; }
    .header img { height: 40px; }
    .header h1 { color: #ffffff; font-size: 22px; margin: 12px 0 0 0; font-weight: 600; letter-spacing: 0.5px; }
    .header .subtitle { color: #b3baf5; font-size: 13px; margin-top: 4px; }
    .content { padding: 40px; color: #333333; line-height: 1.7; font-size: 15px; }
    .content h2 { color: #1a237e; font-size: 20px; margin-top: 0; margin-bottom: 16px; }
    .content p { margin: 0 0 16px 0; }
    .highlight-box { background-color: #e8eaf6; border-left: 4px solid #1a237e; padding: 16px 20px; border-radius: 0 6px 6px 0; margin: 20px 0; }
    .highlight-box p { margin: 4px 0; }
    .highlight-box strong { color: #1a237e; }
    .cta-wrapper { text-align: center; margin: 28px 0; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #1a237e 0%, #3949ab 100%); color: #ffffff !important; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px; }
    .warning-box { background-color: #fff3e0; border-left: 4px solid #e65100; padding: 16px 20px; border-radius: 0 6px 6px 0; margin: 20px 0; }
    .warning-box strong { color: #e65100; }
    .success-box { background-color: #e8f5e9; border-left: 4px solid #2e7d32; padding: 16px 20px; border-radius: 0 6px 6px 0; margin: 20px 0; }
    .success-box strong { color: #2e7d32; }
    .issue-list { margin: 12px 0; padding-left: 20px; }
    .issue-list li { margin-bottom: 6px; color: #d32f2f; }
    .footer { background-color: #f8f9fa; padding: 24px 40px; text-align: center; border-top: 1px solid #e0e0e0; }
    .footer p { color: #9e9e9e; font-size: 12px; margin: 4px 0; }
    .footer a { color: #1a237e; text-decoration: none; }
    .divider { height: 1px; background-color: #e0e0e0; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Tabeliao</h1>
        <div class="subtitle">Smart Legal Tech</div>
      </div>
      <div class="content">
        {{{body}}}
      </div>
      <div class="footer">
        <p>Tabeliao - Plataforma Digital de Contratos</p>
        <p>Este e-mail foi enviado automaticamente. Nao responda diretamente.</p>
        <p><a href="{{baseUrl}}/preferences">Gerenciar notificacoes</a> | <a href="{{baseUrl}}/help">Central de ajuda</a></p>
        <p>&copy; {{year}} Tabeliao Tecnologia Ltda. Todos os direitos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const TEMPLATES: Record<string, string> = {
  contract_created: `
    <h2>Novo Contrato Criado</h2>
    <p>Ola,</p>
    <p>Um novo contrato foi criado na plataforma Tabeliao e requer sua atencao.</p>
    <div class="highlight-box">
      <p><strong>Contrato:</strong> {{contractTitle}}</p>
      <p><strong>ID:</strong> {{contractId}}</p>
    </div>
    <p>Acesse a plataforma para revisar os detalhes do contrato e tomar as acoes necessarias.</p>
    <div class="cta-wrapper">
      <a href="{{baseUrl}}/contracts/{{contractId}}" class="cta-button">Ver Contrato</a>
    </div>
  `,

  signature_request: `
    <h2>Solicitacao de Assinatura</h2>
    <p>Ola {{signerName}},</p>
    <p>Voce recebeu uma solicitacao para assinar o seguinte contrato:</p>
    <div class="highlight-box">
      <p><strong>Contrato:</strong> {{contractTitle}}</p>
    </div>
    <p>Revise os termos do contrato e, se concordar, realize a assinatura digital pela plataforma.</p>
    <div class="cta-wrapper">
      <a href="{{signUrl}}" class="cta-button">Assinar Contrato</a>
    </div>
    <p style="font-size: 13px; color: #757575;">Este link e pessoal e intransferivel. Nao compartilhe com terceiros.</p>
  `,

  contract_signed: `
    <h2>Contrato Assinado</h2>
    <p>Ola,</p>
    {{#if allPartiesSigned}}
    <div class="success-box">
      <p><strong>Todas as partes assinaram!</strong></p>
      <p>O contrato <strong>{{contractTitle}}</strong> foi assinado por todas as partes e esta agora em vigor.</p>
    </div>
    <p>O contrato foi registrado em blockchain para garantir sua integridade e imutabilidade.</p>
    {{else}}
    <p>Uma nova assinatura foi registrada no contrato <strong>{{contractTitle}}</strong>.</p>
    <div class="highlight-box">
      <p><strong>Status:</strong> Aguardando demais assinaturas</p>
    </div>
    <p>Voce sera notificado quando todas as partes tiverem assinado.</p>
    {{/if}}
    <div class="cta-wrapper">
      <a href="{{baseUrl}}/contracts/{{contractId}}" class="cta-button">Ver Detalhes</a>
    </div>
  `,

  payment_reminder: `
    <h2>Lembrete de Pagamento</h2>
    <p>Ola,</p>
    <p>Este e um lembrete sobre um pagamento pendente referente ao seu contrato:</p>
    <div class="highlight-box">
      <p><strong>Contrato:</strong> {{contractTitle}}</p>
      <p><strong>Valor:</strong> R$ {{amount}}</p>
      <p><strong>Vencimento:</strong> {{dueDate}}</p>
    </div>
    {{#if pixCode}}
    <p>Utilize o codigo Pix abaixo para realizar o pagamento de forma rapida:</p>
    <div style="background-color: #f5f5f5; padding: 16px; border-radius: 6px; text-align: center; margin: 16px 0; word-break: break-all; font-family: monospace; font-size: 13px;">
      {{pixCode}}
    </div>
    {{/if}}
    <div class="cta-wrapper">
      <a href="{{baseUrl}}/payments" class="cta-button">Realizar Pagamento</a>
    </div>
  `,

  payment_confirmed: `
    <h2>Pagamento Confirmado</h2>
    <p>Ola,</p>
    <div class="success-box">
      <p><strong>Pagamento recebido com sucesso!</strong></p>
    </div>
    <p>Confirmamos o recebimento do pagamento referente ao contrato:</p>
    <div class="highlight-box">
      <p><strong>Contrato:</strong> {{contractTitle}}</p>
      <p><strong>Valor pago:</strong> R$ {{amount}}</p>
    </div>
    <div class="cta-wrapper">
      <a href="{{baseUrl}}/payments" class="cta-button">Ver Comprovante</a>
    </div>
  `,

  contract_expiring: `
    <h2>Contrato Proximo do Vencimento</h2>
    <p>Ola,</p>
    <div class="warning-box">
      <p><strong>Atencao:</strong> Seu contrato esta proximo do vencimento.</p>
    </div>
    <div class="highlight-box">
      <p><strong>Contrato:</strong> {{contractTitle}}</p>
      <p><strong>Dias restantes:</strong> {{daysRemaining}} dias</p>
    </div>
    <p>Recomendamos que voce revise os termos e providencie a renovacao o quanto antes para evitar interrupcoes.</p>
    <div class="cta-wrapper">
      <a href="{{renewalUrl}}" class="cta-button">Renovar Contrato</a>
    </div>
  `,

  dispute_opened: `
    <h2>Disputa Aberta</h2>
    <p>Ola,</p>
    <div class="warning-box">
      <p><strong>Uma disputa foi registrada referente a um de seus contratos.</strong></p>
    </div>
    <div class="highlight-box">
      <p><strong>Contrato:</strong> {{contractTitle}}</p>
      <p><strong>ID da Disputa:</strong> {{disputeId}}</p>
    </div>
    <p>Acesse a plataforma para visualizar os detalhes da disputa e apresentar sua manifestacao dentro do prazo estipulado.</p>
    <div class="cta-wrapper">
      <a href="{{baseUrl}}/disputes/{{disputeId}}" class="cta-button">Ver Disputa</a>
    </div>
  `,

  dispute_resolved: `
    <h2>Disputa Resolvida</h2>
    <p>Ola,</p>
    <div class="success-box">
      <p><strong>A disputa referente ao seu contrato foi resolvida.</strong></p>
    </div>
    <div class="highlight-box">
      <p><strong>Contrato:</strong> {{contractTitle}}</p>
      <p><strong>Resolucao:</strong> {{resolution}}</p>
    </div>
    <p>Acesse a plataforma para conferir os detalhes completos da resolucao.</p>
    <div class="cta-wrapper">
      <a href="{{baseUrl}}/disputes" class="cta-button">Ver Detalhes</a>
    </div>
  `,

  overdue_notice: `
    <h2>Aviso de Inadimplencia</h2>
    <p>Ola,</p>
    <div class="warning-box">
      <p><strong>Pagamento em atraso!</strong></p>
    </div>
    <p>Identificamos um pagamento em atraso referente ao seu contrato:</p>
    <div class="highlight-box">
      <p><strong>Contrato:</strong> {{contractTitle}}</p>
      <p><strong>Valor original:</strong> R$ {{amount}}</p>
      <p><strong>Dias em atraso:</strong> {{daysOverdue}} dias</p>
      <p><strong>Multa acumulada:</strong> R$ {{fineAmount}}</p>
      <p><strong>Total devido:</strong> R$ {{totalDue}}</p>
    </div>
    <p>Regularize sua situacao o quanto antes para evitar acrescimos adicionais e possiveis acoes de cobranca.</p>
    <div class="cta-wrapper">
      <a href="{{baseUrl}}/payments" class="cta-button">Regularizar Pagamento</a>
    </div>
  `,

  welcome: `
    <h2>Bem-vindo ao Tabeliao!</h2>
    <p>Ola {{userName}},</p>
    <p>Seja bem-vindo a plataforma Tabeliao, sua solucao completa para gestao digital de contratos.</p>
    <div class="highlight-box">
      <p><strong>O que voce pode fazer:</strong></p>
      <p>- Criar e gerenciar contratos digitais</p>
      <p>- Assinar documentos com validade juridica</p>
      <p>- Registrar contratos em blockchain</p>
      <p>- Receber notificacoes automaticas</p>
      <p>- Gerenciar pagamentos via Pix</p>
    </div>
    <div class="cta-wrapper">
      <a href="{{baseUrl}}/dashboard" class="cta-button">Acessar Plataforma</a>
    </div>
    <p>Se precisar de ajuda, nossa equipe de suporte esta disponivel para auxilia-lo.</p>
  `,

  email_verification: `
    <h2>Verifique seu E-mail</h2>
    <p>Ola,</p>
    <p>Para completar seu cadastro na plataforma Tabeliao, confirme seu endereco de e-mail clicando no botao abaixo:</p>
    <div class="cta-wrapper">
      <a href="{{baseUrl}}/verify-email?token={{token}}" class="cta-button">Verificar E-mail</a>
    </div>
    <p style="font-size: 13px; color: #757575;">Este link expira em 24 horas. Se voce nao solicitou esta verificacao, ignore este e-mail.</p>
  `,

  password_reset: `
    <h2>Redefinicao de Senha</h2>
    <p>Ola,</p>
    <p>Recebemos uma solicitacao para redefinir a senha da sua conta Tabeliao.</p>
    <div class="cta-wrapper">
      <a href="{{baseUrl}}/reset-password?token={{token}}" class="cta-button">Redefinir Senha</a>
    </div>
    <p style="font-size: 13px; color: #757575;">Este link expira em 1 hora. Se voce nao solicitou a redefinicao de senha, ignore este e-mail e sua senha permanecera inalterada.</p>
  `,

  kyc_alert: `
    <h2>Alerta KYC - Verificacao de Contraparte</h2>
    <p>Ola,</p>
    <div class="warning-box">
      <p><strong>Alerta de risco identificado em contraparte!</strong></p>
    </div>
    <div class="highlight-box">
      <p><strong>Contraparte:</strong> {{counterpartyName}}</p>
      <p><strong>Nivel de risco:</strong> {{riskLevel}}</p>
    </div>
    <p><strong>Problemas identificados:</strong></p>
    <ul class="issue-list">
      {{#each issues}}
      <li>{{this}}</li>
      {{/each}}
    </ul>
    <p>Recomendamos cautela ao prosseguir com transacoes envolvendo esta contraparte. Consulte os detalhes completos na plataforma.</p>
    <div class="cta-wrapper">
      <a href="{{baseUrl}}/kyc/reports" class="cta-button">Ver Relatorio Completo</a>
    </div>
  `,

  generic: `
    <h2>{{title}}</h2>
    <p>Ola,</p>
    <p>{{{message}}}</p>
    {{#if ctaUrl}}
    <div class="cta-wrapper">
      <a href="{{ctaUrl}}" class="cta-button">{{ctaLabel}}</a>
    </div>
    {{/if}}
  `,
};

// ---------------------------------------------------------------------------
// Email Service
// ---------------------------------------------------------------------------

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly baseUrl: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly compiledLayout: Handlebars.TemplateDelegate;
  private readonly compiledTemplates: Map<string, Handlebars.TemplateDelegate> = new Map();

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY', '');
    if (apiKey) {
      sgMail.default.setApiKey(apiKey);
    }

    this.baseUrl = this.configService.get<string>('APP_BASE_URL', 'https://app.tabeliao.com.br');
    this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'noreply@tabeliao.com.br');
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME', 'Tabeliao');

    this.compiledLayout = Handlebars.compile(BASE_LAYOUT);

    for (const [key, template] of Object.entries(TEMPLATES)) {
      this.compiledTemplates.set(key, Handlebars.compile(template));
    }

    this.logger.log('EmailService initialized');
  }

  /**
   * Renders an email template with provided data and wraps it in the base layout.
   */
  private renderTemplate(templateId: string, data: Record<string, unknown>): string {
    const templateFn = this.compiledTemplates.get(templateId);
    if (!templateFn) {
      throw new Error(`Email template '${templateId}' not found`);
    }

    const body = templateFn(data);
    return this.compiledLayout({
      ...data,
      body,
      baseUrl: this.baseUrl,
      year: new Date().getFullYear(),
    });
  }

  /**
   * Send a templated email via SendGrid.
   */
  async sendEmail(
    to: string,
    subject: string,
    templateId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      const html = this.renderTemplate(templateId, {
        ...data,
        subject,
        baseUrl: this.baseUrl,
      });

      const msg: sgMail.MailDataRequired = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject,
        html,
      };

      await sgMail.default.send(msg);
      this.logger.log(`Email sent to ${to} [template: ${templateId}]`);
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${to}: ${errMessage}`);
      throw error;
    }
  }

  /**
   * Notify that a new contract was created.
   */
  async sendContractCreated(
    to: string,
    contractTitle: string,
    contractId: string,
  ): Promise<void> {
    await this.sendEmail(to, `Novo contrato criado: ${contractTitle}`, 'contract_created', {
      contractTitle,
      contractId,
    });
  }

  /**
   * Request a signature on a contract.
   */
  async sendSignatureRequest(
    to: string,
    signerName: string,
    contractTitle: string,
    signUrl: string,
  ): Promise<void> {
    await this.sendEmail(
      to,
      `Assinatura solicitada: ${contractTitle}`,
      'signature_request',
      { signerName, contractTitle, signUrl },
    );
  }

  /**
   * Notify that a contract was signed.
   */
  async sendContractSigned(
    to: string,
    contractTitle: string,
    allPartiesSigned: boolean,
  ): Promise<void> {
    const subject = allPartiesSigned
      ? `Contrato finalizado: ${contractTitle}`
      : `Nova assinatura: ${contractTitle}`;

    await this.sendEmail(to, subject, 'contract_signed', {
      contractTitle,
      allPartiesSigned,
    });
  }

  /**
   * Send a payment reminder with optional Pix code.
   */
  async sendPaymentReminder(
    to: string,
    contractTitle: string,
    amount: number,
    dueDate: string,
    pixCode: string,
  ): Promise<void> {
    await this.sendEmail(
      to,
      `Lembrete de pagamento: ${contractTitle}`,
      'payment_reminder',
      {
        contractTitle,
        amount: amount.toFixed(2),
        dueDate,
        pixCode,
      },
    );
  }

  /**
   * Confirm a payment was received.
   */
  async sendPaymentConfirmed(
    to: string,
    contractTitle: string,
    amount: number,
  ): Promise<void> {
    await this.sendEmail(
      to,
      `Pagamento confirmado: ${contractTitle}`,
      'payment_confirmed',
      {
        contractTitle,
        amount: amount.toFixed(2),
      },
    );
  }

  /**
   * Alert about a contract nearing expiration.
   */
  async sendContractExpiring(
    to: string,
    contractTitle: string,
    daysRemaining: number,
    renewalUrl: string,
  ): Promise<void> {
    await this.sendEmail(
      to,
      `Contrato vencendo em ${daysRemaining} dias: ${contractTitle}`,
      'contract_expiring',
      { contractTitle, daysRemaining, renewalUrl },
    );
  }

  /**
   * Notify about a dispute being opened.
   */
  async sendDisputeOpened(
    to: string,
    contractTitle: string,
    disputeId: string,
  ): Promise<void> {
    await this.sendEmail(
      to,
      `Disputa aberta: ${contractTitle}`,
      'dispute_opened',
      { contractTitle, disputeId },
    );
  }

  /**
   * Notify about a dispute being resolved.
   */
  async sendDisputeResolved(
    to: string,
    contractTitle: string,
    resolution: string,
  ): Promise<void> {
    await this.sendEmail(
      to,
      `Disputa resolvida: ${contractTitle}`,
      'dispute_resolved',
      { contractTitle, resolution },
    );
  }

  /**
   * Send an overdue payment notice with fine calculation.
   */
  async sendOverdueNotice(
    to: string,
    contractTitle: string,
    amount: number,
    daysOverdue: number,
    fineAmount: number,
  ): Promise<void> {
    const totalDue = amount + fineAmount;
    await this.sendEmail(
      to,
      `Pagamento em atraso: ${contractTitle}`,
      'overdue_notice',
      {
        contractTitle,
        amount: amount.toFixed(2),
        daysOverdue,
        fineAmount: fineAmount.toFixed(2),
        totalDue: totalDue.toFixed(2),
      },
    );
  }

  /**
   * Send a welcome email to a new user.
   */
  async sendWelcome(to: string, userName: string): Promise<void> {
    await this.sendEmail(to, 'Bem-vindo ao Tabeliao!', 'welcome', { userName });
  }

  /**
   * Send an email verification link.
   */
  async sendEmailVerification(to: string, token: string): Promise<void> {
    await this.sendEmail(to, 'Verifique seu e-mail - Tabeliao', 'email_verification', { token });
  }

  /**
   * Send a password reset link.
   */
  async sendPasswordReset(to: string, token: string): Promise<void> {
    await this.sendEmail(to, 'Redefinicao de senha - Tabeliao', 'password_reset', { token });
  }

  /**
   * Send a KYC risk alert about a counterparty.
   */
  async sendKycAlert(
    to: string,
    counterpartyName: string,
    riskLevel: string,
    issues: string[],
  ): Promise<void> {
    await this.sendEmail(
      to,
      `Alerta KYC: ${counterpartyName} - Risco ${riskLevel}`,
      'kyc_alert',
      { counterpartyName, riskLevel, issues },
    );
  }
}
