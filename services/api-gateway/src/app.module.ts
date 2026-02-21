import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ProxyModule } from './routes/proxy.module';
import { HealthModule } from './routes/health.module';
import { AuthMiddleware } from './middleware/auth.middleware';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import servicesConfig from './config/services.config';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [servicesConfig],
      envFilePath: ['.env', '.env.local'],
    }),

    // Default throttler (100 requests per 60 seconds)
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Route modules
    HealthModule,
    ProxyModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply logging middleware to all routes
    consumer
      .apply(LoggingMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    // Apply rate limiting to all API routes
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes({ path: 'api/*', method: RequestMethod.ALL });

    // Apply auth middleware to all API routes except public ones
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'health/services', method: RequestMethod.GET },
        { path: 'docs', method: RequestMethod.GET },
        { path: 'docs/(.*)', method: RequestMethod.GET },
        { path: 'api/v1/auth/login', method: RequestMethod.POST },
        { path: 'api/v1/auth/register', method: RequestMethod.POST },
        { path: 'api/v1/auth/refresh', method: RequestMethod.POST },
        { path: 'api/v1/auth/forgot-password', method: RequestMethod.POST },
        { path: 'api/v1/auth/verify-email', method: RequestMethod.GET },
        { path: 'api/v1/webhooks/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes({ path: 'api/*', method: RequestMethod.ALL });
  }
}
