import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../../pix/types';

export class DepositEscrowDto {
  @ApiProperty({
    description: 'Payment method for the deposit',
    enum: PaymentMethod,
    example: PaymentMethod.PIX,
  })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiProperty({
    description: 'Payer data (CPF/CNPJ, name, etc.)',
    example: { cpf: '12345678900', name: 'Joao da Silva' },
  })
  @IsObject()
  @IsNotEmpty()
  payerData!: Record<string, unknown>;
}
