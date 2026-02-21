import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Contract ID', example: 'contract-uuid-123' })
  @IsString()
  @IsNotEmpty()
  contractId!: string;

  @ApiProperty({ description: 'Payer user ID', example: 'user-uuid-payer' })
  @IsString()
  @IsNotEmpty()
  payerId!: string;

  @ApiProperty({ description: 'Payee user ID', example: 'user-uuid-payee' })
  @IsString()
  @IsNotEmpty()
  payeeId!: string;

  @ApiProperty({ description: 'Invoice amount in BRL', example: 1200.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Due date (ISO 8601)', example: '2026-03-15' })
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({ description: 'Installment number', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  installment?: number;

  @ApiPropertyOptional({ description: 'Total installments', example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  totalInstallments?: number;

  @ApiProperty({ description: 'Invoice description', example: 'Parcela 1/12 - Aluguel Sala 301' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}
