import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RedisService } from '../../redis/redis.service';

const USER_CACHE_TTL_SECONDS = 30;

interface CachedUser {
  id: string;
  email: string;
  role: string;
}

function parseCachedUser(cached: string, sub: string): CachedUser | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(cached);
  } catch {
    return null;
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    typeof (parsed as CachedUser).id === 'string' &&
    typeof (parsed as CachedUser).email === 'string' &&
    typeof (parsed as CachedUser).role === 'string' &&
    (parsed as CachedUser).id === sub
  ) {
    return parsed as CachedUser;
  }

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
    private redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'super_secret_key',
    });
  }

  async validate(payload: any) {
    const cacheKey = `user:${payload.sub}`;

    let cached: string | null = null;
    try {
      cached = await this.redisService.get(cacheKey);
    } catch {
      cached = null;
    }

    if (cached) {
      const cachedUser = parseCachedUser(cached, payload.sub);
      if (cachedUser) {
        return cachedUser;
      }
    }

    const user = await this.usersService.findOneById(payload.sub);
    if (!user) {
      throw new UnauthorizedException(
        'User no longer exists. Please re-authenticate.',
      );
    }

    const result = { id: user.id, email: user.email, role: user.role };
    void this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      USER_CACHE_TTL_SECONDS,
    );
    return result;
  }
}
