import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class MarkPaidDto {
  @ApiProperty({ description: 'Payment method used', example: 'PIX' })
  @IsString()
  @IsNotEmpty()
  paymentMethod!: string;

  @ApiPropertyOptional({
    description: 'Additional payment data (txid, endToEndId, etc.)',
    example: { txid: 'TAB1234567890abcdef', endToEndId: 'E123456' },
  })
  @IsOptional()
  @IsObject()
  paymentData?: Record<string, unknown>;
}
