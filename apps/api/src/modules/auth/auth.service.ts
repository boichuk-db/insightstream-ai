import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { TeamsService } from '../teams/teams.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private teamsService: TeamsService,
    private mailService: MailService,
  ) {}

  async register(email: string, pass: string) {
    const existing = await this.usersService.findOneByEmail(email);
    if (existing) {
      throw new ConflictException('User already exists');
    }
    const passwordHash = await bcrypt.hash(pass, 10);
    const user = await this.usersService.create({ email, passwordHash });
    await this.teamsService.createPersonalTeam(user.id);
    return this.login(user);
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && user.passwordHash && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role, plan: user.plan };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, role: user.role, plan: user.plan },
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findOneByEmail(email);
    // Silently return if not found or OAuth-only (no password set)
    if (!user || !user.passwordHash) return;

    user.resetPwdToken = crypto.randomUUID();
    user.resetPwdExpires = new Date(Date.now() + 3_600_000); // 1 hour
    await this.usersService.save(user);
    await this.mailService.sendPasswordReset(email, user.resetPwdToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findByResetToken(token);
    if (!user) throw new BadRequestException('Invalid or expired reset token');
    if (!user.resetPwdExpires || user.resetPwdExpires < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPwdToken = null;
    user.resetPwdExpires = null;
    await this.usersService.save(user);
  }

  async oauthLogin(profile: { email: string; googleId?: string; githubId?: string }) {
    const { email, googleId, githubId } = profile;

    // 1. Find by provider ID (returning user)
    let user = googleId
      ? await this.usersService.findByGoogleId(googleId)
      : await this.usersService.findByGithubId(githubId!);

    // 2. Auto-link: find by email (existing email/password account)
    if (!user) {
      user = await this.usersService.findOneByEmail(email);
      if (user) {
        if (googleId) user.googleId = googleId;
        if (githubId) user.githubId = githubId;
        await this.usersService.save(user);
      }
    }

    // 3. Create new user
    if (!user) {
      user = await this.usersService.create({
        email,
        passwordHash: null,
        googleId: googleId ?? null,
        githubId: githubId ?? null,
      });
      await this.teamsService.createPersonalTeam(user.id);
    }

    return this.login(user);
  }
}
