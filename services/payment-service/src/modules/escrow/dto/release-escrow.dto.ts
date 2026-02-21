import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class ReleaseEscrowDto {
  @ApiProperty({
    description: 'List of user IDs who approved the release (both parties or arbiter)',
    example: ['user-uuid-depositor', 'user-uuid-beneficiary'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  approvedBy!: string[];
}
