import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { Emitter } from '@socket.io/redis-emitter';
import { Project } from '@insightstream/database';
import { FeedbackEventsPublisher } from './feedback-events-publisher.token';

@Injectable()
export class RedisFeedbackEventsPublisher
  implements FeedbackEventsPublisher, OnModuleDestroy
{
  private readonly redisClient: Redis;
  private readonly emitter: Emitter;

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {
    this.redisClient = new Redis(
      process.env.REDIS_URL || 'redis://localhost:6379',
    );
    this.emitter = new Emitter(this.redisClient);
  }

  /** Mirrors EventsService.emitFeedbackUpdatedForProject, minus a local Socket.io server. */
  async emitFeedbackUpdatedForProject(projectId: string): Promise<void> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) return;
    this.emitter
      .to(`team-${project.teamId}`)
      .emit('feedbackUpdated', { timestamp: new Date() });
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
  }
}
