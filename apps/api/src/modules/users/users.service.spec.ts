import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '@insightstream/database';
import { UsersService } from './users.service';

const mockRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

describe('UsersService — new auth methods', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();
    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  it('findByResetToken returns user when token matches', async () => {
    const user = { id: '1', resetPwdToken: 'abc' } as unknown as User;
    mockRepo.findOne.mockResolvedValue(user);
    const result = await service.findByResetToken('abc');
    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { resetPwdToken: 'abc' },
    });
    expect(result).toBe(user);
  });

  it('findByResetToken returns null when no match', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    expect(await service.findByResetToken('nope')).toBeNull();
  });

  it('findByGoogleId queries by googleId', async () => {
    const user = { id: '1', googleId: 'g123' } as unknown as User;
    mockRepo.findOne.mockResolvedValue(user);
    const result = await service.findByGoogleId('g123');
    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { googleId: 'g123' },
    });
    expect(result).toBe(user);
  });

  it('findByGithubId queries by githubId', async () => {
    const user = { id: '1', githubId: 'gh456' } as unknown as User;
    mockRepo.findOne.mockResolvedValue(user);
    await service.findByGithubId('gh456');
    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { githubId: 'gh456' },
    });
  });

  it('save calls repository.save', async () => {
    const user = { id: '1' } as unknown as User;
    mockRepo.save.mockResolvedValue(user);
    await service.save(user);
    expect(mockRepo.save).toHaveBeenCalledWith(user);
  });
});
