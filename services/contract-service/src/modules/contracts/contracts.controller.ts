import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Headers,
  Res,
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
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { SignContractDto } from './dto/sign-contract.dto';
import { QueryContractsDto } from './dto/query-contracts.dto';
import { ContractStatus } from './entities/contract.entity';

@ApiTags('contracts')
@ApiBearerAuth()
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contract' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Contract created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(
    @Body() dto: CreateContractDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.contractsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List contracts with pagination and filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of contracts',
  })
  async findAll(
    @Headers('x-user-id') userId: string,
    @Query() query: QueryContractsDto,
  ) {
    return this.contractsService.findAll(userId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get contract statistics for the current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contract statistics (total, by status, by type, total value)',
  })
  async getStats(@Headers('x-user-id') userId: string) {
    return this.contractsService.getStats(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single contract with all relations' })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contract details with signatures and events',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contractsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft contract' })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contract updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Contract is not in DRAFT status or user is not the creator',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.contractsService.update(id, dto, userId);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Sign a contract' })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contract signed successfully. If all parties signed, status becomes ACTIVE.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Contract cannot be signed (wrong status or user not a party)',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User has already signed this contract',
  })
  async sign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignContractDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.contractsService.sign(id, userId, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel or terminate a contract' })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Reason for cancellation/termination',
          example: 'Acordo mutuo entre as partes',
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contract cancelled/terminated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Contract cannot be cancelled',
  })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.contractsService.cancel(id, userId, reason);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get the full event timeline for a contract' })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of contract events in chronological order',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found',
  })
  async getTimeline(@Param('id', ParseUUIDPipe) id: string) {
    return this.contractsService.getTimeline(id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Generate and download contract PDF' })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PDF file download',
    content: { 'application/pdf': {} },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found',
  })
  async generatePdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const contract = await this.contractsService.findOne(id);
    const pdfBuffer = await this.contractsService.generatePdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="contrato-${contract.contractNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
