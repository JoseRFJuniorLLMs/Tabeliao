import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Security headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
          styleSrc: ["'self'", "'unsafe-inline'"],   // Required for Swagger UI
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS configuration
  const allowedOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000,http://localhost:4200');
  app.enableCors({
    origin: allowedOrigins.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Correlation-ID'],
    exposedHeaders: ['X-Request-ID', 'X-Correlation-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 3600,
  });

  // Gzip compression
  app.use(compression());

  // Morgan HTTP request logging
  const morganFormat = configService.get<string>('NODE_ENV') === 'production' ? 'combined' : 'dev';
  app.use(
    morgan(morganFormat, {
      stream: {
        write: (message: string) => {
          logger.log(message.trim());
        },
      },
    }),
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: configService.get<string>('NODE_ENV') === 'production',
    }),
  );

  // Swagger API documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tabeliao API - Smart Legal Tech')
    .setDescription(
      'API Gateway for the Tabeliao platform - Smart Legal Tech. ' +
      'This gateway routes requests to all microservices including authentication, ' +
      'contract management, AI services, blockchain, payments, notifications, and disputes.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
      'JWT-Auth',
    )
    .addTag('Health', 'Health check endpoints')
    .addTag('Auth', 'Authentication and authorization')
    .addTag('Users', 'User management')
    .addTag('KYC', 'Know Your Customer verification')
    .addTag('Contracts', 'Contract management')
    .addTag('Templates', 'Contract templates')
    .addTag('Lifecycle', 'Contract lifecycle management')
    .addTag('AI', 'AI-powered services (analysis, generation, review)')
    .addTag('Blockchain', 'Blockchain registration and verification')
    .addTag('Payments', 'Payment processing')
    .addTag('Notifications', 'Notification management')
    .addTag('Disputes', 'Dispute resolution')
    .addTag('Arbitration', 'Arbitration proceedings')
    .addTag('Mediation', 'Mediation proceedings')
    .addServer(`http://localhost:${configService.get<number>('PORT', 3000)}`, 'Local Development')
    .addServer('https://api.tabeliao.com.br', 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Tabeliao API Docs',
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`API Gateway running on http://localhost:${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs`);
  logger.log(`Environment: ${configService.get<string>('NODE_ENV', 'development')}`);
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start API Gateway', err);
  process.exit(1);
});
