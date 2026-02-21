import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OracleService } from './oracle.service';
import { CheckConditionDto } from './dto/oracle.dto';
import { InflationIndexType } from './interfaces/oracle.interfaces';

@ApiTags('Oracle')
@ApiBearerAuth()
@Controller('blockchain/oracle')
export class OracleController {
  constructor(private readonly oracleService: OracleService) {}

  @Get('inflation/:indexType')
  @ApiOperation({
    summary: 'Get current inflation index',
    description:
      'Fetches the latest inflation index value from Banco Central do Brasil. Supports IGPM, IPCA, and SELIC.',
  })
  @ApiParam({
    name: 'indexType',
    description: 'Type of inflation index',
    enum: ['IGPM', 'IPCA', 'SELIC'],
    example: 'IPCA',
  })
  @ApiResponse({ status: 200, description: 'Inflation index returned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid index type' })
  async getInflationIndex(@Param('indexType') indexType: string) {
    const validTypes: InflationIndexType[] = ['IGPM', 'IPCA', 'SELIC'];
    if (!validTypes.includes(indexType as InflationIndexType)) {
      throw new BadRequestException(
        `Invalid index type: ${indexType}. Must be one of: ${validTypes.join(', ')}`,
      );
    }

    try {
      const result = await this.oracleService.getInflationIndex(indexType as InflationIndexType);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Failed to fetch inflation index: ${message}`);
    }
  }

  @Get('weather')
  @ApiOperation({
    summary: 'Get weather data',
    description:
      'Fetches current weather data from INMET for the specified coordinates. Used for agricultural and insurance contract oracle conditions.',
  })
  @ApiQuery({ name: 'lat', description: 'Latitude', example: -23.5505, type: Number })
  @ApiQuery({ name: 'lng', description: 'Longitude', example: -46.6333, type: Number })
  @ApiResponse({ status: 200, description: 'Weather data returned successfully' })
  @ApiResponse({ status: 400, description: 'Missing or invalid coordinates' })
  async getWeatherData(@Query('lat') lat: string, @Query('lng') lng: string) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('lat and lng must be valid numbers');
    }

    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException('lat must be between -90 and 90');
    }

    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException('lng must be between -180 and 180');
    }

    try {
      const result = await this.oracleService.getWeatherData(latitude, longitude);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Failed to fetch weather data: ${message}`);
    }
  }

  @Get('tracking/:code')
  @ApiOperation({
    summary: 'Get tracking status',
    description:
      'Fetches the current tracking status for a package from Correios or another carrier. Used for delivery-based contract conditions.',
  })
  @ApiParam({
    name: 'code',
    description: 'Tracking code',
    example: 'BR123456789BR',
  })
  @ApiQuery({
    name: 'carrier',
    description: 'Carrier name (default: correios)',
    required: false,
    example: 'correios',
  })
  @ApiResponse({ status: 200, description: 'Tracking data returned successfully' })
  @ApiResponse({ status: 400, description: 'Missing tracking code' })
  async getTrackingStatus(
    @Param('code') code: string,
    @Query('carrier') carrier?: string,
  ) {
    if (!code || code.trim().length === 0) {
      throw new BadRequestException('Tracking code is required');
    }

    try {
      const result = await this.oracleService.getTrackingStatus(
        code,
        carrier || 'correios',
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Failed to fetch tracking status: ${message}`);
    }
  }

  @Post('check-condition')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check oracle condition',
    description:
      'Checks if a specific oracle condition is met. Conditions can be based on weather (rain/temperature thresholds), delivery status, or economic indicators (inflation/SELIC).',
  })
  @ApiResponse({ status: 200, description: 'Condition check result returned' })
  @ApiResponse({ status: 400, description: 'Invalid condition type or parameters' })
  async checkCondition(@Body() dto: CheckConditionDto) {
    try {
      const result = await this.oracleService.checkOracleCondition(
        dto.escrowId,
        dto.conditionType,
        dto.params,
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Unknown oracle condition type')) {
        throw new BadRequestException(message);
      }
      throw new InternalServerErrorException(`Condition check failed: ${message}`);
    }
  }
}
