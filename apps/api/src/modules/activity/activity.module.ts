import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityEvent } from '@insightstream/database';
import { ActivityService } from './activity.service';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityEvent])],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
