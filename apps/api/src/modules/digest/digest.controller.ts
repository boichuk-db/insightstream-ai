import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DigestService } from './digest.service';

@Controller('digest')
export class DigestController {
  constructor(private digest: DigestService) {}

  @UseGuards(JwtAuthGuard)
  @Get('preview/:projectId')
  async preview(@Param('projectId') projectId: string, @Request() req: any) {
    return this.digest.preview(projectId, req.user.id);
  }
}
