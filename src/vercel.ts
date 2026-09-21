import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import express from "express";

import { AppModule } from "./app.module";

const server = express();

let initialized = false;

async function bootstrap() {
  if (initialized) return;

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    rawBody: true,
  });

  const config = new DocumentBuilder()
    .setTitle("AI Career SaaS API")
    .setDescription("The AI Career SaaS API description")
    .setVersion("1.0")
    .addTag("AI Career SaaS")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("api/docs", app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  });

  await app.init();

  initialized = true;
}

export default async function handler(
  req: express.Request,
  res: express.Response,
) {
  await bootstrap();
  server(req, res);
}
