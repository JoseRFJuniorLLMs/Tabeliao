import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GeneratorService } from './generator.service';
import {
  GenerateContractDto,
  ClarifyContractDto,
  RefineContractDto,
} from './dto/generate-contract.dto';
import { GenerateContractResult, RefineContractResult } from './types';

@ApiTags('generator')
@ApiBearerAuth()
@Controller('ai')
export class GeneratorController {
  constructor(private readonly generatorService: GeneratorService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gerar contrato a partir de linguagem natural',
    description:
      'Recebe um prompt descritivo em linguagem natural e gera um contrato ' +
      'juridicamente valido no formato estruturado, respeitando a legislacao ' +
      'brasileira aplicavel ao tipo de contrato selecionado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contrato gerado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados de entrada invalidos',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno ao gerar o contrato',
  })
  async generateContract(
    @Body() dto: GenerateContractDto,
  ): Promise<GenerateContractResult> {
    return this.generatorService.generateContract(
      dto.prompt,
      dto.type,
      dto.context,
    );
  }

  @Post('clarify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obter perguntas de esclarecimento',
    description:
      'Analisa o prompt do usuario e retorna perguntas que devem ser ' +
      'respondidas para gerar um contrato mais completo e preciso.',
  })
  @ApiResponse({
    status: 200,
    description: 'Perguntas de esclarecimento geradas',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados de entrada invalidos',
  })
  async getClarifyingQuestions(
    @Body() dto: ClarifyContractDto,
  ): Promise<{ questions: string[] }> {
    const questions = await this.generatorService.askClarifyingQuestions(
      dto.prompt,
      dto.type,
    );
    return { questions };
  }

  @Post('refine')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refinar contrato existente',
    description:
      'Recebe o ID de um contrato gerado anteriormente e instrucoes de ' +
      'refinamento. Aplica as alteracoes solicitadas mantendo a validade juridica.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contrato refinado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados de entrada invalidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Contrato nao encontrado',
  })
  async refineContract(
    @Body() dto: RefineContractDto,
  ): Promise<RefineContractResult> {
    return this.generatorService.refineContract(dto.contractId, dto.feedback);
  }
}
