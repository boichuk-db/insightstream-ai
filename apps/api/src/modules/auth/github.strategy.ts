import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GITHUB_CLIENT_ID') || '',
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET') || '',
      callbackURL: `${config.get<string>('API_URL') || 'http://localhost:3001'}/auth/github/callback`,
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: any, user?: any) => void,
  ): Promise<void> {
    const email =
      profile.emails?.find((e: any) => e.primary)?.value ??
      profile.emails?.[0]?.value;

    if (!email) {
      done(new Error('No email returned from GitHub'), undefined);
      return;
    }
    done(null, { email, githubId: profile.id });
  }
}
