import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const isExpectedError =
      exception instanceof HttpException && exception.getStatus() < 500;

    if (!isExpectedError) {
      Sentry.captureException(exception);
    }

    super.catch(exception, host);
  }
}
