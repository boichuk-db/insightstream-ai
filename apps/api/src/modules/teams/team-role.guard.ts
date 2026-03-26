import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMember, TeamRole, ROLE_HIERARCHY } from '@insightstream/database';

export const REQUIRED_TEAM_ROLE_KEY = 'requiredTeamRole';
export const RequireTeamRole = (minRole: TeamRole) => SetMetadata(REQUIRED_TEAM_ROLE_KEY, minRole);

@Injectable()
export class TeamRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(TeamMember)
    private teamMemberRepo: Repository<TeamMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.getAllAndOverride<TeamRole>(REQUIRED_TEAM_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no role decorator, just check membership
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const teamId = request.params?.teamId;

    if (!userId || !teamId) {
      throw new ForbiddenException('Missing authentication or team context');
    }

    const member = await this.teamMemberRepo.findOne({
      where: { teamId, userId },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this team');
    }

    if (requiredRole && ROLE_HIERARCHY[member.role] < ROLE_HIERARCHY[requiredRole]) {
      throw new ForbiddenException(`Requires ${requiredRole} role or higher`);
    }

    request.teamMember = member;
    return true;
  }
}
