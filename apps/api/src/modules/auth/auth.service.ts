import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { TeamsService } from '../teams/teams.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private teamsService: TeamsService,
  ) {}

  async register(email: string, pass: string) {
    const existing = await this.usersService.findOneByEmail(email);
    if (existing) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await bcrypt.hash(pass, 10);
    const user = await this.usersService.create({
      email,
      passwordHash,
    });

    // Auto-create personal team for new user
    await this.teamsService.createPersonalTeam(user.id);

    return this.login(user);
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role, plan: user.plan };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        plan: user.plan,
      },
    };
  }
}
