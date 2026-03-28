import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body.email, body.password);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.authService.login(user);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    await this.authService.forgotPassword(body.email);
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    await this.authService.resetPassword(body.token, body.newPassword);
    return { message: 'Password updated successfully.' };
  }

  // ── Google OAuth ──────────────────────────────────────────
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport redirects to Google — no body needed
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: any) {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    // NOTE: When the strategy calls done(null, false), Passport's default AuthGuard
    // throws a 401 UnauthorizedException before this handler runs, so the !req.user
    // branch below is a belt-and-suspenders guard for custom guard scenarios only.
    if (!req.user) {
      return res.redirect(`${frontendUrl}/?error=no_email`);
    }
    const { access_token } = await this.authService.oauthLogin(req.user);
    res.redirect(`${frontendUrl}/auth/oauth/callback?token=${access_token}`);
  }

  // ── GitHub OAuth ──────────────────────────────────────────
  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubAuth() {
    // Passport redirects to GitHub — no body needed
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: any, @Res() res: any) {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    // NOTE: When the strategy calls done(null, false), Passport's default AuthGuard
    // throws a 401 UnauthorizedException before this handler runs, so the !req.user
    // branch below is a belt-and-suspenders guard for custom guard scenarios only.
    if (!req.user) {
      return res.redirect(`${frontendUrl}/?error=no_email`);
    }
    const { access_token } = await this.authService.oauthLogin(req.user);
    res.redirect(`${frontendUrl}/auth/oauth/callback?token=${access_token}`);
  }
}
