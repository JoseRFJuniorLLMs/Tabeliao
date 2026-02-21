import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { LifecycleService } from './lifecycle.service';
import {
  CalculateAdjustmentDto,
  ProposeRenewalDto,
} from './dto/lifecycle.dto';

@ApiTags('lifecycle')
@ApiBearerAuth()
@Controller('lifecycle')
export class LifecycleController {
  constructor(private readonly lifecycleService: LifecycleService) {}

  @Post('check-expiring')
  @ApiOperation({
    summary: 'Check for contracts expiring within notification windows',
    description:
      'Finds contracts expiring within 30, 15, 7, and 1 day(s) and generates notifications with severity levels',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'List of expiring contracts with days until expiry and notification levels',
  })
  async checkExpiring() {
    return this.lifecycleService.checkExpiringContracts();
  }

  @Post('check-overdue')
  @ApiOperation({
    summary: 'Check for contracts with overdue payments',
    description: 'Scans active contracts for overdue payment obligations',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of contracts with overdue payments',
  })
  async checkOverdue() {
    return this.lifecycleService.checkOverduePayments();
  }

  @Post('calculate-adjustment')
  @ApiOperation({
    summary: 'Calculate price adjustment for a contract',
    description:
      'Calculates a new value based on IGPM, IPCA, SELIC, or a custom rate',
  })
  @ApiParam({
    name: 'id',
    description: 'Contract UUID',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Adjustment calculation result with old and new values',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Contract has no total value or custom rate is missing',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found',
  })
  @Post(':id/calculate-adjustment')
  async calculateAdjustment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CalculateAdjustmentDto,
  ) {
    return this.lifecycleService.calculateAdjustment(
      id,
      dto.indexType,
      dto.customRate,
    );
  }

  @Post(':id/propose-renewal')
  @ApiOperation({
    summary: 'Propose a contract renewal',
    description:
      'Creates a renewal proposal with a new value and expiration date. Requires approval from all parties.',
  })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Renewal proposal created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Contract status does not allow renewal proposals',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found',
  })
  async proposeRenewal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProposeRenewalDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.lifecycleService.proposeRenewal(
      id,
      dto.newValue,
      dto.newExpiresAt,
      userId,
      dto.notes,
    );
  }

  @Post(':id/approve-renewal')
  @ApiOperation({
    summary: 'Approve a contract renewal proposal',
    description:
      'Approves a pending renewal proposal. When all parties approve, the contract is automatically renewed.',
  })
  @ApiParam({ name: 'id', description: 'Contract UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Renewal approved. If all parties approved, the contract is now renewed and active.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'No pending renewal proposal or user is not a party or already approved',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contract not found',
  })
  async approveRenewal(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.lifecycleService.approveRenewal(id, userId);
  }

  @Post('process-automatic')
  @ApiOperation({
    summary: 'Process all automatic lifecycle actions',
    description:
      'Runs the automatic lifecycle processor: expires contracts, sends notifications, applies fines for overdue payments. Typically invoked by a cron job.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Summary of automatic actions taken',
    schema: {
      type: 'object',
      properties: {
        expired: { type: 'number', description: 'Number of contracts expired' },
        notified: { type: 'number', description: 'Number of notifications sent' },
        finesApplied: {
          type: 'number',
          description: 'Number of fines applied for overdue payments',
        },
      },
    },
  })
  async processAutomatic() {
    return this.lifecycleService.processAutomaticActions();
  }
}
