import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendWhatsappDto {
  @ApiProperty({ description: 'Recipient phone number (Brazilian format)', example: '+5511999998888' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ description: 'WhatsApp template name', example: 'tabeliao_contract_notification' })
  @IsString()
  @IsNotEmpty()
  templateName!: string;

  @ApiPropertyOptional({
    description: 'Template parameters',
    example: ['Contrato de Aluguel', 'criado', 'https://app.tabeliao.com.br'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  params?: string[];
}

export class WhatsappWebhookDto {
  @ApiProperty({ description: 'Webhook event object from Meta' })
  @IsNotEmpty()
  object!: string;

  @ApiProperty({ description: 'Webhook entry array' })
  @IsArray()
  entry!: Array<Record<string, unknown>>;
}
