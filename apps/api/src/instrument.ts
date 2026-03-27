// ConfigModule.forRoot() runs after this file — load .env manually so SENTRY_DSN is available
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config();

import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  enabled: process.env.NODE_ENV !== 'test',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  sendDefaultPii: false,
});
