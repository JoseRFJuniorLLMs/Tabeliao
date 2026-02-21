import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReviewerService } from './reviewer.service';
import { ReviewContractDto } from './dto/review-contract.dto';
import { ReviewResult, ReviewUploadResult } from './types';
import { ContractType } from '../../common/contract-type.enum';

@ApiTags('reviewer')
@ApiBearerAuth()
@Controller('ai/review')
export class ReviewerController {
  constructor(private readonly reviewerService: ReviewerService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revisar contrato por texto',
    description:
      'Recebe o texto de um contrato e realiza uma analise completa, ' +
      'identificando clausulas abusivas, irregularidades e riscos juridicos ' +
      'com base na legislacao brasileira vigente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Revisao concluida com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados de entrada invalidos',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno ao revisar o contrato',
  })
  async reviewContract(
    @Body() dto: ReviewContractDto,
  ): Promise<ReviewResult> {
    return this.reviewerService.reviewContract(dto.content, dto.type);
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Revisar contrato por upload de arquivo',
    description:
      'Recebe um arquivo PDF ou DOCX contendo um contrato, extrai o texto ' +
      'e realiza a mesma analise completa de clausulas abusivas e riscos.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo PDF ou DOCX do contrato',
        },
        type: {
          type: 'string',
          enum: Object.values(ContractType),
          description: 'Tipo do contrato (opcional)',
        },
      },
      required: ['file'],
    },
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ContractType,
    description: 'Tipo do contrato para analise mais precisa',
  })
  @ApiResponse({
    status: 200,
    description: 'Revisao do documento concluida com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Arquivo invalido ou formato nao suportado',
  })
  async reviewUploadedDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType:
              /(application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/msword)/,
          }),
        ],
        fileIsRequired: true,
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    file: Express.Multer.File,
    @Query('type') type?: ContractType,
  ): Promise<ReviewUploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    return this.reviewerService.reviewUploadedDocument(
      file.buffer,
      file.mimetype,
      type,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter resultado de revisao anterior',
    description:
      'Recupera o resultado de uma revisao ja realizada anteriormente pelo seu ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID unico da revisao',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado da revisao encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Revisao nao encontrada',
  })
  async getReviewResult(@Param('id') id: string): Promise<ReviewResult> {
    const review = this.reviewerService.getReviewById(id);

    if (!review) {
      throw new NotFoundException(
        `Revisao com ID ${id} nao encontrada. As revisoes ficam disponiveis temporariamente.`,
      );
    }

    return review;
  }
}
