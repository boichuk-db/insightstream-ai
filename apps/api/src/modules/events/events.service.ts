import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '@insightstream/database';
import { EventsGateway } from './events.gateway';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private gateway: EventsGateway,
  ) {}

  /** One emit to the project's team room covers every member's dashboard. */
  async emitFeedbackUpdatedForProject(projectId: string): Promise<void> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) return;
    this.gateway.emitFeedbackUpdatedToTeam(project.teamId);
  }
}
