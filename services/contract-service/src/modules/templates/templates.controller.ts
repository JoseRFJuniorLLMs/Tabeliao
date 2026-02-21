import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
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
import { TemplatesService } from './templates.service';
import { RenderTemplateDto } from './dto/render-template.dto';
import { ContractType } from '../contracts/entities/contract.entity';

@ApiTags('templates')
@ApiBearerAuth()
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List all active contract templates' })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ContractType,
    description: 'Filter templates by contract type/category',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of active templates',
  })
  async findAll(@Query('category') category?: ContractType) {
    return this.templatesService.findAll(category);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List all template categories with counts' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of categories with template counts',
  })
  async getCategories() {
    return this.templatesService.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single template by ID' })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template details including variables and content',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOne(id);
  }

  @Post(':id/render')
  @ApiOperation({
    summary: 'Render a template with provided variables',
    description:
      'Fills in a Handlebars template with the provided variable values and returns the rendered contract text',
  })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rendered contract text',
    schema: {
      type: 'object',
      properties: {
        renderedContent: { type: 'string' },
        templateId: { type: 'string' },
        templateName: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Missing required variables or template rendering error',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  async render(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenderTemplateDto,
  ) {
    const template = await this.templatesService.findOne(id);
    const renderedContent = await this.templatesService.renderTemplate(
      id,
      dto.variables,
    );

    return {
      renderedContent,
      templateId: template.id,
      templateName: template.name,
    };
  }
}
