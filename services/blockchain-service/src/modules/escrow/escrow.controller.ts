import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { EscrowService } from './escrow.service';
import {
  CreateEscrowDto,
  DepositDto,
  ReleaseDto,
  RefundDto,
  FreezeDto,
  PartialReleaseDto,
} from './dto/create-escrow.dto';

@ApiTags('Escrow')
@ApiBearerAuth()
@Controller('blockchain/escrow')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new escrow',
    description:
      'Deploys a new escrow smart contract on Polygon via the EscrowFactory. The escrow holds funds between depositor and beneficiary until release conditions are met.',
  })
  @ApiResponse({ status: 201, description: 'Escrow created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Blockchain transaction failed' })
  async createEscrow(@Body() dto: CreateEscrowDto) {
    try {
      const result = await this.escrowService.createEscrow(
        dto.contractId,
        dto.amount,
        { depositor: dto.parties.depositor, beneficiary: dto.parties.beneficiary },
        dto.releaseConditions ?? { type: 'MUTUAL_APPROVAL' },
      );
      return {
        success: true,
        data: result,
        message: 'Escrow created successfully on Polygon',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Failed to create escrow: ${message}`);
    }
  }

  @Post(':id/deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record a deposit to escrow',
    description: 'Records an on-chain deposit event for the given escrow. The deposit transaction must already be confirmed on-chain.',
  })
  @ApiParam({ name: 'id', description: 'Escrow ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Deposit recorded successfully' })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  @ApiResponse({ status: 400, description: 'Invalid escrow state or input' })
  async deposit(@Param('id') id: string, @Body() dto: DepositDto) {
    try {
      await this.escrowService.deposit(id, dto.amount, dto.txHash);
      return {
        success: true,
        message: 'Deposit recorded successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Cannot deposit')) {
        throw new BadRequestException(message);
      }
      throw new InternalServerErrorException(`Failed to record deposit: ${message}`);
    }
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Release escrow funds',
    description: 'Releases the full escrow amount to the beneficiary. Requires both parties to approve or arbiter decision.',
  })
  @ApiParam({ name: 'id', description: 'Escrow ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Escrow released successfully' })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  @ApiResponse({ status: 400, description: 'Invalid escrow state' })
  async release(@Param('id') id: string, @Body() dto: ReleaseDto) {
    try {
      const result = await this.escrowService.release(id, dto.approvedBy);
      return {
        success: true,
        data: result,
        message: 'Escrow funds released to beneficiary',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Cannot release')) {
        throw new BadRequestException(message);
      }
      throw new InternalServerErrorException(`Failed to release escrow: ${message}`);
    }
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refund escrow to depositor',
    description: 'Refunds the escrow amount back to the depositor on cancellation or dispute resolution.',
  })
  @ApiParam({ name: 'id', description: 'Escrow ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Escrow refunded successfully' })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  @ApiResponse({ status: 400, description: 'Invalid escrow state' })
  async refund(@Param('id') id: string, @Body() dto: RefundDto) {
    try {
      const result = await this.escrowService.refund(id, dto.reason);
      return {
        success: true,
        data: result,
        message: 'Escrow refunded to depositor',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Cannot refund')) {
        throw new BadRequestException(message);
      }
      throw new InternalServerErrorException(`Failed to refund escrow: ${message}`);
    }
  }

  @Post(':id/freeze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Freeze escrow for dispute',
    description: 'Freezes the escrow when a dispute is opened. No funds can be released or refunded while frozen.',
  })
  @ApiParam({ name: 'id', description: 'Escrow ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Escrow frozen successfully' })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  @ApiResponse({ status: 400, description: 'Invalid escrow state' })
  async freeze(@Param('id') id: string, @Body() dto: FreezeDto) {
    try {
      await this.escrowService.freeze(id, dto.disputeId);
      return {
        success: true,
        message: `Escrow frozen for dispute ${dto.disputeId}`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Cannot freeze')) {
        throw new BadRequestException(message);
      }
      throw new InternalServerErrorException(`Failed to freeze escrow: ${message}`);
    }
  }

  @Post(':id/release-partial')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Partial release for milestone-based contracts',
    description:
      'Releases a partial amount from the escrow for a specific milestone. Used for milestone-based contract payment flows.',
  })
  @ApiParam({ name: 'id', description: 'Escrow ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Partial release successful' })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  @ApiResponse({ status: 400, description: 'Invalid escrow state or amount exceeds balance' })
  async releasePartial(@Param('id') id: string, @Body() dto: PartialReleaseDto) {
    try {
      const result = await this.escrowService.releasePartial(id, dto.amount, dto.milestone);
      return {
        success: true,
        data: result,
        message: `Partial release of ${dto.amount} MATIC for milestone "${dto.milestone}"`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Cannot partially release') || message.includes('exceeds')) {
        throw new BadRequestException(message);
      }
      throw new InternalServerErrorException(`Failed to partially release escrow: ${message}`);
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get escrow status',
    description: 'Returns the current status and details of an escrow by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Escrow ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Escrow status returned' })
  @ApiResponse({ status: 404, description: 'Escrow not found' })
  async getEscrowStatus(@Param('id') id: string) {
    try {
      const result = await this.escrowService.getEscrowStatus(id);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Failed to get escrow status: ${message}`);
    }
  }
}
