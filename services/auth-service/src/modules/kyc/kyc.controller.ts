import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { KycService, KycFullResult, RiskReport } from './kyc.service';
import { KycCheckDto } from './dto/kyc-check.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('kyc')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.NOTARY)
  @ApiOperation({
    summary: 'Run full KYC check for a CPF/CNPJ',
    description:
      'Performs credit check (Serasa), lawsuit check, PEP check, and optional CNPJ verification. Returns aggregated risk score and recommended KYC level.',
  })
  @ApiBody({ type: KycCheckDto })
  @ApiResponse({
    status: 200,
    description: 'KYC check completed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid CPF or CNPJ',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient role',
  })
  async runKycCheck(@Body() dto: KycCheckDto): Promise<KycFullResult> {
    return this.kycService.performFullKyc(dto.cpf, dto.cnpj);
  }

  @Get('report/:userId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.NOTARY)
  @ApiOperation({
    summary: 'Get risk report for a user',
    description:
      'Generates a formatted risk report based on the stored risk score and KYC level for the specified user.',
  })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID to generate risk report for',
  })
  @ApiResponse({
    status: 200,
    description: 'Risk report generated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getRiskReport(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<RiskReport> {
    return this.kycService.generateRiskReport(userId);
  }
}
