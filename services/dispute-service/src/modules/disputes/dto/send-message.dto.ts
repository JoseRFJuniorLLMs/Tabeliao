import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: 'Conteudo da mensagem',
    example: 'Segue em anexo o comprovante de pagamento conforme solicitado.',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({
    description: 'Indica se a mensagem e privada (visivel apenas para o arbitrador)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}
