import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '@insightstream/database';
import { FEEDBACK_EVENTS_PUBLISHER } from './modules/events/feedback-events-publisher.token';
import { RedisFeedbackEventsPublisher } from './modules/events/redis-feedback-events-publisher.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  providers: [
    RedisFeedbackEventsPublisher,
    {
      provide: FEEDBACK_EVENTS_PUBLISHER,
      useExisting: RedisFeedbackEventsPublisher,
    },
  ],
  exports: [FEEDBACK_EVENTS_PUBLISHER],
})
export class WorkerEventsModule {}
