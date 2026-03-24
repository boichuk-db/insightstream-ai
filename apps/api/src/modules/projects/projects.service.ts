import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '@insightstream/database';
import * as crypto from 'crypto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
  ) {}

  async create(userId: string, data: { name: string; domain?: string }): Promise<Project> {
    const project = this.projectsRepository.create({
      ...data,
      userId,
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
      // Auto-create a default project for backward compatibility and UX
      const defaultProject = await this.create(userId, { name: 'Default Project', domain: 'localhost' });
      projects = [defaultProject];
    }
    return projects;
  }

  async findOne(id: string, userId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({ where: { id, userId } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async findByApiKey(apiKey: string): Promise<Project | null> {
    return this.projectsRepository.findOne({ where: { apiKey } });
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
