import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsObject, IsOptional, Matches } from 'class-validator';

export class RegisterDocumentDto {
  @ApiProperty({
    description: 'Unique identifier of the contract',
    example: 'contract-2024-001-abc123',
  })
  @IsNotEmpty()
  @IsString()
  contractId!: string;

  @ApiProperty({
    description: 'SHA-256 hash of the document content',
    example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-fA-F0-9]{64}$/, {
    message: 'contentHash must be a valid 64-character hexadecimal SHA-256 hash',
  })
  contentHash!: string;

  @ApiPropertyOptional({
    description: 'Additional metadata to associate with the registration',
    example: { documentType: 'contract', version: '1.0', parties: ['Alice', 'Bob'] },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
