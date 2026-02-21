import { IsEnum, IsOptional, IsNumber, IsDateString, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AdjustmentIndexType {
  IGPM = 'IGPM',
  IPCA = 'IPCA',
  SELIC = 'SELIC',
  CUSTOM = 'CUSTOM',
}

export class CalculateAdjustmentDto {
  @ApiProperty({
    description: 'Index type for price adjustment',
    enum: AdjustmentIndexType,
    example: AdjustmentIndexType.IGPM,
  })
  @IsEnum(AdjustmentIndexType)
  indexType!: AdjustmentIndexType;

  @ApiPropertyOptional({
    description: 'Custom rate percentage (required when indexType is CUSTOM)',
    example: 5.5,
  })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  customRate?: number;
}

export class ProposeRenewalDto {
  @ApiProperty({
    description: 'New contract value for the renewal period',
    example: 2750.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  newValue!: number;

  @ApiProperty({
    description: 'New expiration date for the renewed contract',
    example: '2027-12-31T23:59:59.000Z',
  })
  @IsDateString()
  newExpiresAt!: string;

  @ApiPropertyOptional({
    description: 'Notes or justification for the renewal proposal',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
