import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { SendEmailDto, SendTestEmailDto } from './dto/send-email.dto';

@ApiTags('email')
@ApiBearerAuth('access-token')
@Controller('notifications/email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a templated email',
    description: 'Sends an email using a pre-defined template with dynamic data.',
  })
  @ApiResponse({ status: 200, description: 'Email sent successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 500, description: 'Failed to send email.' })
  async sendEmail(@Body() dto: SendEmailDto): Promise<{ message: string }> {
    await this.emailService.sendEmail(dto.to, dto.subject, dto.templateId, dto.data ?? {});
    return { message: 'Email sent successfully' };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a test email',
    description: 'Sends a test email to verify the email configuration is working correctly.',
  })
  @ApiResponse({ status: 200, description: 'Test email sent successfully.' })
  @ApiResponse({ status: 500, description: 'Failed to send test email.' })
  async sendTestEmail(@Body() dto: SendTestEmailDto): Promise<{ message: string }> {
    const templateId = dto.templateId ?? 'welcome';
    const testData: Record<string, unknown> = {
      userName: 'Teste',
      contractTitle: 'Contrato de Teste',
      contractId: 'test-contract-001',
      signerName: 'Usuario Teste',
      signUrl: 'https://app.tabeliao.com.br/sign/test',
      amount: '1500.00',
      dueDate: '15/03/2026',
      pixCode: '00020126580014BR.GOV.BCB.PIX0136test-pix-key',
      daysRemaining: 30,
      renewalUrl: 'https://app.tabeliao.com.br/renew/test',
      disputeId: 'dispute-test-001',
      resolution: 'Acordo entre as partes',
      daysOverdue: 5,
      fineAmount: '75.00',
      totalDue: '1575.00',
      token: 'test-token-123',
      counterpartyName: 'Empresa Teste Ltda',
      riskLevel: 'ALTO',
      issues: ['Pendencia fiscal identificada', 'Historico de inadimplencia'],
      allPartiesSigned: true,
      title: 'E-mail de Teste',
      message: 'Este e um e-mail de teste da plataforma Tabeliao.',
    };

    await this.emailService.sendEmail(
      dto.to,
      `[TESTE] Tabeliao - Template: ${templateId}`,
      templateId,
      testData,
    );

    return { message: `Test email sent to ${dto.to} using template '${templateId}'` };
  }
}
