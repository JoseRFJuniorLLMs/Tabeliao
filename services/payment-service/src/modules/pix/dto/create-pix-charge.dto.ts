import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, Matches } from 'class-validator';

export class CreatePixChargeDto {
  @ApiProperty({ description: 'Amount in BRL', example: 1500.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Payer CPF (11 digits) or CNPJ (14 digits)', example: '12345678900' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}(\d{3})?$/, { message: 'payerCpf must be a valid CPF (11 digits) or CNPJ (14 digits)' })
  payerCpf!: string;

  @ApiProperty({ description: 'Payment description', example: 'Pagamento contrato de locacao #123' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ description: 'Expiration in seconds (default: 3600)', example: 3600 })
  @IsOptional()
  @IsNumber()
  @Min(60)
  expiresIn?: number;
}
