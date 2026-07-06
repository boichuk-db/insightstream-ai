import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RedisService } from '../../redis/redis.service';

const USER_CACHE_TTL_SECONDS = 30;

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
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
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
