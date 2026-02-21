import { IsOptional, IsString, IsEmail, Length, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Maria Silva' })
  @IsOptional()
  @IsString()
  @Length(2, 255)
  name?: string;

  @ApiPropertyOptional({ example: 'maria@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+5511999999999' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{10,14}$/, {
    message: 'Phone number must be a valid international format',
  })
  phone?: string;

  @ApiPropertyOptional({ example: '12345678000195' })
  @IsOptional()
  @IsString()
  @Length(14, 18)
  cnpj?: string;
}
