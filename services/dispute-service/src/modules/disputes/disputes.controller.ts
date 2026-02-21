import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Headers,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DisputesService } from './disputes.service';
import { OpenDisputeDto, EvidenceDto } from './dto/open-dispute.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { EscalateDisputeDto } from './dto/escalate-dispute.dto';
import { CloseDisputeDto } from './dto/close-dispute.dto';
import { DisputeStatus } from './entities/dispute.entity';

@ApiTags('disputes')
@ApiBearerAuth()
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @ApiOperation({ summary: 'Abrir uma nova disputa' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Disputa aberta com sucesso. Escrow congelado e partes notificadas.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados invalidos ou disputa ja existente para este contrato',
  })
  async openDispute(
    @Body() dto: OpenDisputeDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.disputesService.openDispute(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar disputas do usuario' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: DisputeStatus,
    description: 'Filtrar por status da disputa',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de disputas do usuario',
  })
  async getDisputesByUser(
    @Headers('x-user-id') userId: string,
    @Query('status') status?: DisputeStatus,
  ) {
    return this.disputesService.getDisputesByUser(userId, status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatisticas gerais de disputas' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estatisticas de disputas (total, abertas, resolvidas, media de dias)',
  })
  async getDisputeStats() {
    return this.disputesService.getDisputeStats();
  }

  @Get('contract/:contractId')
  @ApiOperation({ summary: 'Listar disputas de um contrato especifico' })
  @ApiParam({ name: 'contractId', description: 'UUID do contrato' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de disputas do contrato',
  })
  async getDisputesByContract(
    @Param('contractId', ParseUUIDPipe) contractId: string,
  ) {
    return this.disputesService.getDisputesByContract(contractId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma disputa' })
  @ApiParam({ name: 'id', description: 'UUID da disputa' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detalhes completos da disputa com mensagens',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Disputa nao encontrada',
  })
  async getDispute(@Param('id', ParseUUIDPipe) id: string) {
    return this.disputesService.getDispute(id);
  }

  @Post(':id/evidence')
  @ApiOperation({ summary: 'Adicionar evidencia a uma disputa' })
  @ApiParam({ name: 'id', description: 'UUID da disputa' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Evidencia adicionada com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Disputa ja resolvida ou fechada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuario nao e participante da disputa',
  })
  async addEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() evidence: EvidenceDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.disputesService.addEvidence(id, evidence, userId);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Enviar mensagem na disputa' })
  @ApiParam({ name: 'id', description: 'UUID da disputa' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Mensagem enviada com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Disputa ja resolvida ou fechada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuario nao e participante da disputa ou nao pode enviar mensagens privadas',
  })
  async sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @Headers('x-user-id') senderId: string,
  ) {
    return this.disputesService.sendMessage(id, senderId, dto.content, dto.isPrivate);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Obter mensagens da disputa' })
  @ApiParam({ name: 'id', description: 'UUID da disputa' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de mensagens (mensagens privadas visiveis apenas para arbitradores)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Disputa nao encontrada',
  })
  async getMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.disputesService.getMessages(id, userId);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Aceitar resolucao proposta' })
  @ApiParam({ name: 'id', description: 'UUID da disputa' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Aceitacao registrada. Se ambas as partes aceitarem, a disputa e resolvida automaticamente.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Sem resolucao proposta ou ja aceita anteriormente',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Apenas as partes da disputa podem aceitar a resolucao',
  })
  async acceptResolution(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.disputesService.acceptResolution(id, userId);
  }

  @Post(':id/escalate')
  @ApiOperation({ summary: 'Escalar disputa para nivel superior' })
  @ApiParam({ name: 'id', description: 'UUID da disputa' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Disputa escalada com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Disputa ja resolvida ou fechada',
  })
  async escalateDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EscalateDisputeDto,
  ) {
    return this.disputesService.escalateDispute(id, dto.reason);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Encerrar disputa (apenas arbitrador)' })
  @ApiParam({ name: 'id', description: 'UUID da disputa' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Disputa encerrada com decisao vinculante do arbitrador',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Disputa ja resolvida ou fechada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Apenas o arbitrador designado pode encerrar a disputa',
  })
  async closeDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseDisputeDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.disputesService.closeDispute(id, dto.resolution, userId);
  }
}
