import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableCors({
    origin: process.env['CORS_ORIGIN'] ?? '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tabeliao Payment Service')
    .setDescription(
      'Payment microservice for Tabeliao Smart Legal Tech platform. ' +
      'Handles escrow accounts (BRL), PIX payments, boleto generation, ' +
      'recurring billing, split payments, and Open Finance integration.',
    )
    .setVersion('1.0.0')
    .addTag('Escrow', 'Escrow account management for legal contracts')
    .addTag('Billing', 'Recurring billing, invoicing and installments')
    .addTag('PIX', 'PIX instant payments and QR code generation')
    .addTag('Boleto', 'Boleto bancario generation')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env['PORT'] ?? 3005;
  await app.listen(port);

  console.log(`[PaymentService] Running on port ${port}`);
  console.log(`[PaymentService] Swagger docs at http://localhost:${port}/api/docs`);
}

void bootstrap();
