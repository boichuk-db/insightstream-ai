import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Team, TeamMember, TeamRole, Project, User, ActivityAction } from '@insightstream/database';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team) private teamRepo: Repository<Team>,
    @InjectRepository(TeamMember) private memberRepo: Repository<TeamMember>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private activityService: ActivityService,
  ) {}

  async create(userId: string, data: { name: string }): Promise<Team> {
    const team = await this.teamRepo.save(
      this.teamRepo.create({ name: data.name, ownerId: userId }),
    );

    await this.memberRepo.save(
      this.memberRepo.create({ teamId: team.id, userId, role: TeamRole.OWNER }),
    );

    await this.activityService.log({
      teamId: team.id,
      actorId: userId,
      action: ActivityAction.PROJECT_CREATED,
      metadata: { teamName: data.name },
    });

    return team;
  }

  async createPersonalTeam(userId: string): Promise<Team> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const teamName = `${user?.email?.split('@')[0] || 'My'}'s Team`;

    const team = await this.teamRepo.save(
      this.teamRepo.create({ name: teamName, ownerId: userId }),
    );

    await this.memberRepo.save(
      this.memberRepo.create({ teamId: team.id, userId, role: TeamRole.OWNER }),
    );

    return team;
  }

  async ensurePersonalTeam(userId: string): Promise<Team> {
    const existingMembership = await this.memberRepo.findOne({
      where: { userId },
      relations: ['team'],
    });

    if (existingMembership) {
      return existingMembership.team;
    }

    const team = await this.createPersonalTeam(userId);

    // Migrate orphan projects (no teamId) to this team
    await this.projectRepo.update(
      { userId, teamId: IsNull() },
      { teamId: team.id },
    );

    return team;
  }

  async findAllByUser(userId: string): Promise<Team[]> {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['team'],
      order: { joinedAt: 'ASC' },
    });
    return memberships.map(m => m.team);
  }

  async findOne(teamId: string): Promise<Team> {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['owner'],
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async getMembership(teamId: string, userId: string): Promise<TeamMember | null> {
    return this.memberRepo.findOne({ where: { teamId, userId } });
  }

  async getMembers(teamId: string): Promise<TeamMember[]> {
    return this.memberRepo.find({
      where: { teamId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }

  async removeMember(teamId: string, targetUserId: string, actorId: string): Promise<void> {
    const target = await this.memberRepo.findOne({
      where: { teamId, userId: targetUserId },
      relations: ['user'],
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === TeamRole.OWNER) {
      throw new ForbiddenException('Cannot remove the team owner');
    }

    await this.memberRepo.remove(target);

    await this.activityService.log({
      teamId,
      actorId,
      action: ActivityAction.MEMBER_REMOVED,
      metadata: { removedUserId: targetUserId, removedEmail: target.user?.email },
    });
  }

  async changeMemberRole(teamId: string, targetUserId: string, newRole: TeamRole, actorId: string): Promise<TeamMember> {
    const target = await this.memberRepo.findOne({
      where: { teamId, userId: targetUserId },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === TeamRole.OWNER) {
      throw new ForbiddenException('Cannot change owner role');
    }
    if (newRole === TeamRole.OWNER) {
      throw new ForbiddenException('Cannot assign owner role');
    }

    const oldRole = target.role;
    target.role = newRole;
    const updated = await this.memberRepo.save(target);

    await this.activityService.log({
      teamId,
      actorId,
      action: ActivityAction.MEMBER_ROLE_CHANGED,
      metadata: { targetUserId, oldRole, newRole },
    });

    return updated;
  }

  async deleteTeam(teamId: string, userId: string): Promise<void> {
    const team = await this.findOne(teamId);
    if (team.ownerId !== userId) {
      throw new ForbiddenException('Only the team owner can delete the team');
    }
    await this.teamRepo.remove(team);
  }
}
