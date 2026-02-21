import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsObject, IsOptional, IsEnum } from 'class-validator';

export class CheckConditionDto {
  @ApiProperty({
    description: 'Escrow ID to check conditions for',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsString()
  escrowId!: string;

  @ApiProperty({
    description: 'Type of oracle condition to check',
    example: 'RAIN_THRESHOLD',
    enum: [
      'RAIN_THRESHOLD',
      'TEMPERATURE_THRESHOLD',
      'DELIVERY_CONFIRMED',
      'INFLATION_ABOVE',
      'INFLATION_BELOW',
      'SELIC_ABOVE',
      'SELIC_BELOW',
    ],
  })
  @IsNotEmpty()
  @IsString()
  conditionType!: string;

  @ApiProperty({
    description: 'Parameters for the condition check',
    example: { threshold: 50, latitude: -23.5505, longitude: -46.6333 },
  })
  @IsNotEmpty()
  @IsObject()
  params!: Record<string, unknown>;
}

export class WeatherQueryDto {
  @ApiProperty({
    description: 'Latitude of the location',
    example: -23.5505,
  })
  @IsNotEmpty()
  @IsNumber()
  lat!: number;

  @ApiProperty({
    description: 'Longitude of the location',
    example: -46.6333,
  })
  @IsNotEmpty()
  @IsNumber()
  lng!: number;
}

export enum InflationIndexTypeEnum {
  IGPM = 'IGPM',
  IPCA = 'IPCA',
  SELIC = 'SELIC',
}

export class TrackingQueryDto {
  @ApiPropertyOptional({
    description: 'Carrier name (default: correios)',
    example: 'correios',
  })
  @IsOptional()
  @IsString()
  carrier?: string;
}
