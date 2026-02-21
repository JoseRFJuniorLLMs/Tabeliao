import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContractStatus, ContractType } from '../entities/contract.entity';

export class QueryContractsDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by contract status',
    enum: ContractStatus,
  })
  @IsEnum(ContractStatus)
  @IsOptional()
  status?: ContractStatus;

  @ApiPropertyOptional({
    description: 'Filter by contract type',
    enum: ContractType,
  })
  @IsEnum(ContractType)
  @IsOptional()
  type?: ContractType;

  @ApiPropertyOptional({
    description: 'Search query for title and content',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
