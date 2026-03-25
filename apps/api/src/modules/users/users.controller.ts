import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    // req.user is set by JwtAuthGuard via Passport
    let user = await this.usersService.findOneById(req.user.id);
    if (!user) {
      return null;
    }
    
    if (!user.apiKey) {
      user = await this.usersService.generateApiKey(user.id);
    }
    
    const { passwordHash, ...result } = user as any;
    return result;
  }
}
