import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@ApiProperty()
export class RegisterArbitratorDto {
  @ApiProperty({
    description: 'Numero de inscricao na OAB',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{1,7}$/, {
    message: 'Numero OAB deve conter apenas digitos (1 a 7 digitos)',
  })
  oabNumber!: string;

  @ApiProperty({
    description: 'Estado da OAB (sigla de 2 caracteres)',
    example: 'SP',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 2, { message: 'O estado da OAB deve ter exatamente 2 caracteres' })
  @Matches(/^[A-Z]{2}$/, {
    message: 'O estado da OAB deve ser uma sigla em maiusculas (ex: SP, RJ, MG)',
  })
  oabState!: string;

  @ApiProperty({
    description: 'Areas de especialidade do arbitrador',
    example: ['Direito Contratual', 'Direito do Consumidor', 'Direito Imobiliario'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  specialties!: string[];

  @ApiPropertyOptional({
    description: 'Numero maximo de casos simultaneos',
    example: 5,
    minimum: 1,
    maximum: 20,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxConcurrentCases?: number;

  @ApiPropertyOptional({
    description: 'Biografia profissional do arbitrador',
    example:
      'Advogado com 15 anos de experiencia em direito contratual e resolucao de disputas comerciais.',
  })
  @IsOptional()
  @IsString()
  bio?: string;
}
