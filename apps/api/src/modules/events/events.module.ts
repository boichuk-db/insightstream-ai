import { Module, Global } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Global() // This makes it available everywhere
@Module({
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
