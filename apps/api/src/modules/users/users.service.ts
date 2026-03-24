import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@insightstream/database';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findOneById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findOneByApiKey(apiKey: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { apiKey } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create({
      ...userData,
      apiKey: crypto.randomUUID(),
    });
    return this.usersRepository.save(user);
  }

  async generateApiKey(id: string): Promise<User | null> {
    const user = await this.findOneById(id);
    if (!user) return null;
    user.apiKey = crypto.randomUUID();
    return this.usersRepository.save(user);
  }
}
