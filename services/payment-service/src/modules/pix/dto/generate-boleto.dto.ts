import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BoletoPayerDataDto {
  @ApiProperty({ description: 'Payer full name', example: 'Maria da Silva' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Payer CPF or CNPJ (digits only)', example: '12345678900' })
  @IsString()
  @Matches(/^\d{11}(\d{3})?$/, { message: 'document must be a valid CPF (11) or CNPJ (14)' })
  document!: string;

  @ApiPropertyOptional({ description: 'Street address', example: 'Rua das Flores, 123' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Sao Paulo' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State (UF)', example: 'SP' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'CEP (postal code)', example: '01310-100' })
  @IsOptional()
  @IsString()
  cep?: string;
}

export class GenerateBoletoDto {
  @ApiProperty({ description: 'Amount in BRL', example: 2500.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Payer data', type: BoletoPayerDataDto })
  @ValidateNested()
  @Type(() => BoletoPayerDataDto)
  payerData!: BoletoPayerDataDto;

  @ApiProperty({ description: 'Due date (ISO 8601)', example: '2026-03-15' })
  @IsDateString()
  dueDate!: string;

  @ApiProperty({ description: 'Boleto description', example: 'Parcela 1/12 - Contrato #456' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}
