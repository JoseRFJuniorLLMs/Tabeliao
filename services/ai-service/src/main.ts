import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
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

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tabeliao AI Service')
    .setDescription(
      'Servico de Inteligencia Artificial do Tabeliao - ' +
      'Geracao de contratos, revisao juridica e RAG com legislacao brasileira',
    )
    .setVersion('1.0.0')
    .addTag('generator', 'Geracao de contratos a partir de linguagem natural')
    .addTag('reviewer', 'Revisao e analise de clausulas abusivas')
    .addTag('rag', 'Consulta a legislacao brasileira (RAG)')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 3003;
  await app.listen(port);
  logger.log(`AI Service rodando na porta ${port}`);
  logger.log(`Swagger disponivel em http://localhost:${port}/docs`);
}

bootstrap();
