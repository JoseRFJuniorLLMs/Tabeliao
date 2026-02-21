import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeType } from '../entities/dispute.entity';

export class EvidenceDto {
  @ApiProperty({
    description: 'Tipo da evidencia (documento, imagem, video, audio, etc.)',
    example: 'documento',
  })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({
    description: 'URL do arquivo de evidencia no storage',
    example: 'https://storage.tabeliao.com/evidence/doc-123.pdf',
  })
  @IsString()
  @IsNotEmpty()
  url!: string;

  @ApiProperty({
    description: 'Descricao da evidencia',
    example: 'Comprovante de pagamento realizado em 15/01/2026',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;
}

export class OpenDisputeDto {
  @ApiProperty({
    description: 'UUID do contrato em disputa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  contractId!: string;

  @ApiProperty({
    description: 'UUID da parte respondente (reu)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsNotEmpty()
  respondentId!: string;

  @ApiProperty({
    description: 'Tipo da disputa',
    enum: DisputeType,
    example: DisputeType.BREACH_OF_CONTRACT,
  })
  @IsEnum(DisputeType)
  type!: DisputeType;

  @ApiProperty({
    description: 'Descricao detalhada da disputa (minimo 50 caracteres)',
    example:
      'O prestador de servicos nao cumpriu com os prazos estabelecidos no contrato, causando prejuizos significativos ao andamento do projeto.',
    minLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(50, {
    message:
      'A descricao da disputa deve ter no minimo 50 caracteres para garantir detalhamento adequado',
  })
  description!: string;

  @ApiProperty({
    description: 'Valor em disputa (BRL)',
    example: 5000.0,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'O valor da disputa deve ser maior que zero' })
  disputeValue!: number;

  @ApiPropertyOptional({
    description: 'Evidencias iniciais da disputa',
    type: [EvidenceDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceDto)
  evidence?: EvidenceDto[];
}
