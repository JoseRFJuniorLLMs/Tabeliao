import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  HttpStatus,
  ParseUUIDPipe,
  ParseFloatPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MediationService } from './mediation.service';
import { RejectProposalDto } from './dto/reject-proposal.dto';

@ApiTags('mediation')
@ApiBearerAuth()
@Controller('mediation')
export class MediationController {
  constructor(private readonly mediationService: MediationService) {}

  @Post('ai-analysis/:disputeId')
  @ApiOperation({ summary: 'Solicitar analise por IA da disputa' })
  @ApiParam({ name: 'disputeId', description: 'UUID da disputa' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Analise completa por IA com avaliacao juridica, achados fatuais, resolucao recomendada e score de confianca',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Valor da disputa excede o limite para mediacao por IA (R$ 5.000) ou falha na analise',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Disputa nao encontrada',
  })
  async requestAiAnalysis(
    @Param('disputeId', ParseUUIDPipe) disputeId: string,
  ) {
    return this.mediationService.requestAiAnalysis(disputeId);
  }

  @Post('proposal/:disputeId')
  @ApiOperation({ summary: 'Gerar proposta de mediacao baseada na analise por IA' })
  @ApiParam({ name: 'disputeId', description: 'UUID da disputa' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Proposta de mediacao gerada com valor, prazo e condicoes. Aguardando aceitacao de ambas as partes.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Analise por IA nao realizada ou confianca muito baixa para gerar proposta',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Disputa nao encontrada',
  })
  async generateProposal(
    @Param('disputeId', ParseUUIDPipe) disputeId: string,
  ) {
    return this.mediationService.generateMediationProposal(disputeId);
  }

  @Post('accept/:disputeId')
  @ApiOperation({ summary: 'Aceitar proposta de mediacao por IA' })
  @ApiParam({ name: 'disputeId', description: 'UUID da disputa' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Aceitacao registrada. Se ambas as partes aceitarem, a disputa e resolvida automaticamente.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Nao ha proposta aguardando aceitacao ou voce ja aceitou',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Apenas as partes da disputa podem aceitar a proposta',
  })
  async acceptProposal(
    @Param('disputeId', ParseUUIDPipe) disputeId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.mediationService.acceptAiProposal(disputeId, userId);
  }

  @Post('reject/:disputeId')
  @ApiOperation({ summary: 'Rejeitar proposta de mediacao por IA' })
  @ApiParam({ name: 'disputeId', description: 'UUID da disputa' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Proposta rejeitada. Disputa automaticamente escalada para arbitragem humana.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Nao ha proposta aguardando aceitacao',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Apenas as partes da disputa podem rejeitar a proposta',
  })
  async rejectProposal(
    @Param('disputeId', ParseUUIDPipe) disputeId: string,
    @Body() dto: RejectProposalDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.mediationService.rejectAiProposal(disputeId, userId, dto.reason);
  }

  @Get('eligible/:disputeValue')
  @ApiOperation({
    summary: 'Verificar elegibilidade para mediacao por IA',
  })
  @ApiParam({
    name: 'disputeValue',
    description: 'Valor da disputa em BRL',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resultado da verificacao de elegibilidade (limite R$ 5.000)',
  })
  async checkEligibility(
    @Param('disputeValue', ParseFloatPipe) disputeValue: number,
  ) {
    const eligible = this.mediationService.isEligibleForAiMediation(disputeValue);
    return {
      disputeValue,
      eligible,
      maxValue: 5000,
      currency: 'BRL',
      message: eligible
        ? 'Disputa elegivel para mediacao assistida por IA'
        : 'Valor excede o limite para mediacao por IA. Utilize arbitragem humana.',
    };
  }
}
