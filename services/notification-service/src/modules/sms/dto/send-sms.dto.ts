import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendSmsDto {
  @ApiProperty({ description: 'Recipient phone number (Brazilian format)', example: '+5511999998888' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ description: 'SMS message content (max 160 chars recommended)', example: 'Seu contrato foi assinado com sucesso.' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ description: 'Whether this is a critical/urgent alert', default: false })
  @IsBoolean()
  @IsOptional()
  critical?: boolean;
}
