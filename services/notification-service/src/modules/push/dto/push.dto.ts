import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsArray,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendPushDto {
  @ApiProperty({ description: 'Target user ID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Push notification title', example: 'Novo contrato para assinar' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Push notification body text', example: 'Voce recebeu um contrato de aluguel para revisao.' })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({
    description: 'Additional data payload',
    example: { contractId: 'abc-123', action: 'OPEN_CONTRACT' },
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, string>;
}

export class SendBulkPushDto {
  @ApiProperty({
    description: 'Target user IDs',
    example: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  userIds!: string[];

  @ApiProperty({ description: 'Push notification title', example: 'Atualizacao do sistema' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Push notification body text', example: 'Uma nova versao da plataforma esta disponivel.' })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({ description: 'Additional data payload' })
  @IsObject()
  @IsOptional()
  data?: Record<string, string>;
}

export class RegisterDeviceDto {
  @ApiProperty({ description: 'User ID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'FCM device token', example: 'dGhpcyBpcyBhIHRlc3QgdG9rZW4...' })
  @IsString()
  @IsNotEmpty()
  deviceToken!: string;

  @ApiProperty({
    description: 'Device platform',
    enum: ['ios', 'android', 'web'],
    example: 'android',
  })
  @IsString()
  @IsIn(['ios', 'android', 'web'])
  platform!: 'ios' | 'android' | 'web';
}

export class UnregisterDeviceDto {
  @ApiProperty({ description: 'User ID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'FCM device token to unregister', example: 'dGhpcyBpcyBhIHRlc3QgdG9rZW4...' })
  @IsString()
  @IsNotEmpty()
  deviceToken!: string;
}
