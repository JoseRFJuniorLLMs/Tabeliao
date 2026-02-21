import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EscalateDisputeDto {
  @ApiProperty({
    description: 'Motivo para escalar a disputa',
    example:
      'As partes nao chegaram a um acordo durante a mediacao. Solicito escalonamento para arbitragem humana.',
    minLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20, {
    message: 'O motivo para escalonamento deve ter no minimo 20 caracteres',
  })
  reason!: string;
}
