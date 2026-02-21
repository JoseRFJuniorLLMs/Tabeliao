import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsObject,
  IsOptional,
  ValidateNested,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EscrowPartiesDto {
  @ApiProperty({
    description: 'Ethereum address of the depositor',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'depositor must be a valid Ethereum address' })
  depositor!: string;

  @ApiProperty({
    description: 'Ethereum address of the beneficiary',
    example: '0xabcdef1234567890abcdef1234567890abcdef12',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'beneficiary must be a valid Ethereum address' })
  beneficiary!: string;
}

export class CreateEscrowDto {
  @ApiProperty({
    description: 'Unique identifier of the contract',
    example: 'contract-2024-001-abc123',
  })
  @IsNotEmpty()
  @IsString()
  contractId!: string;

  @ApiProperty({
    description: 'Amount to be held in escrow (in MATIC)',
    example: 1.5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.001)
  amount!: number;

  @ApiProperty({
    description: 'Depositor and beneficiary addresses',
    type: EscrowPartiesDto,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => EscrowPartiesDto)
  parties!: EscrowPartiesDto;

  @ApiPropertyOptional({
    description: 'Conditions under which escrow funds can be released',
    example: { type: 'MUTUAL_APPROVAL' },
  })
  @IsOptional()
  @IsObject()
  releaseConditions?: Record<string, unknown>;
}

export class DepositDto {
  @ApiProperty({
    description: 'Amount deposited (in MATIC)',
    example: 1.5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.001)
  amount!: number;

  @ApiProperty({
    description: 'Transaction hash of the on-chain deposit',
    example: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{64}$/, { message: 'txHash must be a valid transaction hash' })
  txHash!: string;
}

export class ReleaseDto {
  @ApiProperty({
    description: 'Address of the party approving the release',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'approvedBy must be a valid Ethereum address' })
  approvedBy!: string;
}

export class RefundDto {
  @ApiProperty({
    description: 'Reason for the refund',
    example: 'Contract cancelled by mutual agreement',
  })
  @IsNotEmpty()
  @IsString()
  reason!: string;
}

export class FreezeDto {
  @ApiProperty({
    description: 'Dispute ID that triggered the freeze',
    example: 'dispute-2024-001-xyz',
  })
  @IsNotEmpty()
  @IsString()
  disputeId!: string;
}

export class PartialReleaseDto {
  @ApiProperty({
    description: 'Amount to release (in MATIC)',
    example: 0.5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.001)
  amount!: number;

  @ApiProperty({
    description: 'Milestone identifier for the partial release',
    example: 'milestone-1-delivery',
  })
  @IsNotEmpty()
  @IsString()
  milestone!: string;
}
