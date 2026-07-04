import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project, Team, TeamMember } from '@insightstream/database';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Team, TeamMember]),
    PlansModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
