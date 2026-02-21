import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartyDto } from './create-contract.dto';
import { ContractClause } from '../entities/contract.entity';

export class ClauseDto {
  @IsNumber()
  number!: number;

  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  isOptional?: boolean;
}

export class UpdateContractDto {
  @ApiPropertyOptional({ description: 'Updated title', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({ description: 'Updated contract content' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'Updated list of parties',
    type: [PartyDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartyDto)
  @IsOptional()
  parties?: PartyDto[];

  @ApiPropertyOptional({
    description: 'Updated list of clauses',
    type: [ClauseDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClauseDto)
  @IsOptional()
  clauses?: ContractClause[];

  @ApiPropertyOptional({ description: 'Updated total value' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  totalValue?: number;

  @ApiPropertyOptional({ description: 'Updated currency code' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Updated expiration date' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Updated metadata' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
