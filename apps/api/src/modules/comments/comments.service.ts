import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment, Feedback, Project, TeamMember, ActivityAction } from '@insightstream/database';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment) private commentRepo: Repository<Comment>,
    @InjectRepository(Feedback) private feedbackRepo: Repository<Feedback>,
    @InjectRepository(TeamMember) private memberRepo: Repository<TeamMember>,
    private activityService: ActivityService,
  ) {}

  async create(feedbackId: string, userId: string, content: string): Promise<Comment> {
    // Verify feedback exists and user has team access
    const feedback = await this.feedbackRepo.findOne({
      where: { id: feedbackId },
      relations: ['project'],
    });
    if (!feedback) throw new NotFoundException('Feedback not found');

    const project = feedback.project;
    if (project.teamId) {
      const member = await this.memberRepo.findOne({
        where: { teamId: project.teamId, userId },
      });
      if (!member) throw new ForbiddenException('You are not a member of this team');
    } else if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const comment = await this.commentRepo.save(
      this.commentRepo.create({ feedbackId, userId, content }),
    );

    if (project.teamId) {
      await this.activityService.log({
        teamId: project.teamId,
        projectId: project.id,
        actorId: userId,
        action: ActivityAction.COMMENT_ADDED,
        metadata: { feedbackId, commentId: comment.id },
      });
    }

    return this.commentRepo.findOne({
      where: { id: comment.id },
      relations: ['user'],
    }) as Promise<Comment>;
  }

  async findByFeedback(feedbackId: string): Promise<Comment[]> {
    return this.commentRepo.find({
      where: { feedbackId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async remove(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
      relations: ['feedback', 'feedback.project'],
    });
    if (!comment) throw new NotFoundException('Comment not found');

    // Author can delete own comment; Admin+ can delete any
    if (comment.userId !== userId) {
      const project = comment.feedback?.project;
      if (project?.teamId) {
        const member = await this.memberRepo.findOne({
          where: { teamId: project.teamId, userId },
        });
        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
          throw new ForbiddenException('Only comment author or team admin can delete');
        }
      } else {
        throw new ForbiddenException('Only comment author can delete');
      }
    }

    await this.commentRepo.remove(comment);
  }
}
