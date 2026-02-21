import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FreezeEscrowDto {
  @ApiProperty({ description: 'Dispute ID that triggered the freeze', example: 'dispute-uuid-789' })
  @IsString()
  @IsNotEmpty()
  disputeId!: string;
}
