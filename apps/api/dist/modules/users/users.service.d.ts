import { Repository } from 'typeorm';
import { User } from '@insightstream/database';
export declare class UsersService {
    private usersRepository;
    constructor(usersRepository: Repository<User>);
    findOneByEmail(email: string): Promise<User | null>;
    findOneById(id: string): Promise<User | null>;
    create(userData: Partial<User>): Promise<User>;
}
