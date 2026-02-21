import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class RefundPixDto {
  @ApiPropertyOptional({
    description: 'Amount to refund in BRL. If omitted, full refund is performed.',
    example: 50.00,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;
}
