import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invitation, TeamMember, Team, User } from '@insightstream/database';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { MailModule } from '../mail/mail.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation, TeamMember, Team, User]),
    MailModule,
    ActivityModule,
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
