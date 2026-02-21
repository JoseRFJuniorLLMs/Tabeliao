import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractType } from '../../../common/contract-type.enum';

export class ReviewContractDto {
  @ApiProperty({
    description: 'Conteudo textual do contrato a ser revisado',
    example:
      'CONTRATO DE LOCACAO RESIDENCIAL\n\nCLAUSULA PRIMEIRA - DO OBJETO\n' +
      'O LOCADOR cede ao LOCATARIO o imovel situado na Rua das Flores, 123...',
    minLength: 50,
    maxLength: 50000,
  })
  @IsString()
  @IsNotEmpty({ message: 'O conteudo do contrato e obrigatorio' })
  @MinLength(50, {
    message: 'O conteudo do contrato deve ter no minimo 50 caracteres',
  })
  @MaxLength(50000, {
    message: 'O conteudo do contrato deve ter no maximo 50.000 caracteres',
  })
  content!: string;

  @ApiPropertyOptional({
    description: 'Tipo do contrato para analise mais precisa',
    enum: ContractType,
    example: ContractType.LOCACAO_RESIDENCIAL,
  })
  @IsOptional()
  @IsEnum(ContractType, { message: 'Tipo de contrato invalido' })
  type?: ContractType;
}
