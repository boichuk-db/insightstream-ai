import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamMember } from '@insightstream/database';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StripeService } from './stripe.service';

@Controller('plans')
export class StripeController {
  constructor(
    private stripeService: StripeService,
    private config: ConfigService,
    @InjectRepository(Team) private teamRepo: Repository<Team>,
    @InjectRepository(TeamMember) private memberRepo: Repository<TeamMember>,
  ) {}

  /**
   * Owner-only: loads the team and asserts req.user owns it. Uniform 404 for
   * both "no such team" and "not the owner" so team existence isn't probeable.
   */
  private async requireOwnedTeam(
    teamId: string,
    userId: string,
  ): Promise<Team> {
    if (!teamId) throw new BadRequestException('teamId is required');
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['owner'],
    });
    if (!team || team.ownerId !== userId) {
      throw new NotFoundException('Team not found');
    }
    return team;
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(
    @Request() req: any,
    @Body() body: { priceId: string; teamId: string },
  ) {
    if (!body.priceId) throw new BadRequestException('priceId is required');
    const team = await this.requireOwnedTeam(body.teamId, req.user.id);
    const frontendUrl =
      this.config.get('FRONTEND_URL') || 'http://localhost:3000';
    const url = await this.stripeService.createCheckoutSession(
      team,
      team.owner.email,
      body.priceId,
      `${frontendUrl}/dashboard/billing?success=true`,
      `${frontendUrl}/dashboard/billing`,
    );
    return { url };
  }

  @Get('portal')
  @UseGuards(JwtAuthGuard)
  async createPortal(@Request() req: any, @Query('teamId') teamId: string) {
    const team = await this.requireOwnedTeam(teamId, req.user.id);
    if (!team.stripeCustomerId) {
      throw new BadRequestException('No active subscription');
    }
    const frontendUrl =
      this.config.get('FRONTEND_URL') || 'http://localhost:3000';
    const url = await this.stripeService.createPortalSession(
      team.stripeCustomerId,
      `${frontendUrl}/dashboard/billing`,
    );
    return { url };
  }

  /** Any member of the team may read plan status. */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getPlanStatus(@Request() req: any, @Query('teamId') teamId: string) {
    if (!teamId) throw new BadRequestException('teamId is required');
    const member = await this.memberRepo.findOne({
      where: { teamId, userId: req.user.id },
    });
    if (!member) throw new ForbiddenException('Not a member of this team');
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');
    return {
      plan: team.plan,
      planStatus: team.planStatus ?? 'active',
      trialEndsAt: team.trialEndsAt ?? null,
      stripePriceId: team.stripePriceId ?? null,
      stripeSubscriptionId: team.stripeSubscriptionId ?? null,
      isOwner: team.ownerId === req.user.id,
    };
  }
}
