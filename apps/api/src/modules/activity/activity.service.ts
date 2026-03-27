import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityEvent, ActivityAction } from '@insightstream/database';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityEvent)
    private activityRepo: Repository<ActivityEvent>,
  ) {}

  async log(params: {
    teamId: string;
    projectId?: string;
    actorId: string;
    action: ActivityAction;
    metadata?: Record<string, any>;
  }): Promise<ActivityEvent> {
    const event = this.activityRepo.create({
      teamId: params.teamId,
      projectId: params.projectId || null,
      actorId: params.actorId,
      action: params.action,
      metadata: params.metadata || null,
    });
    return this.activityRepo.save(event);
  }

  async getTeamActivity(
    teamId: string,
    options: { limit?: number; offset?: number } = {},
  ) {
    const { limit = 50, offset = 0 } = options;
    return this.activityRepo.find({
      where: { teamId },
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }
}
