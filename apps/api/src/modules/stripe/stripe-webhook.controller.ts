import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';
import { StripeWebhookService } from './stripe-webhook.service';

@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private stripeService: StripeService,
    private webhookService: StripeWebhookService,
  ) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    let event: Stripe.Event;
    try {
      event = this.stripeService.constructWebhookEvent(req.rawBody!, signature);
    } catch (err: any) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Stripe webhook: ${event.type} (${event.id})`);

    await this.webhookService.handleEvent(event);

    return { received: true };
  }
}
