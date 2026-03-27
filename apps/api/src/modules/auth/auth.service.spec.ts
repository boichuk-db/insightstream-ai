import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TeamsService } from '../teams/teams.service';
import { MailService } from '../mail/mail.service';

const mockUsersService = {
  findOneByEmail: jest.fn(),
  findByResetToken: jest.fn(),
  findByGoogleId: jest.fn(),
  findByGithubId: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};
const mockTeamsService = { createPersonalTeam: jest.fn() };
const mockJwtService = { sign: jest.fn().mockReturnValue('signed-token') };
const mockMailService = { sendPasswordReset: jest.fn() };

describe('AuthService — password reset', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: TeamsService, useValue: mockTeamsService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();
    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('forgotPassword', () => {
    it('sends reset email when user exists', async () => {
      const user = { id: '1', email: 'a@b.com', passwordHash: 'hash' } as any;
      mockUsersService.findOneByEmail.mockResolvedValue(user);
      mockUsersService.save.mockResolvedValue(user);

      await service.forgotPassword('a@b.com');

      expect(mockUsersService.save).toHaveBeenCalled();
      expect(mockMailService.sendPasswordReset).toHaveBeenCalledWith(
        'a@b.com',
        expect.any(String),
      );
    });

    it('returns silently when user not found (no leak)', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      await expect(service.forgotPassword('nope@x.com')).resolves.toBeUndefined();
      expect(mockMailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('returns silently for OAuth-only user (no passwordHash)', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({ id: '1', passwordHash: null });
      await expect(service.forgotPassword('oauth@x.com')).resolves.toBeUndefined();
      expect(mockMailService.sendPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('updates password and clears token when valid', async () => {
      const future = new Date(Date.now() + 3600_000);
      const user = { id: '1', resetPwdToken: 'tok', resetPwdExpires: future, passwordHash: 'old' } as any;
      mockUsersService.findByResetToken.mockResolvedValue(user);
      mockUsersService.save.mockResolvedValue(user);

      await service.resetPassword('tok', 'newPass123');

      const savedUser = mockUsersService.save.mock.calls[0][0];
      expect(savedUser.resetPwdToken).toBeNull();
      expect(savedUser.resetPwdExpires).toBeNull();
      expect(savedUser.passwordHash).not.toBe('old');
    });

    it('throws BadRequestException when token not found', async () => {
      mockUsersService.findByResetToken.mockResolvedValue(null);
      await expect(service.resetPassword('bad', 'pass')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when token expired', async () => {
      const past = new Date(Date.now() - 1000);
      mockUsersService.findByResetToken.mockResolvedValue({
        resetPwdToken: 'tok', resetPwdExpires: past,
      });
      await expect(service.resetPassword('tok', 'pass')).rejects.toThrow(BadRequestException);
    });
  });

  describe('oauthLogin', () => {
    it('returns JWT for existing user found by googleId', async () => {
      const user = { id: '1', email: 'a@b.com', googleId: 'g1', role: 'user', plan: 'FREE' } as any;
      mockUsersService.findByGoogleId.mockResolvedValue(user);

      const result = await service.oauthLogin({ email: 'a@b.com', googleId: 'g1' });

      expect(mockUsersService.findByGoogleId).toHaveBeenCalledWith('g1');
      expect(mockUsersService.findOneByEmail).not.toHaveBeenCalled();
      expect(mockUsersService.create).not.toHaveBeenCalled();
      expect(result.access_token).toBe('signed-token');
    });

    it('auto-links by email when provider ID not found', async () => {
      const existingUser = { id: '2', email: 'b@b.com', googleId: null, role: 'user', plan: 'FREE' } as any;
      mockUsersService.findByGoogleId.mockResolvedValue(null);
      mockUsersService.findOneByEmail.mockResolvedValue(existingUser);
      mockUsersService.save.mockResolvedValue({ ...existingUser, googleId: 'g2' });

      const result = await service.oauthLogin({ email: 'b@b.com', googleId: 'g2' });

      expect(mockUsersService.save).toHaveBeenCalledWith(expect.objectContaining({ googleId: 'g2' }));
      expect(mockTeamsService.createPersonalTeam).not.toHaveBeenCalled();
      expect(result.access_token).toBe('signed-token');
    });

    it('creates new user + personal team when no existing account', async () => {
      mockUsersService.findByGithubId.mockResolvedValue(null);
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      const newUser = { id: '3', email: 'c@c.com', githubId: 'gh3', role: 'user', plan: 'FREE' } as any;
      mockUsersService.create.mockResolvedValue(newUser);

      const result = await service.oauthLogin({ email: 'c@c.com', githubId: 'gh3' });

      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'c@c.com', passwordHash: null, githubId: 'gh3' }),
      );
      expect(mockTeamsService.createPersonalTeam).toHaveBeenCalledWith('3');
      expect(result.access_token).toBe('signed-token');
    });
  });
});
