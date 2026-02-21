import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EscrowMilestoneDto {
  @ApiProperty({ description: 'Milestone label', example: 'Entrega do projeto' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({ description: 'Amount allocated to this milestone in BRL', example: 5000.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;
}

export class CreateEscrowDto {
  @ApiProperty({ description: 'Contract ID this escrow is associated with', example: 'contract-uuid-123' })
  @IsString()
  @IsNotEmpty()
  contractId!: string;

  @ApiProperty({ description: 'Total escrow amount in BRL', example: 10000.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Depositor (payer) user ID', example: 'user-uuid-depositor' })
  @IsString()
  @IsNotEmpty()
  depositorId!: string;

  @ApiProperty({ description: 'Beneficiary (payee) user ID', example: 'user-uuid-beneficiary' })
  @IsString()
  @IsNotEmpty()
  beneficiaryId!: string;

  @ApiPropertyOptional({ description: 'Deposit deadline (ISO 8601)', example: '2026-04-01T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  depositDeadline?: string;

  @ApiPropertyOptional({ description: 'Milestones for partial release', type: [EscrowMilestoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscrowMilestoneDto)
  milestones?: EscrowMilestoneDto[];
}
