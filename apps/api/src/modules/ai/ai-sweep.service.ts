import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Between, LessThan } from 'typeorm';
import { Feedback, PlanType } from '@insightstream/database';
import { AiQueueService } from './ai-queue.service';
import { PlanLimitsService } from '../plans/plan-limits.service';

const FIFTEEN_MIN_MS = 15 * 60 * 1000;
const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;
const BATCH_LIMIT = 100;

@Injectable()
export class AiSweepService {
  private readonly logger = new Logger(AiSweepService.name);

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    private readonly aiQueueService: AiQueueService,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  /** Every 5 minutes: re-enqueue feedback whose AI analysis never landed. */
  @Cron('*/5 * * * *', { name: 'ai-sweep' })
  async sweep(): Promise<void> {
    const now = Date.now();
    const staleBefore = new Date(now - FIFTEEN_MIN_MS);
    const windowStart = new Date(now - TWENTY_FOUR_H_MS);

    try {
      const abandoned = await this.feedbackRepository.count({
        where: {
          sentimentScore: IsNull(),
          createdAt: LessThan(windowStart),
        },
      });
      if (abandoned > 0) {
        this.logger.warn(
          `${abandoned} feedback abandoned (never analyzed, older than 24h)`,
        );
      }

      const candidates = await this.feedbackRepository.find({
        where: {
          sentimentScore: IsNull(),
          createdAt: Between(windowStart, staleBefore),
        },
        relations: ['project'],
        order: { createdAt: 'ASC' },
        take: BATCH_LIMIT,
      });

      const planCache = new Map<string, PlanType>();
      let requeued = 0;

      for (const fb of candidates) {
        try {
          const teamId = fb.project?.teamId;
          if (!teamId) {
            this.logger.warn(
              `Feedback ${fb.id} has no team; skipping sweep re-enqueue`,
            );
            continue;
          }

          let plan = planCache.get(teamId);
          if (plan === undefined) {
            plan = await this.planLimitsService.getTeamPlan(teamId);
            planCache.set(teamId, plan);
          }
          const aiLevel = this.planLimitsService.getLimits(plan).aiAnalysis;
          if (aiLevel === 'none') continue;

          await this.aiQueueService.addAnalysisJob(
            {
              feedbackId: fb.id,
              content: fb.content,
              projectId: fb.projectId,
              teamId,
              aiLevel: aiLevel === 'full' ? 'full' : 'basic',
            },
            10,
          );
          requeued++;
        } catch (err) {
          this.logger.error(
            `Sweep failed to re-enqueue feedback ${fb.id}`,
            err as Error,
          );
        }
      }

      if (requeued > 0) {
        this.logger.log(
          `Self-healing sweep re-enqueued ${requeued} feedback for AI analysis`,
        );
      }
    } catch (err) {
      this.logger.error('AI sweep run failed', err as Error);
    }
  }
}
