import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CloseDisputeDto {
  @ApiProperty({
    description: 'Resolucao final da disputa',
    example:
      'Apos analise das evidencias apresentadas, determina-se que a parte reclamante tem direito ao reembolso parcial de 60% do valor em disputa.',
    minLength: 30,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(30, {
    message: 'A resolucao deve ter no minimo 30 caracteres para garantir detalhamento adequado',
  })
  resolution!: string;
}
