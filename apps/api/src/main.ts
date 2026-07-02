import './instrument';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SentryExceptionFilter } from './filters/sentry-exception.filter';
import { RedisIoAdapter } from './adapters/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));

  // CORS:
  // - /feedback/public is called from customer sites → allow any origin here;
  //   per-project origin enforcement happens inside FeedbackPublicController.
  // - Everything else is dashboard-only → FRONTEND_URL + localhost.
  // Auth is Bearer-token (no cookies), so no Allow-Credentials needed.
  const frontendUrl = process.env.FRONTEND_URL;
  app.use((req: any, res: any, next: () => void) => {
    const origin = req.headers.origin as string | undefined;
    if (!origin) return next();

    let allowed = req.path.startsWith('/feedback/public');
    if (!allowed) {
      try {
        const { hostname } = new URL(origin);
        allowed =
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          origin === frontendUrl;
      } catch {
        allowed = false;
      }
    }

    if (allowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
      res.header(
        'Access-Control-Allow-Methods',
        'GET,POST,PATCH,PUT,DELETE,OPTIONS',
      );
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
