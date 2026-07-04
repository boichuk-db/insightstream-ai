import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team, TeamMember, StripeEvent } from '@insightstream/database';
import { StripeService } from './stripe.service';
import { StripeWebhookService } from './stripe-webhook.service';
import { StripeController } from './stripe.controller';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Team, TeamMember, StripeEvent])],
  providers: [StripeService, StripeWebhookService],
  controllers: [StripeController, StripeWebhookController],
})
export class StripeModule {}
