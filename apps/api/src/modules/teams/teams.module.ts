import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team, TeamMember, Project, User } from '@insightstream/database';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { TeamRoleGuard } from './team-role.guard';
import { ActivityModule } from '../activity/activity.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, TeamMember, Project, User]),
    ActivityModule,
    ProjectsModule,
  ],
  controllers: [TeamsController],
  providers: [TeamsService, TeamRoleGuard],
  exports: [TeamsService],
})
export class TeamsModule {}
