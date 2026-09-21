import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import express from "express";

import { AppModule } from "./app.module";

const server = express();

let bootstrapPromise: Promise<void> | null = null;

async function createApp() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    rawBody: true,
  });

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

  const config = new DocumentBuilder()
    .setTitle("AI Career SaaS API")
    .setDescription("The AI Career SaaS API description")
    .setVersion("1.0")
    .addTag("AI Career SaaS")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("api/docs", app, document, {
    customCssUrl:
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
    customJs: [
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js",
    ],
  });

  await app.init();
}

function bootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = createApp().catch((err) => {
      // Reset so the next request can retry after a failed cold start
      bootstrapPromise = null;
      throw err;
    });
  }
  return bootstrapPromise;
}

export default async function handler(
  req: express.Request,
  res: express.Response,
) {
  await bootstrap();
  server(req, res);
}
