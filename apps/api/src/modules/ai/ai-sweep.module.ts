import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from '@insightstream/database';
import { AiSweepService } from './ai-sweep.service';
import { AiModule } from './ai.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [TypeOrmModule.forFeature([Feedback]), AiModule, PlansModule],
  providers: [AiSweepService],
})
export class AiSweepModule {}
