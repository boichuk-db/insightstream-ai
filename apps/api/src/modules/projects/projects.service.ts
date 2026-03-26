import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, TeamMember } from '@insightstream/database';
import { PlanLimitsService } from '../plans/plan-limits.service';
import * as crypto from 'crypto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
    private planLimitsService: PlanLimitsService,
  ) {}

  async create(userId: string, data: { name: string; domain?: string; teamId?: string }): Promise<Project> {
    const check = await this.planLimitsService.canCreateProject(userId);
    const plan = await this.planLimitsService.getUserPlan(userId);
    this.planLimitsService.assertAllowed(check, 'projects', plan);

    const project = this.projectsRepository.create({
      name: data.name,
      domain: data.domain,
      userId,
      teamId: data.teamId || null,
      apiKey: crypto.randomUUID(),
    });
    return this.projectsRepository.save(project);
  }

  async findAllByUser(userId: string): Promise<Project[]> {
    let projects = await this.projectsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (projects.length === 0) {
      const defaultProject = await this.projectsRepository.save(
        this.projectsRepository.create({
          name: 'Default Project',
          domain: 'localhost',
          userId,
          apiKey: crypto.randomUUID(),
        }),
      );
      projects = [defaultProject];
    }
    return projects;
  }

  async findAllByTeam(teamId: string): Promise<Project[]> {
    return this.projectsRepository.find({
      where: { teamId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    // Check access: direct owner or team member
    if (project.userId === userId) return project;

    if (project.teamId) {
      const member = await this.memberRepo.findOne({
        where: { teamId: project.teamId, userId },
      });
      if (member) return project;
    }

    throw new NotFoundException('Project not found');
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

  async getAllDomains(): Promise<string[]> {
    const projects = await this.projectsRepository.find({ select: ['domain'] });
    return projects.map(p => p.domain).filter(Boolean) as string[];
  }
}
