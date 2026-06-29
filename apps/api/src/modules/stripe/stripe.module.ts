import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@insightstream/database';
import { StripeService } from './stripe.service';
import { StripeWebhookService } from './stripe-webhook.service';
import { StripeController } from './stripe.controller';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [StripeService, StripeWebhookService],
  controllers: [StripeController, StripeWebhookController],
})
export class StripeModule {}
