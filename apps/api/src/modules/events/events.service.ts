import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, TeamMember } from '@insightstream/database';
import { EventsGateway } from './events.gateway';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
    private gateway: EventsGateway,
  ) {}

  /** Notify the project owner and, for team projects, every team member. */
  async emitFeedbackUpdatedForProject(projectId: string): Promise<void> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) return;

    const userIds = new Set<string>([project.userId]);
    if (project.teamId) {
      const members = await this.memberRepo.find({
        where: { teamId: project.teamId },
      });
      for (const m of members) userIds.add(m.userId);
    }
    for (const id of userIds) this.gateway.emitFeedbackUpdated(id);
  }
}
