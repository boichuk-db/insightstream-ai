import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Project, Feedback, User } from '@insightstream/database';
import { AiService } from '../ai/ai.service';
import { MailService } from '../mail/mail.service';
import { PlanLimitsService } from '../plans/plan-limits.service';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(Feedback) private feedbacks: Repository<Feedback>,
    @InjectRepository(User) private users: Repository<User>,
    private ai: AiService,
    private mail: MailService,
    private planLimitsService: PlanLimitsService,
  ) {}

  /** Runs every Monday at 09:00 AM */
  @Cron('0 9 * * 1', { name: 'weekly-digest' })
  async handleWeeklyDigest() {
    this.logger.log('Starting weekly digest run...');
    await this.runDigest();
  }

  /** Generate AI summary for a single project without sending email */
  async preview(projectId: string): Promise<{
    projectName: string;
    since: string;
    totalCount: number;
    avgSentiment: number;
    categories: Record<string, number>;
    topTags: string[];
    mostNegative: Array<{ content: string; sentimentScore: number | null }>;
    aiSummary: string;
  }> {
    const project = await this.projects.findOne({
      where: { id: projectId },
      relations: ['user'],
    });
    if (!project) throw new Error(`Project ${projectId} not found`);

    // Gate digest preview by plan
    if ((project as any).user?.id) {
      const hasDigest = await this.planLimitsService.canUseFeature(
        (project as any).user.id,
        'weeklyDigest',
      );
      if (!hasDigest) {
        throw new Error(
          'Weekly digest is available on Pro and Business plans. Please upgrade.',
        );
      }
    }

    const since = new Date();
    since.setDate(since.getDate() - 7);

    const weekFeedbacks = await this.feedbacks.find({
      where: { projectId, createdAt: MoreThan(since) },
      order: { sentimentScore: 'ASC' },
    });

    const stats = this.buildStats(project.name, weekFeedbacks);
    const aiSummary =
      weekFeedbacks.length > 0
        ? await this.ai.generateWeeklyDigest(stats)
        : '<p>No feedbacks in the last 7 days to analyse.</p>';

    return { ...stats, since: since.toISOString(), aiSummary };
  }

  /** Called manually via the controller for testing */
  async runDigest(): Promise<{ sent: number; skipped: number }> {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const allProjects = await this.projects.find({ relations: ['user'] });
    let sent = 0;
    let skipped = 0;

    for (const project of allProjects) {
      try {
        // Skip digest for users whose plan doesn't include it
        const ownerId = (project as any).user?.id;
        if (ownerId) {
          const hasDigest = await this.planLimitsService.canUseFeature(
            ownerId,
            'weeklyDigest',
          );
          if (!hasDigest) {
            this.logger.debug(
              `Project "${project.name}" — owner plan does not include weekly digest, skipping.`,
            );
            skipped++;
            continue;
          }
        }

        const weekFeedbacks = await this.feedbacks.find({
          where: { projectId: project.id, createdAt: MoreThan(since) },
          order: { createdAt: 'DESC' },
        });

        if (weekFeedbacks.length === 0) {
          this.logger.debug(
            `Project "${project.name}" — no feedbacks this week, skipping.`,
          );
          skipped++;
          continue;
        }

        const ownerEmail = (project as any).user?.email;
        if (!ownerEmail) {
          this.logger.warn(
            `Project "${project.name}" — owner email not found, skipping.`,
          );
          skipped++;
          continue;
        }

        const stats = this.buildStats(project.name, weekFeedbacks);
        const aiSummary = await this.ai.generateWeeklyDigest(stats);
        const html = this.renderEmail(project.name, stats, aiSummary, since);

        await this.mail.send(
          ownerEmail,
          `📊 Weekly Digest: ${project.name}`,
          html,
        );

        sent++;
        this.logger.log(
          `Digest sent for "${project.name}" → ${ownerEmail} (${weekFeedbacks.length} feedbacks)`,
        );
      } catch (err) {
        this.logger.error(`Failed digest for project "${project.name}":`, err);
        skipped++;
      }
    }

    this.logger.log(`Digest run complete — sent: ${sent}, skipped: ${skipped}`);
    return { sent, skipped };
  }

  private buildStats(projectName: string, feedbacks: Feedback[]) {
    const categories: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    let sentimentSum = 0;
    let sentimentCount = 0;

    for (const fb of feedbacks) {
      if (fb.category)
        categories[fb.category] = (categories[fb.category] || 0) + 1;
      if (fb.tags)
        fb.tags.forEach((t) => {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        });
      if (fb.sentimentScore != null) {
        sentimentSum += fb.sentimentScore;
        sentimentCount++;
      }
    }

    const avgSentiment =
      sentimentCount > 0 ? sentimentSum / sentimentCount : 0.5;

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag);

    const mostNegative = [...feedbacks]
      .filter((fb) => fb.sentimentScore != null)
      .sort((a, b) => (a.sentimentScore ?? 0.5) - (b.sentimentScore ?? 0.5))
      .slice(0, 5)
      .map((fb) => ({
        content: fb.content,
        sentimentScore: fb.sentimentScore,
      }));

    return {
      projectName,
      totalCount: feedbacks.length,
      avgSentiment,
      categories,
      topTags,
      mostNegative,
    };
  }

  private renderEmail(
    projectName: string,
    stats: ReturnType<typeof this.buildStats>,
    aiSummary: string,
    since: Date,
  ): string {
    const sentimentColor =
      stats.avgSentiment > 0.6
        ? '#10b981'
        : stats.avgSentiment < 0.4
          ? '#ef4444'
          : '#f59e0b';
    const sentimentPct = Math.round(stats.avgSentiment * 100);
    const dateRange = `${since.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const topCategory = Object.entries(stats.categories).sort(
      (a, b) => b[1] - a[1],
    )[0];

    const categoryRows = Object.entries(stats.categories)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => {
        const pct = Math.round((count / stats.totalCount) * 100);
        const barColor =
          cat === 'Bug'
            ? '#ef4444'
            : cat === 'Feature'
              ? '#10b981'
              : cat === 'UI/UX'
                ? '#ec4899'
                : '#6366f1';
        return `
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#374151;width:110px">${cat}</td>
            <td style="padding:6px 8px">
              <div style="background:#f3f4f6;border-radius:4px;height:8px;width:100%">
                <div style="background:${barColor};border-radius:4px;height:8px;width:${pct}%"></div>
              </div>
            </td>
            <td style="padding:6px 0;font-size:13px;color:#6b7280;text-align:right;white-space:nowrap">${count} (${pct}%)</td>
          </tr>`;
      })
      .join('');

    const negativeRows =
      stats.mostNegative.length > 0
        ? stats.mostNegative
            .map(
              (fb) => `
          <tr>
            <td style="padding:8px 12px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;vertical-align:top">${this.escape(fb.content)}</td>
            <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#ef4444;white-space:nowrap;border-bottom:1px solid #f3f4f6;text-align:right;vertical-align:top">${Math.round((fb.sentimentScore ?? 0.5) * 100)}%</td>
          </tr>`,
            )
            .join('')
        : `<tr><td colspan="2" style="padding:12px;color:#9ca3af;font-size:12px">No negative feedbacks this week.</td></tr>`;

    const tagBadges = stats.topTags
      .map(
        (t) =>
          `<span style="display:inline-block;margin:3px 4px 3px 0;padding:2px 8px;background:#ede9fe;color:#5b21b6;border-radius:12px;font-size:11px;font-weight:600">#${this.escape(t)}</span>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

        <!-- Header -->
        <tr><td style="background:#4f46e5;border-radius:12px 12px 0 0;padding:28px 32px">
          <p style="margin:0;font-size:11px;color:#a5b4fc;letter-spacing:.08em;text-transform:uppercase;font-weight:700">Weekly AI Digest</p>
          <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:800">${this.escape(projectName)}</h1>
          <p style="margin:6px 0 0;font-size:12px;color:#c7d2fe">${dateRange}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px">

          <!-- KPI row -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr>
              <td align="center" style="padding:16px;background:#f5f3ff;border-radius:8px;width:33%">
                <p style="margin:0;font-size:28px;font-weight:800;color:#4f46e5">${stats.totalCount}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">Feedbacks</p>
              </td>
              <td width="12"></td>
              <td align="center" style="padding:16px;background:#f9fafb;border-radius:8px;width:33%">
                <p style="margin:0;font-size:28px;font-weight:800;color:${sentimentColor}">${sentimentPct}%</p>
                <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">Avg Sentiment</p>
              </td>
              <td width="12"></td>
              <td align="center" style="padding:16px;background:#f9fafb;border-radius:8px;width:33%">
                <p style="margin:0;font-size:28px;font-weight:800;color:#374151">${topCategory ? this.escape(topCategory[0]) : '—'}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">Top Category</p>
              </td>
            </tr>
          </table>

          <!-- AI Summary -->
          <h2 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:.06em">🤖 AI Trend Analysis</h2>
          <div style="background:#f5f3ff;border-left:3px solid #6366f1;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px;font-size:13px;line-height:1.7;color:#374151">
            ${aiSummary}
          </div>

          <!-- Category breakdown -->
          <h2 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:.06em">📊 Category Breakdown</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            ${categoryRows}
          </table>

          <!-- Top tags -->
          ${
            stats.topTags.length > 0
              ? `
          <h2 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:.06em">🏷️ Top Tags</h2>
          <div style="margin-bottom:28px">${tagBadges}</div>`
              : ''
          }

          <!-- Most negative -->
          <h2 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:.06em">⚠️ Top Concerns</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f3f4f6;border-radius:8px;overflow:hidden;margin-bottom:8px">
            <thead>
              <tr style="background:#fef2f2">
                <th style="padding:8px 12px;font-size:11px;color:#9ca3af;text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Feedback</th>
                <th style="padding:8px 12px;font-size:11px;color:#9ca3af;text-align:right;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Sentiment</th>
              </tr>
            </thead>
            <tbody>${negativeRows}</tbody>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center">
            Sent by <strong style="color:#6366f1">InsightStream</strong> · Weekly digest every Monday at 9 AM
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private escape(str: string) {
    return (str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
