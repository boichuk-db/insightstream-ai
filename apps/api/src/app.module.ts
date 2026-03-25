import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { EventsModule } from './modules/events/events.module';
import { DigestModule } from './modules/digest/digest.module';
import { User, Feedback, Project, AuditLog } from '@insightstream/database';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'insight_user',
      password: process.env.DB_PASSWORD || 'insight_password',
      database: process.env.DB_DATABASE || 'insightstream_dev',
      entities: [User, Feedback, Project, AuditLog],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    UsersModule,
    AuthModule,
    FeedbackModule,
    ProjectsModule,
    EventsModule,
    DigestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
