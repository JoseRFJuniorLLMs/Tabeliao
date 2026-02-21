import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractType } from '../entities/contract.entity';

export class PartyDto {
  @ApiProperty({ description: 'User ID of the party', example: 'uuid-here' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    description: 'Role of the party in the contract',
    example: 'LANDLORD',
  })
  @IsString()
  @IsNotEmpty()
  role!: string;

  @ApiPropertyOptional({ description: 'Name of the party' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Document number (CPF/CNPJ)' })
  @IsString()
  @IsOptional()
  document?: string;

  @ApiPropertyOptional({ description: 'Email of the party' })
  @IsString()
  @IsOptional()
  email?: string;
}

export class CreateContractDto {
  @ApiProperty({
    description: 'Title of the contract',
    example: 'Contrato de Locação - Apartamento Centro SP',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @ApiProperty({
    description: 'Type of the contract',
    enum: ContractType,
    example: ContractType.RENTAL,
  })
  @IsEnum(ContractType)
  type!: ContractType;

  @ApiPropertyOptional({
    description: 'Full text content of the contract (for manual creation)',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'Original user prompt if AI-generated',
  })
  @IsString()
  @IsOptional()
  rawPrompt?: string;

  @ApiProperty({
    description: 'List of parties involved in the contract',
    type: [PartyDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartyDto)
  parties!: PartyDto[];

  @ApiPropertyOptional({
    description: 'Total monetary value of the contract',
    example: 2500.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  totalValue?: number;

  @ApiPropertyOptional({
    description: 'Currency code (ISO 4217)',
    example: 'BRL',
    default: 'BRL',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Contract expiration date (ISO 8601)',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
