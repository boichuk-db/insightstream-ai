import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamRoleGuard, RequireTeamRole } from './team-role.guard';
import { TeamRole } from '@insightstream/database';
import { TeamsService } from './teams.service';
import { ActivityService } from '../activity/activity.service';
import { ProjectsService } from '../projects/projects.service';
import { UpdateTeamDto } from './dto/update-team.dto';

@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly activityService: ActivityService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Post()
  async create(@Request() req: any, @Body() body: { name: string }) {
    return this.teamsService.create(req.user.id, body);
  }

  @Get()
  async findAll(@Request() req: any) {
    // Lazy migration: ensure user has at least one team
    await this.teamsService.ensurePersonalTeam(req.user.id);
    return this.teamsService.findAllByUser(req.user.id);
  }

  @Get(':teamId')
  @UseGuards(TeamRoleGuard)
  async findOne(@Param('teamId') teamId: string) {
    return this.teamsService.findOne(teamId);
  }

  @Get(':teamId/members')
  @UseGuards(TeamRoleGuard)
  async getMembers(@Param('teamId') teamId: string) {
    const members = await this.teamsService.getMembers(teamId);
    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user?.email,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  @Delete(':teamId/members/:userId')
  @UseGuards(TeamRoleGuard)
  @RequireTeamRole(TeamRole.ADMIN)
  async removeMember(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    await this.teamsService.removeMember(teamId, userId, req.user.id);
    return { success: true };
  }

  @Patch(':teamId/members/:userId/role')
  @UseGuards(TeamRoleGuard)
  @RequireTeamRole(TeamRole.OWNER)
  async changeMemberRole(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @Body() body: { role: TeamRole },
    @Request() req: any,
  ) {
    return this.teamsService.changeMemberRole(
      teamId,
      userId,
      body.role,
      req.user.id,
    );
  }

  @Patch(':teamId')
  @UseGuards(TeamRoleGuard)
  @RequireTeamRole(TeamRole.OWNER)
  async updateTeam(
    @Param('teamId') teamId: string,
    @Body() body: UpdateTeamDto,
    @Request() req: any,
  ) {
    return this.teamsService.update(teamId, req.user.id, body);
  }

  @Delete(':teamId')
  @UseGuards(TeamRoleGuard)
  @RequireTeamRole(TeamRole.OWNER)
  async deleteTeam(@Param('teamId') teamId: string, @Request() req: any) {
    await this.teamsService.deleteTeam(teamId, req.user.id);
    return { success: true };
  }

  @Get(':teamId/projects')
  @UseGuards(TeamRoleGuard)
  async getProjects(@Param('teamId') teamId: string) {
    return this.projectsService.findAllByTeam(teamId);
  }

  @Post(':teamId/projects')
  @UseGuards(TeamRoleGuard)
  @RequireTeamRole(TeamRole.ADMIN)
  async createProject(
    @Param('teamId') teamId: string,
    @Body() body: { name: string; domain?: string },
    @Request() req: any,
  ) {
    return this.projectsService.create(req.user.id, { ...body, teamId });
  }

  @Get(':teamId/activity')
  @UseGuards(TeamRoleGuard)
  async getActivity(
    @Param('teamId') teamId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const events = await this.activityService.getTeamActivity(teamId, {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return events.map((e) => ({
      id: e.id,
      action: e.action,
      actorEmail: e.actor?.email,
      metadata: e.metadata,
      createdAt: e.createdAt,
    }));
  }
}
