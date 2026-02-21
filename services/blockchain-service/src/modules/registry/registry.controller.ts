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
import { RegistryService } from './registry.service';
import { RegisterDocumentDto } from './dto/register-document.dto';

@ApiTags('Registry')
@ApiBearerAuth()
@Controller('blockchain')
export class RegistryController {
  constructor(private readonly registryService: RegistryService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register document hash on-chain',
    description:
      'Creates a transaction on Polygon storing the SHA-256 hash of the document content, timestamp, and contract ID for immutable proof of existence.',
  })
  @ApiResponse({
    status: 201,
    description: 'Document hash registered successfully on-chain',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Blockchain transaction failed' })
  async registerDocument(@Body() dto: RegisterDocumentDto) {
    try {
      const result = await this.registryService.registerDocument(
        dto.contractId,
        dto.contentHash,
        dto.metadata ?? {},
      );
      return {
        success: true,
        data: result,
        message: 'Document hash registered successfully on Polygon',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Registration failed: ${message}`);
    }
  }

  @Get('verify/:contractId')
  @ApiOperation({
    summary: 'Verify document hash on-chain',
    description:
      'Checks if a document hash exists on-chain for the given contract ID and returns the timestamp and block number of registration.',
  })
  @ApiParam({
    name: 'contractId',
    description: 'The contract ID to verify',
    example: 'contract-2024-001-abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification result returned',
  })
  @ApiResponse({ status: 400, description: 'Missing contentHash query parameter' })
  @ApiResponse({ status: 404, description: 'No registration found' })
  async verifyDocument(
    @Param('contractId') contractId: string,
  ) {
    if (!contractId) {
      throw new BadRequestException('contractId is required');
    }

    try {
      const registration = await this.registryService.getRegistration(contractId);
      const result = await this.registryService.verifyDocument(
        contractId,
        registration.contentHash,
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('No registration found')) {
        throw new NotFoundException(`No registration found for contract: ${contractId}`);
      }
      throw new InternalServerErrorException(`Verification failed: ${message}`);
    }
  }

  @Get('registration/:contractId')
  @ApiOperation({
    summary: 'Get registration details',
    description: 'Retrieves the full registration details for a contract ID from the blockchain.',
  })
  @ApiParam({
    name: 'contractId',
    description: 'The contract ID to look up',
    example: 'contract-2024-001-abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Registration details returned',
  })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async getRegistration(@Param('contractId') contractId: string) {
    try {
      const result = await this.registryService.getRegistration(contractId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('No registration found')) {
        throw new NotFoundException(`No registration found for contract: ${contractId}`);
      }
      throw new InternalServerErrorException(`Failed to get registration: ${message}`);
    }
  }

  @Get('tx/:txHash')
  @ApiOperation({
    summary: 'Get transaction receipt',
    description: 'Retrieves the full transaction receipt from the Polygon blockchain by transaction hash.',
  })
  @ApiParam({
    name: 'txHash',
    description: 'The transaction hash to look up',
    example: '0xabc123...',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction receipt returned',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionReceipt(@Param('txHash') txHash: string) {
    try {
      const receipt = await this.registryService.getTransactionReceipt(txHash);
      if (!receipt) {
        throw new NotFoundException(`Transaction not found: ${txHash}`);
      }
      return {
        success: true,
        data: {
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          from: receipt.from,
          to: receipt.to,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status,
          logs: receipt.logs.map((log) => ({
            address: log.address,
            topics: log.topics,
            data: log.data,
          })),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Failed to get transaction receipt: ${message}`);
    }
  }
}
