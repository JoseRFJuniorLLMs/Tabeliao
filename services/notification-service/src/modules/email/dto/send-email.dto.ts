import { IsString, IsEmail, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({ description: 'Recipient email address', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({ description: 'Email subject line', example: 'Novo contrato criado' })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty({
    description: 'Template identifier',
    example: 'contract_created',
    enum: [
      'contract_created', 'signature_request', 'contract_signed', 'payment_reminder',
      'payment_confirmed', 'contract_expiring', 'dispute_opened', 'dispute_resolved',
      'overdue_notice', 'welcome', 'email_verification', 'password_reset', 'kyc_alert', 'generic',
    ],
  })
  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @ApiPropertyOptional({ description: 'Template data object', example: { contractTitle: 'Aluguel Apt 302', contractId: 'abc-123' } })
  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;
}

export class SendTestEmailDto {
  @ApiProperty({ description: 'Recipient email address for test', example: 'dev@tabeliao.com.br' })
  @IsEmail()
  @IsNotEmpty()
  to!: string;

  @ApiPropertyOptional({
    description: 'Template to test (defaults to welcome)',
    example: 'welcome',
  })
  @IsString()
  @IsOptional()
  templateId?: string;
}
