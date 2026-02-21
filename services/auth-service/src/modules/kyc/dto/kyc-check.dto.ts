import { IsNotEmpty, IsString, IsOptional, Validate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsCpfConstraint, IsCnpjConstraint } from '../../auth/dto/register.dto';

export class KycCheckDto {
  @ApiProperty({ example: '12345678901', description: 'Brazilian CPF (11 digits)' })
  @IsString()
  @IsNotEmpty()
  @Validate(IsCpfConstraint)
  cpf!: string;

  @ApiPropertyOptional({ example: '12345678000195', description: 'Brazilian CNPJ (14 digits, optional)' })
  @IsOptional()
  @IsString()
  @Validate(IsCnpjConstraint)
  cnpj?: string;
}
