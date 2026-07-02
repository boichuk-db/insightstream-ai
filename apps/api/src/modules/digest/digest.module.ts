import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project, Feedback, User } from '@insightstream/database';
import { AiModule } from '../ai/ai.module';
import { MailModule } from '../mail/mail.module';
import { DigestService } from './digest.service';
import { DigestController } from './digest.controller';
import { PlansModule } from '../plans/plans.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Feedback, User]),
    AiModule,
    MailModule,
    PlansModule,
    ProjectsModule,
  ],
  providers: [DigestService],
  controllers: [DigestController],
})
export class DigestModule {}
