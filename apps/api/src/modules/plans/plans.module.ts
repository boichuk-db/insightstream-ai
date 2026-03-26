import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Project, Feedback, TeamMember, Team } from '@insightstream/database';
import { PlanLimitsService } from './plan-limits.service';
import { PlansController } from './plans.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Project, Feedback, TeamMember, Team])],
  providers: [PlanLimitsService],
  controllers: [PlansController],
  exports: [PlanLimitsService],
})
export class PlansModule {}
