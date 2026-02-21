import { Module, NestModule, MiddlewareConsumer, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Request, Response } from 'express';
import { ROUTE_MAPPINGS, ServicesConfigType, ServiceDefinition } from '../config/services.config';

@Module({
  imports: [ConfigModule],
})
export class ProxyModule implements NestModule {
  private readonly logger = new Logger(ProxyModule.name);

  constructor(private readonly configService: ConfigService) {}

  configure(consumer: MiddlewareConsumer): void {
    const services = this.configService.get<ServicesConfigType>('services');

    if (!services) {
      this.logger.error('Services configuration not found. Proxy routes will not be registered.');
      return;
    }

    for (const mapping of ROUTE_MAPPINGS) {
      const service: ServiceDefinition | undefined = services[mapping.serviceKey];

      if (!service) {
        this.logger.warn(`Service "${mapping.serviceKey}" not found in config. Skipping route: ${mapping.prefix}`);
        continue;
      }

      const proxyOptions: Options = {
        target: service.url,
        changeOrigin: true,
        pathRewrite: undefined, // Preserve the original path
        timeout: service.timeout,
        proxyTimeout: service.timeout,
        headers: {
          'X-Forwarded-By': 'tabeliao-api-gateway',
        },
        on: {
          proxyReq: (proxyReq, req: Request, _res: Response) => {
            // Forward user context from auth middleware
            const user = (req as Request & { user?: { sub: string; email: string } }).user;
            if (user) {
              proxyReq.setHeader('X-User-ID', user.sub);
              proxyReq.setHeader('X-User-Email', user.email);
            }

            // Forward request ID for distributed tracing
            const requestId = req.headers['x-request-id'];
            if (requestId) {
              proxyReq.setHeader('X-Request-ID', requestId as string);
            }

            // Forward correlation ID
            const correlationId = req.headers['x-correlation-id'];
            if (correlationId) {
              proxyReq.setHeader('X-Correlation-ID', correlationId as string);
            }

            this.logger.debug(
              `Proxying ${req.method} ${req.originalUrl} -> ${service.url}${req.originalUrl}`,
            );
          },
          proxyRes: (proxyRes, req: Request, _res: Response) => {
            // Add gateway headers to the response
            proxyRes.headers['x-powered-by'] = 'Tabeliao-Gateway';
            proxyRes.headers['x-upstream-service'] = service.name;

            this.logger.debug(
              `Proxy response ${req.method} ${req.originalUrl} -> ${proxyRes.statusCode}`,
            );
          },
          error: (err: Error, req: Request, res: Response) => {
            this.logger.error(
              `Proxy error for ${req.method} ${req.originalUrl} -> ${service.name}: ${err.message}`,
            );

            if (!res.headersSent) {
              res.status(502).json({
                statusCode: 502,
                error: 'Bad Gateway',
                message: `Service "${service.name}" is currently unavailable`,
                timestamp: new Date().toISOString(),
                path: req.originalUrl,
              });
            }
          },
        },
        logger: {
          info: (msg: string) => this.logger.log(msg),
          warn: (msg: string) => this.logger.warn(msg),
          error: (msg: string) => this.logger.error(msg),
        },
      };

      this.logger.log(`Registering proxy: ${mapping.prefix}/* -> ${service.url}`);

      consumer
        .apply(createProxyMiddleware(proxyOptions))
        .forRoutes(`${mapping.prefix}/*`);
    }
  }
}
