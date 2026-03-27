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
});
