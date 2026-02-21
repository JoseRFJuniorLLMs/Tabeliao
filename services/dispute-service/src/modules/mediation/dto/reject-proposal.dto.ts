import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectProposalDto {
  @ApiProperty({
    description: 'Motivo da rejeicao da proposta de mediacao',
    example:
      'O valor proposto nao cobre os prejuizos reais sofridos. Solicito reavaliacao com base nas evidencias adicionais apresentadas.',
    minLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20, {
    message: 'O motivo da rejeicao deve ter no minimo 20 caracteres',
  })
  reason!: string;
}
