import { Controller, Get, Logger, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import axios from 'axios';
import { ServicesConfigType, ServiceDefinition } from '../config/services.config';

interface GatewayHealthResponse {
  status: 'ok' | 'degraded' | 'down';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
  };
}

interface ServiceHealthStatus {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTimeMs: number | null;
  statusCode: number | null;
  error: string | null;
}

interface AllServicesHealthResponse {
  status: 'ok' | 'degraded' | 'down';
  gateway: GatewayHealthResponse;
  services: ServiceHealthStatus[];
  healthyCount: number;
  totalCount: number;
  timestamp: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startTime = Date.now();

  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Gateway health check', description: 'Returns the health status of the API Gateway itself.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Gateway is healthy' })
  getHealth(): GatewayHealthResponse {
    const memoryUsage = process.memoryUsage();

    return {
      status: 'ok',
      service: 'api-gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      memory: {
        heapUsed: this.formatBytes(memoryUsage.heapUsed),
        heapTotal: this.formatBytes(memoryUsage.heapTotal),
        rss: this.formatBytes(memoryUsage.rss),
      },
    };
  }

  @Get('services')
  @ApiOperation({
    summary: 'All services health check',
    description: 'Checks the health of all downstream microservices and returns their individual statuses.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Health status of all services' })
  async getServicesHealth(): Promise<AllServicesHealthResponse> {
    const services = this.configService.get<ServicesConfigType>('services');

    if (!services) {
      this.logger.error('Services configuration not found.');
      return {
        status: 'down',
        gateway: this.getHealth(),
        services: [],
        healthyCount: 0,
        totalCount: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const serviceEntries = Object.entries(services) as Array<[string, ServiceDefinition]>;

    // Check all services in parallel
    const healthChecks = await Promise.allSettled(
      serviceEntries.map(([_key, service]) => this.checkServiceHealth(service)),
    );

    const serviceStatuses: ServiceHealthStatus[] = healthChecks.map((result, index) => {
      const [_key, service] = serviceEntries[index] as [string, ServiceDefinition];

      if (result.status === 'fulfilled') {
        return result.value;
      }

      return {
        name: service.name,
        url: service.url,
        status: 'unhealthy' as const,
        responseTimeMs: null,
        statusCode: null,
        error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
      };
    });

    const healthyCount = serviceStatuses.filter((s) => s.status === 'healthy').length;
    const totalCount = serviceStatuses.length;

    let overallStatus: 'ok' | 'degraded' | 'down';
    if (healthyCount === totalCount) {
      overallStatus = 'ok';
    } else if (healthyCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'down';
    }

    const response: AllServicesHealthResponse = {
      status: overallStatus,
      gateway: this.getHealth(),
      services: serviceStatuses,
      healthyCount,
      totalCount,
      timestamp: new Date().toISOString(),
    };

    if (overallStatus !== 'ok') {
      const unhealthy = serviceStatuses
        .filter((s) => s.status !== 'healthy')
        .map((s) => s.name);
      this.logger.warn(`Services health check: ${overallStatus}. Unhealthy: ${unhealthy.join(', ')}`);
    }

    return response;
  }

  /**
   * Check the health of an individual downstream service.
   */
  private async checkServiceHealth(service: ServiceDefinition): Promise<ServiceHealthStatus> {
    const startTime = Date.now();

    try {
      const response = await axios.get(`${service.url}${service.healthPath}`, {
        timeout: Math.min(service.timeout, 5000), // Cap health check at 5 seconds
        validateStatus: () => true, // Accept all status codes
      });

      const responseTimeMs = Date.now() - startTime;
      const isHealthy = response.status >= 200 && response.status < 300;

      return {
        name: service.name,
        url: service.url,
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTimeMs,
        statusCode: response.status,
        error: isHealthy ? null : `HTTP ${response.status}`,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.debug(`Health check failed for ${service.name}: ${errorMessage}`);

      return {
        name: service.name,
        url: service.url,
        status: 'unhealthy',
        responseTimeMs,
        statusCode: null,
        error: errorMessage,
      };
    }
  }

  /**
   * Format bytes to human-readable string.
   */
  private formatBytes(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }
}
