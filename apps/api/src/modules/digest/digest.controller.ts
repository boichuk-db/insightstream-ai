import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Headers,
  UnauthorizedException,
  Request,
} from '@nestjs/common';
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

  /** Called by Lambda via EventBridge — secured with INTERNAL_SECRET */
  @Post('internal-trigger')
  async internalTrigger(@Headers('x-internal-secret') secret: string) {
    if (!secret || secret !== process.env.INTERNAL_SECRET) {
      throw new UnauthorizedException();
    }
    const result = await this.digest.runDigest();
    return { message: 'Digest run complete', ...result };
  }
}
