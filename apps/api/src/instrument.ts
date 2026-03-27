import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  enabled: process.env.NODE_ENV !== 'test',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  sendDefaultPii: false,
});
