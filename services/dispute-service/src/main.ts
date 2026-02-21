import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Tabeliao - Dispute Service')
    .setDescription(
      'API para Resolucao Online de Disputas (ODR) - Tribunal Privado Digital com mediacao, arbitragem e resolucao assistida por IA',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('disputes', 'Gestao de disputas e resolucao de conflitos')
    .addTag('arbitration', 'Arbitragem humana e gestao de arbitradores')
    .addTag('mediation', 'Mediacao assistida por IA para disputas de baixo valor')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3007;
  await app.listen(port);

  console.log(`Dispute Service running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/docs`);
}

void bootstrap();
