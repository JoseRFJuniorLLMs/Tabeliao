import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GenerateInstallmentsDto {
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

  @ApiProperty({ description: 'Total amount in BRL', example: 24000.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  totalAmount!: number;

  @ApiProperty({ description: 'Number of installments', example: 12 })
  @IsNumber()
  @Min(1)
  @Max(48)
  numberOfInstallments!: number;

  @ApiProperty({ description: 'Start date (first installment)', example: '2026-04-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'Day of month for payments (1-28)', example: 10 })
  @IsNumber()
  @Min(1)
  @Max(28)
  dayOfMonth!: number;

  @ApiProperty({ description: 'Description prefix for installments', example: 'Aluguel Sala 301' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}
