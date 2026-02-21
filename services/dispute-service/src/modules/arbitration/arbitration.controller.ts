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
  ParseFloatPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ArbitrationService } from './arbitration.service';
import { RegisterArbitratorDto } from './dto/register-arbitrator.dto';
import { DecisionDto, RateArbitratorDto } from './dto/decision.dto';

@ApiTags('arbitration')
@ApiBearerAuth()
@Controller('arbitration')
export class ArbitrationController {
  constructor(private readonly arbitrationService: ArbitrationService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar um novo arbitrador' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Arbitrador registrado com sucesso com validacao do numero OAB',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Arbitrador ja cadastrado com este numero OAB ou usuario',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados invalidos ou estado da OAB invalido',
  })
  async registerArbitrator(
    @Body() dto: RegisterArbitratorDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.arbitrationService.registerArbitrator(dto, userId);
  }

  @Get('arbitrators')
  @ApiOperation({ summary: 'Listar arbitradores disponiveis' })
  @ApiQuery({
    name: 'specialty',
    required: false,
    description: 'Filtrar por especialidade',
    example: 'Direito Contratual',
  })
  @ApiQuery({
    name: 'minRating',
    required: false,
    description: 'Rating minimo (1-5)',
    type: Number,
  })
  @ApiQuery({
    name: 'available',
    required: false,
    description: 'Filtrar apenas disponiveis',
    type: Boolean,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de arbitradores ordenada por rating e experiencia',
  })
  async getArbitrators(
    @Query('specialty') specialty?: string,
    @Query('minRating') minRating?: number,
    @Query('available') available?: boolean,
  ) {
    return this.arbitrationService.getArbitrators({
      specialty,
      minRating,
      available,
    });
  }

  @Post('assign/:disputeId')
  @ApiOperation({ summary: 'Designar arbitrador para uma disputa' })
  @ApiParam({ name: 'disputeId', description: 'UUID da disputa' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Arbitrador designado por round-robin com balanceamento de carga e afinidade de especialidade',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Disputa ja possui arbitrador ou nao ha arbitradores disponiveis',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Disputa nao encontrada',
  })
  async assignArbitrator(
    @Param('disputeId', ParseUUIDPipe) disputeId: string,
  ) {
    return this.arbitrationService.assignArbitrator(disputeId);
  }

  @Post('decision/:disputeId')
  @ApiOperation({ summary: 'Submeter decisao arbitral vinculante' })
  @ApiParam({ name: 'disputeId', description: 'UUID da disputa' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Decisao registrada. Escrow liberado/reembolsado conforme decisao. Partes notificadas.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Apenas o arbitrador designado pode submeter a decisao',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Disputa ja resolvida ou fechada',
  })
  async submitDecision(
    @Param('disputeId', ParseUUIDPipe) disputeId: string,
    @Body() dto: DecisionDto,
    @Headers('x-user-id') arbitratorId: string,
  ) {
    return this.arbitrationService.submitDecision(disputeId, arbitratorId, dto);
  }

  @Post('rate/:disputeId')
  @ApiOperation({ summary: 'Avaliar arbitrador apos resolucao da disputa' })
  @ApiParam({ name: 'disputeId', description: 'UUID da disputa' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Avaliacao registrada e media do arbitrador atualizada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Apenas as partes da disputa podem avaliar o arbitrador',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Voce ja avaliou o arbitrador nesta disputa',
  })
  async rateArbitrator(
    @Param('disputeId', ParseUUIDPipe) disputeId: string,
    @Body() dto: RateArbitratorDto,
    @Headers('x-user-id') userId: string,
  ) {
    await this.arbitrationService.rateArbitrator(
      disputeId,
      userId,
      dto.rating,
      dto.feedback ?? '',
    );
    return { message: 'Avaliacao registrada com sucesso' };
  }

  @Get('fee/:disputeValue')
  @ApiOperation({ summary: 'Calcular taxa de arbitragem' })
  @ApiParam({
    name: 'disputeValue',
    description: 'Valor da disputa em BRL',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Taxa de arbitragem calculada (R$150 a R$2.000, formula: max(150, min(2000, valor * 5%)))',
  })
  async calculateFee(
    @Param('disputeValue', ParseFloatPipe) disputeValue: number,
  ) {
    const fee = this.arbitrationService.calculateArbitrationFee(disputeValue);
    return {
      disputeValue,
      fee,
      formula: 'max(150, min(2000, disputeValue * 0.05))',
      currency: 'BRL',
    };
  }

  @Get('stats/:arbitratorId')
  @ApiOperation({ summary: 'Obter estatisticas do arbitrador' })
  @ApiParam({ name: 'arbitratorId', description: 'UUID do arbitrador' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estatisticas completas do arbitrador',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Arbitrador nao encontrado',
  })
  async getArbitratorStats(
    @Param('arbitratorId', ParseUUIDPipe) arbitratorId: string,
  ) {
    return this.arbitrationService.getArbitratorStats(arbitratorId);
  }
}
