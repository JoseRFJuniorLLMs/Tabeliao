import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractType } from '../../../common/contract-type.enum';

export class GenerateContractDto {
  @ApiProperty({
    description: 'Descricao em linguagem natural do contrato desejado',
    example:
      'Preciso de um contrato de locacao residencial para um apartamento de 2 quartos ' +
      'no valor de R$ 2.500,00 por mes, prazo de 30 meses, com caucao de 3 meses.',
    minLength: 20,
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty({ message: 'O prompt e obrigatorio' })
  @MinLength(20, { message: 'O prompt deve ter no minimo 20 caracteres' })
  @MaxLength(5000, { message: 'O prompt deve ter no maximo 5000 caracteres' })
  prompt!: string;

  @ApiProperty({
    description: 'Tipo do contrato a ser gerado',
    enum: ContractType,
    example: ContractType.LOCACAO_RESIDENCIAL,
  })
  @IsEnum(ContractType, { message: 'Tipo de contrato invalido' })
  @IsNotEmpty({ message: 'O tipo de contrato e obrigatorio' })
  type!: ContractType;

  @ApiPropertyOptional({
    description: 'Contexto adicional para a geracao do contrato',
    example: {
      locador: 'Joao da Silva',
      locatario: 'Maria Santos',
      endereco: 'Rua das Flores, 123',
    },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

export class ClarifyContractDto {
  @ApiProperty({
    description: 'Descricao em linguagem natural do contrato desejado',
    example: 'Quero fazer um contrato de prestacao de servicos de desenvolvimento web',
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty({ message: 'O prompt e obrigatorio' })
  @MinLength(10, { message: 'O prompt deve ter no minimo 10 caracteres' })
  @MaxLength(5000, { message: 'O prompt deve ter no maximo 5000 caracteres' })
  prompt!: string;

  @ApiProperty({
    description: 'Tipo do contrato',
    enum: ContractType,
    example: ContractType.PRESTACAO_SERVICOS,
  })
  @IsEnum(ContractType, { message: 'Tipo de contrato invalido' })
  @IsNotEmpty({ message: 'O tipo de contrato e obrigatorio' })
  type!: ContractType;
}

export class RefineContractDto {
  @ApiProperty({
    description: 'ID do contrato a ser refinado',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty({ message: 'O ID do contrato e obrigatorio' })
  contractId!: string;

  @ApiProperty({
    description: 'Feedback ou instrucoes para refinamento do contrato',
    example:
      'Adicionar clausula de reajuste anual pelo IGPM e aumentar a multa rescisoria para 3 meses de aluguel.',
    minLength: 10,
    maxLength: 3000,
  })
  @IsString()
  @IsNotEmpty({ message: 'O feedback e obrigatorio' })
  @MinLength(10, { message: 'O feedback deve ter no minimo 10 caracteres' })
  @MaxLength(3000, { message: 'O feedback deve ter no maximo 3000 caracteres' })
  feedback!: string;
}
