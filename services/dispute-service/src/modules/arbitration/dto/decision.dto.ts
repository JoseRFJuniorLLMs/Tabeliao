import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DecisionDto {
  @ApiProperty({
    description: 'Texto completo da decisao arbitral',
    example:
      'Apos analise minuciosa das evidencias apresentadas por ambas as partes, conclui-se que houve descumprimento contratual pela parte reclamada. Determina-se o pagamento de 70% do valor em disputa ao reclamante no prazo de 10 dias uteis.',
    minLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(50, {
    message: 'A decisao arbitral deve ter no minimo 50 caracteres para garantir fundamentacao adequada',
  })
  decision!: string;

  @ApiPropertyOptional({
    description: 'Valor determinado para pagamento (se aplicavel)',
    example: 3500.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  awardedAmount?: number;

  @ApiPropertyOptional({
    description: 'Percentual do valor em disputa a ser pago pelo reclamado (0-100)',
    example: 70,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  awardedPercentage?: number;

  @ApiProperty({
    description: 'Fundamentacao juridica da decisao',
    example:
      'Com base no art. 475 do Codigo Civil e nas clausulas 3.1 e 5.2 do contrato, verifica-se que a parte reclamada nao cumpriu com suas obrigacoes contratuais.',
  })
  @IsString()
  @IsNotEmpty()
  reasoning!: string;
}

export class RateArbitratorDto {
  @ApiProperty({
    description: 'Nota para o arbitrador (1 a 5)',
    example: 4.5,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({
    description: 'Feedback sobre a atuacao do arbitrador',
    example: 'Arbitrador muito profissional e imparcial. Decisao bem fundamentada.',
  })
  @IsOptional()
  @IsString()
  feedback?: string;
}
