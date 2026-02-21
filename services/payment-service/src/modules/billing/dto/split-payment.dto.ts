import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SplitEntryDto {
  @ApiProperty({ description: 'User ID to receive part of the payment', example: 'user-uuid-1' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Percentage to allocate (0-100)', example: 60 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  percentage!: number;
}

export class SplitPaymentDto {
  @ApiProperty({
    description: 'Split configuration',
    type: [SplitEntryDto],
    example: [
      { userId: 'user-uuid-landlord', percentage: 90 },
      { userId: 'user-uuid-manager', percentage: 10 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitEntryDto)
  splits!: SplitEntryDto[];
}
