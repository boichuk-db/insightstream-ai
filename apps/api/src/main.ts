import './instrument';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ProjectsService } from './modules/projects/projects.service';
import { SentryExceptionFilter } from './filters/sentry-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));

  const projectsService = app.get(ProjectsService);

  // Cached domains to avoid DB hit on every preflight
  let cachedDomains: string[] = [];
  let cacheTime = 0;

  app.enableCors({
    origin: async (origin, callback) => {
      if (!origin) return callback(null, true);

      try {
        const originUrl = new URL(origin);
        if (
          originUrl.hostname === 'localhost' ||
          originUrl.hostname === '127.0.0.1' ||
          origin === process.env.FRONTEND_URL
        ) {
          return callback(null, true);
        }

        // Simple cache: refresh domains every 1 minute
        if (Date.now() - cacheTime > 60000) {
          cachedDomains = await projectsService.getAllDomains();
          cacheTime = Date.now();
        }

        const isAllowed = cachedDomains.some(
          (domain) =>
            originUrl.hostname === domain ||
            originUrl.hostname.endsWith(`.${domain}`),
        );

        if (isAllowed) {
          return callback(null, true);
        }

        return callback(
          new Error(`CORS Error: Origin ${origin} not in whitelist`),
          false,
        );
      } catch (err) {
        return callback(new Error('Invalid origin'), false);
      }
    },
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
