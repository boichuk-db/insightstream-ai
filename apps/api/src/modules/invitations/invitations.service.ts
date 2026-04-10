import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  Invitation,
  InvitationStatus,
  Team,
  TeamMember,
  TeamRole,
  User,
  ActivityAction,
  PLAN_CONFIGS,
  PlanType,
} from '@insightstream/database';
import { MailService } from '../mail/mail.service';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private invitationRepo: Repository<Invitation>,
    @InjectRepository(TeamMember) private memberRepo: Repository<TeamMember>,
    @InjectRepository(Team) private teamRepo: Repository<Team>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private mailService: MailService,
    private activityService: ActivityService,
    private config: ConfigService,
  ) {}

  async create(
    teamId: string,
    email: string,
    role: TeamRole,
    invitedById: string,
  ): Promise<Invitation> {
    // Check if already a member
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      const existingMember = await this.memberRepo.findOne({
        where: { teamId, userId: existingUser.id },
      });
      if (existingMember) {
        throw new ConflictException('User is already a member of this team');
      }
    }

    // Check for pending invitation
    const pendingInvite = await this.invitationRepo.findOne({
      where: { teamId, email, status: InvitationStatus.PENDING },
    });
    if (pendingInvite) {
      throw new ConflictException(
        'An invitation is already pending for this email',
      );
    }

    // Check plan limits for team members
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['owner'],
    });
    if (!team) throw new NotFoundException('Team not found');

    const ownerPlan = (team.owner?.plan as PlanType) || PlanType.FREE;
    const limits = PLAN_CONFIGS[ownerPlan];
    const currentMembers = await this.memberRepo.count({ where: { teamId } });
    const pendingCount = await this.invitationRepo.count({
      where: { teamId, status: InvitationStatus.PENDING },
    });

    const bypassPlanLimits = process.env.E2E_BYPASS_PLAN_LIMITS === 'true';
    if (!bypassPlanLimits && currentMembers + pendingCount >= limits.maxTeamMembers) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'PlanLimitExceeded',
        message: `Your ${limits.name} plan allows ${limits.maxTeamMembers} team members. Upgrade for more.`,
        currentPlan: ownerPlan,
        limit: limits.maxTeamMembers,
        current: currentMembers,
      });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.invitationRepo.save(
      this.invitationRepo.create({
        teamId,
        email,
        role,
        token,
        status: InvitationStatus.PENDING,
        invitedById,
        expiresAt,
      }),
    );

    // Send invitation email
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/invite/accept?token=${token}`;
    const inviter = await this.userRepo.findOne({ where: { id: invitedById } });

    await this.mailService.send(
      email,
      `You're invited to join ${team.name} on InsightStream`,
      `
        <h2>Team Invitation</h2>
        <p>${inviter?.email || 'A team member'} has invited you to join <strong>${team.name}</strong> as a <strong>${role}</strong>.</p>
        <p><a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;">Accept Invitation</a></p>
        <p>This invitation expires in 7 days.</p>
        <p style="color:#888;font-size:12px;">If you didn't expect this invitation, you can ignore this email.</p>
      `,
    );

    await this.activityService.log({
      teamId,
      actorId: invitedById,
      action: ActivityAction.INVITATION_SENT,
      metadata: { email, role },
    });

    return invitation;
  }

  async getInfo(token: string) {
    const invitation = await this.invitationRepo.findOne({
      where: { token },
      relations: ['team', 'invitedBy'],
    });
    if (!invitation) throw new NotFoundException('Invitation not found');

    if (invitation.status !== InvitationStatus.PENDING) {
      return { status: invitation.status, teamName: invitation.team?.name };
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepo.save(invitation);
      return {
        status: InvitationStatus.EXPIRED,
        teamName: invitation.team?.name,
      };
    }

    return {
      status: invitation.status,
      teamName: invitation.team?.name,
      inviterEmail: invitation.invitedBy?.email,
      role: invitation.role,
      email: invitation.email,
    };
  }

  async accept(token: string, userId: string): Promise<{ teamId: string }> {
    const invitation = await this.invitationRepo.findOne({
      where: { token },
      relations: ['team'],
    });
    if (!invitation) throw new NotFoundException('Invitation not found');

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ForbiddenException(`Invitation is ${invitation.status}`);
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepo.save(invitation);
      throw new ForbiddenException('Invitation has expired');
    }

    // Check if already a member
    const existing = await this.memberRepo.findOne({
      where: { teamId: invitation.teamId, userId },
    });
    if (existing) {
      invitation.status = InvitationStatus.ACCEPTED;
      await this.invitationRepo.save(invitation);
      return { teamId: invitation.teamId };
    }

    // Add as team member
    await this.memberRepo.save(
      this.memberRepo.create({
        teamId: invitation.teamId,
        userId,
        role: invitation.role,
      }),
    );

    invitation.status = InvitationStatus.ACCEPTED;
    await this.invitationRepo.save(invitation);

    await this.activityService.log({
      teamId: invitation.teamId,
      actorId: userId,
      action: ActivityAction.MEMBER_JOINED,
      metadata: { role: invitation.role },
    });

    return { teamId: invitation.teamId };
  }

  async listPending(teamId: string): Promise<Invitation[]> {
    return this.invitationRepo.find({
      where: { teamId, status: InvitationStatus.PENDING },
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async cancel(invitationId: string, teamId: string): Promise<void> {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId, teamId },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    await this.invitationRepo.remove(invitation);
  }
}
