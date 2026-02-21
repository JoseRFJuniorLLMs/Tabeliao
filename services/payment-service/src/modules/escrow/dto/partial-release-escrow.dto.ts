import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class PartialReleaseEscrowDto {
  @ApiProperty({ description: 'Amount to release in BRL', example: 2500.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Milestone identifier or label', example: 'Entrega fase 1' })
  @IsString()
  @IsNotEmpty()
  milestone!: string;
}
