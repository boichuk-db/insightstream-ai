import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Project,
  Team,
  TeamMember,
  TeamRole,
  hasMinRole,
} from '@insightstream/database';
import { PlanLimitsService } from '../plans/plan-limits.service';
import * as crypto from 'crypto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
    @InjectRepository(Team)
    private teamRepo: Repository<Team>,
    private planLimitsService: PlanLimitsService,
  ) {}

  async create(
    userId: string,
    data: { name: string; domain?: string; teamId: string },
  ): Promise<Project> {
    if (!data.teamId) throw new BadRequestException('teamId is required');
    const member = await this.memberRepo.findOne({
      where: { teamId: data.teamId, userId },
    });
    if (!member || !hasMinRole(member.role, TeamRole.ADMIN)) {
      throw new ForbiddenException('Requires admin role in this team');
    }

    const check = await this.planLimitsService.canCreateProject(data.teamId);
    const plan = await this.planLimitsService.getTeamPlan(data.teamId);
    this.planLimitsService.assertAllowed(check, 'projects', plan);

    const project = this.projectsRepository.create({
      name: data.name,
      domain: data.domain,
      userId,
      teamId: data.teamId,
      apiKey: crypto.randomUUID(),
    });
    return this.projectsRepository.save(project);
  }

  /**
   * Team-scoped listing with a membership check. For the caller's own
   * (owned) team, an empty list bootstraps a Default Project — onboarding
   * behavior kept from the pre-tenant era, now team-scoped.
   */
  async findAllForMember(teamId: string, userId: string): Promise<Project[]> {
    const member = await this.memberRepo.findOne({ where: { teamId, userId } });
    if (!member) throw new NotFoundException('Team not found');

    let projects = await this.projectsRepository.find({
      where: { teamId },
      order: { createdAt: 'DESC' },
    });

    if (projects.length === 0) {
      const team = await this.teamRepo.findOne({ where: { id: teamId } });
      if (team?.ownerId === userId) {
        projects = [
          await this.projectsRepository.save(
            this.projectsRepository.create({
              name: 'Default Project',
              domain: 'localhost',
              userId,
              teamId,
              apiKey: crypto.randomUUID(),
            }),
          ),
        ];
      }
    }
    return projects;
  }

  async findAllByTeam(teamId: string): Promise<Project[]> {
    return this.projectsRepository.find({
      where: { teamId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Access = membership in the project's team. Creator attribution grants nothing. */
  async findOne(id: string, userId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    const member = await this.memberRepo.findOne({
      where: { teamId: project.teamId, userId },
    });
    if (!member) throw new NotFoundException('Project not found');
    return project;
  }

  async findByApiKey(apiKey: string): Promise<Project | null> {
    return this.projectsRepository.findOne({ where: { apiKey } });
  }

  async findByOnlyId(id: string): Promise<Project | null> {
    return this.projectsRepository.findOne({ where: { id } });
  }

  async remove(id: string, userId: string): Promise<void> {
    const project = await this.findOne(id, userId);
    await this.projectsRepository.remove(project);
  }
}
