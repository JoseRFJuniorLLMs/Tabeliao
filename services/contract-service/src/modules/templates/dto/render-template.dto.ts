import { IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RenderTemplateDto {
  @ApiProperty({
    description: 'Key-value map of template variables to fill in',
    example: {
      locadorNome: 'Joao da Silva',
      locadorCpf: '12345678901',
      locadorEndereco: 'Rua A, 123 - Sao Paulo, SP',
      locatarioNome: 'Maria Oliveira',
      locatarioCpf: '98765432100',
      locatarioEndereco: 'Rua B, 456 - Sao Paulo, SP',
      enderecoImovel: 'Rua C, 789, Apto 101 - Sao Paulo, SP',
      valorAluguel: 2500,
      diaVencimento: 10,
      prazoMeses: 12,
      dataInicio: '2026-03-01',
      dataFim: '2027-02-28',
    },
  })
  @IsObject()
  @IsNotEmpty()
  variables!: Record<string, unknown>;
}
