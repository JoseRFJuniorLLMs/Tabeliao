import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationEventType } from '../notification-dispatcher.service';

export class NotificationDataDto {
  @ApiPropertyOptional({ description: 'Recipient email address', example: 'user@example.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Recipient phone number', example: '+5511999998888' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'User display name', example: 'Joao Silva' })
  @IsString()
  @IsOptional()
  userName?: string;

  @ApiPropertyOptional({ description: 'Contract title', example: 'Aluguel Apt 302 - Rua das Flores' })
  @IsString()
  @IsOptional()
  contractTitle?: string;

  @ApiPropertyOptional({ description: 'Contract ID', example: 'abc-123-def-456' })
  @IsString()
  @IsOptional()
  contractId?: string;

  @ApiPropertyOptional({ description: 'Signer name', example: 'Maria Santos' })
  @IsString()
  @IsOptional()
  signerName?: string;

  @ApiPropertyOptional({ description: 'Signature URL', example: 'https://app.tabeliao.com.br/sign/abc123' })
  @IsString()
  @IsOptional()
  signUrl?: string;

  @ApiPropertyOptional({ description: 'Whether all parties have signed', example: false })
  @IsBoolean()
  @IsOptional()
  allPartiesSigned?: boolean;

  @ApiPropertyOptional({ description: 'Payment amount in BRL', example: 1500.00 })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'Payment due date', example: '15/03/2026' })
  @IsString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Pix payment code' })
  @IsString()
  @IsOptional()
  pixCode?: string;

  @ApiPropertyOptional({ description: 'Days remaining until expiry', example: 30 })
  @IsNumber()
  @IsOptional()
  daysRemaining?: number;

  @ApiPropertyOptional({ description: 'Renewal URL' })
  @IsString()
  @IsOptional()
  renewalUrl?: string;

  @ApiPropertyOptional({ description: 'New value after IGPM adjustment', example: '1650.00' })
  @IsString()
  @IsOptional()
  newValue?: string;

  @ApiPropertyOptional({ description: 'Dispute ID' })
  @IsString()
  @IsOptional()
  disputeId?: string;

  @ApiPropertyOptional({ description: 'Dispute resolution text' })
  @IsString()
  @IsOptional()
  resolution?: string;

  @ApiPropertyOptional({ description: 'Days overdue', example: 5 })
  @IsNumber()
  @IsOptional()
  daysOverdue?: number;

  @ApiPropertyOptional({ description: 'Fine amount', example: 75.00 })
  @IsNumber()
  @IsOptional()
  fineAmount?: number;

  @ApiPropertyOptional({ description: 'Verification or reset token' })
  @IsString()
  @IsOptional()
  token?: string;

  @ApiPropertyOptional({ description: 'SMS verification code', example: '123456' })
  @IsString()
  @IsOptional()
  verificationCode?: string;

  @ApiPropertyOptional({ description: 'Counterparty name for KYC', example: 'Empresa ABC Ltda' })
  @IsString()
  @IsOptional()
  counterpartyName?: string;

  @ApiPropertyOptional({ description: 'Risk level', example: 'ALTO', enum: ['BAIXO', 'MEDIO', 'ALTO', 'CRITICO'] })
  @IsString()
  @IsOptional()
  riskLevel?: string;

  @ApiPropertyOptional({ description: 'KYC issues list', example: ['Pendencia fiscal', 'Historico de inadimplencia'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  issues?: string[];

  @ApiPropertyOptional({ description: 'Custom push notification title' })
  @IsString()
  @IsOptional()
  pushTitle?: string;

  @ApiPropertyOptional({ description: 'Custom push notification body' })
  @IsString()
  @IsOptional()
  pushBody?: string;

  @ApiPropertyOptional({ description: 'Custom push notification data payload' })
  @IsObject()
  @IsOptional()
  pushData?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Action descriptor', example: 'criado' })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ description: 'Generic message text' })
  @IsString()
  @IsOptional()
  message?: string;
}

export class DispatchNotificationDto {
  @ApiProperty({ description: 'Target user ID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    description: 'Notification event type',
    enum: NotificationEventType,
    example: NotificationEventType.CONTRACT_CREATED,
  })
  @IsEnum(NotificationEventType)
  eventType!: NotificationEventType;

  @ApiPropertyOptional({
    description: 'Channels to send through. If empty, uses defaults for the event type.',
    enum: NotificationType,
    isArray: true,
    example: [NotificationType.EMAIL, NotificationType.PUSH],
  })
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  @IsOptional()
  channels?: NotificationType[];

  @ApiProperty({ description: 'Notification data payload', type: NotificationDataDto })
  @IsObject()
  @IsNotEmpty()
  data!: NotificationDataDto;
}
