import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamRoleGuard, RequireTeamRole } from '../teams/team-role.guard';
import { TeamRole } from '@insightstream/database';
import { InvitationsService } from './invitations.service';

@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  // Team-scoped endpoints (require Admin+)
  @Post('teams/:teamId/invitations')
  @UseGuards(JwtAuthGuard, TeamRoleGuard)
  @RequireTeamRole(TeamRole.ADMIN)
  async create(
    @Param('teamId') teamId: string,
    @Body() body: { email: string; role?: TeamRole },
    @Request() req: any,
  ) {
    return this.invitationsService.create(
      teamId,
      body.email,
      body.role || TeamRole.MEMBER,
      req.user.id,
    );
  }

  @Get('teams/:teamId/invitations')
  @UseGuards(JwtAuthGuard, TeamRoleGuard)
  @RequireTeamRole(TeamRole.ADMIN)
  async listPending(@Param('teamId') teamId: string) {
    const invitations = await this.invitationsService.listPending(teamId);
    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      invitedByEmail: inv.invitedBy?.email,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }));
  }

  @Delete('teams/:teamId/invitations/:id')
  @UseGuards(JwtAuthGuard, TeamRoleGuard)
  @RequireTeamRole(TeamRole.ADMIN)
  async cancel(@Param('teamId') teamId: string, @Param('id') id: string) {
    await this.invitationsService.cancel(id, teamId);
    return { success: true };
  }

  // Public endpoint — get invitation info by token
  @Get('invitations/info')
  async getInfo(@Query('token') token: string) {
    return this.invitationsService.getInfo(token);
  }

  // Authenticated endpoint — accept invitation
  @Post('invitations/accept')
  @UseGuards(JwtAuthGuard)
  async accept(@Body() body: { token: string }, @Request() req: any) {
    return this.invitationsService.accept(body.token, req.user.id);
  }
}
