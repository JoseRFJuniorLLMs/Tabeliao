import { IsEnum, IsOptional, IsString, IsIP } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SignatureType } from '../entities/signature.entity';

export class SignContractDto {
  @ApiProperty({
    description: 'Type of signature being applied',
    enum: SignatureType,
    example: SignatureType.SIMPLE,
  })
  @IsEnum(SignatureType)
  signatureType!: SignatureType;

  @ApiPropertyOptional({
    description: 'Gov.br authentication token for validated signatures',
  })
  @IsString()
  @IsOptional()
  govbrToken?: string;

  @ApiPropertyOptional({
    description: 'ICP-Brasil certificate ID for qualified signatures',
  })
  @IsString()
  @IsOptional()
  certificateId?: string;

  @ApiPropertyOptional({
    description: 'IP address of the signer (auto-detected if not provided)',
  })
  @IsIP()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'User agent string of the signer (auto-detected if not provided)',
  })
  @IsString()
  @IsOptional()
  userAgent?: string;
}
