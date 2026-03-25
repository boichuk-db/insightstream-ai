import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project, Feedback, User } from '@insightstream/database';
import { AiModule } from '../ai/ai.module';
import { MailModule } from '../mail/mail.module';
import { DigestService } from './digest.service';
import { DigestController } from './digest.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Feedback, User]),
    AiModule,
    MailModule,
  ],
  providers: [DigestService],
  controllers: [DigestController],
})
export class DigestModule {}
