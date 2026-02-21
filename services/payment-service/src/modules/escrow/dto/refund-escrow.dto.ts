import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefundEscrowDto {
  @ApiProperty({ description: 'Reason for the refund', example: 'Contrato cancelado por acordo mutuo' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
