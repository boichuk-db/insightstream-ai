import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project, TeamMember } from '@insightstream/database';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Project, TeamMember]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'super_secret_key',
      }),
    }),
  ],
  providers: [EventsGateway, EventsService],
  exports: [EventsGateway, EventsService],
})
export class EventsModule {}
