import {
  Controller,
  Get,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { GovbrService, GovbrAuthResult } from './govbr.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('govbr')
@Controller('auth/govbr')
export class GovbrController {
  constructor(private readonly govbrService: GovbrService) {}

  @Public()
  @Get('authorize')
  @ApiOperation({
    summary: 'Redirect to Gov.br authorization page',
    description: 'Initiates the Gov.br OAuth2 flow by redirecting the user to the Gov.br login page.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Gov.br SSO authorization page',
  })
  authorize(@Res() res: Response): void {
    const { url } = this.govbrService.getAuthorizationUrl();
    res.redirect(url);
  }

  @Public()
  @Get('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Gov.br OAuth2 callback',
    description:
      'Receives the authorization code from Gov.br, exchanges it for tokens, retrieves user info, creates or updates the user, and returns JWT tokens.',
  })
  @ApiQuery({
    name: 'code',
    required: true,
    description: 'Authorization code from Gov.br',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    description: 'State parameter for CSRF protection',
  })
  @ApiQuery({
    name: 'error',
    required: false,
    description: 'Error code if authorization failed',
  })
  @ApiQuery({
    name: 'error_description',
    required: false,
    description: 'Error description if authorization failed',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful, returns user and JWT tokens',
  })
  @ApiResponse({
    status: 400,
    description: 'Missing authorization code or Gov.br error',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to communicate with Gov.br',
  })
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') _state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
  ): Promise<GovbrAuthResult> {
    if (error) {
      throw new BadRequestException(
        `Gov.br authorization failed: ${error} - ${errorDescription || 'No description provided'}`,
      );
    }

    if (!code) {
      throw new BadRequestException('Authorization code is required');
    }

    return this.govbrService.validateIdentity(code);
  }
}
