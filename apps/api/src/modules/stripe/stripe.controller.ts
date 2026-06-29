import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@insightstream/database';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StripeService } from './stripe.service';

@Controller('plans')
export class StripeController {
  constructor(
    private stripeService: StripeService,
    private config: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(@Request() req: any, @Body() body: { priceId: string }) {
    if (!body.priceId) throw new BadRequestException('priceId is required');
    const user = await this.userRepo.findOneOrFail({ where: { id: req.user.id } });
    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';
    const url = await this.stripeService.createCheckoutSession(
      user,
      body.priceId,
      `${frontendUrl}/dashboard/billing?success=true`,
      `${frontendUrl}/dashboard/billing`,
    );
    return { url };
  }

  @Get('portal')
  @UseGuards(JwtAuthGuard)
  async createPortal(@Request() req: any) {
    const user = await this.userRepo.findOneOrFail({ where: { id: req.user.id } });
    if (!user.stripeCustomerId) {
      throw new BadRequestException('No active subscription');
    }
    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';
    const url = await this.stripeService.createPortalSession(
      user.stripeCustomerId,
      `${frontendUrl}/dashboard/billing`,
    );
    return { url };
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getPlanStatus(@Request() req: any) {
    const user = await this.userRepo.findOneOrFail({ where: { id: req.user.id } });
    return {
      plan: user.plan,
      planStatus: user.planStatus ?? 'active',
      trialEndsAt: user.trialEndsAt ?? null,
      stripePriceId: user.stripePriceId ?? null,
      stripeSubscriptionId: user.stripeSubscriptionId ?? null,
    };
  }
}
