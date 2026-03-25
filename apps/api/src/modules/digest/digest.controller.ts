import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DigestService } from './digest.service';

@Controller('digest')
@UseGuards(JwtAuthGuard)
export class DigestController {
  constructor(private digest: DigestService) {}

  /** Generate AI summary for one project (no email sent) */
  @Get('preview/:projectId')
  async preview(@Param('projectId') projectId: string) {
    return this.digest.preview(projectId);
  }

  /** Manual trigger — sends digest emails for all projects */
  @Post('trigger')
  async trigger() {
    const result = await this.digest.runDigest();
    return { message: 'Digest run complete', ...result };
  }
}
