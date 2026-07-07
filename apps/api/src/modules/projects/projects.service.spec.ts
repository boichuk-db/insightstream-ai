import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Project, Team, TeamMember, TeamRole } from '@insightstream/database';
import { ProjectsService } from './projects.service';
import { PlanLimitsService } from '../plans/plan-limits.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectRepo: any;
  let memberRepo: any;
  let teamRepo: any;

  beforeEach(async () => {
    projectRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
      remove: jest.fn(),
    };
    memberRepo = { findOne: jest.fn() };
    teamRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(TeamMember), useValue: memberRepo },
        { provide: getRepositoryToken(Team), useValue: teamRepo },
        {
          provide: PlanLimitsService,
          useValue: {
            canCreateProject: jest.fn(),
            getTeamPlan: jest.fn(),
            assertAllowed: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  describe('update', () => {
    const project = {
      id: 'p1',
      name: 'Old Name',
      domain: 'old.com',
      teamId: 'team-1',
    };

    it('updates only the name when only name is provided', async () => {
      projectRepo.findOne.mockResolvedValue({ ...project });
      memberRepo.findOne.mockResolvedValue({ id: 'm1', role: TeamRole.ADMIN });

      const result = await service.update('p1', 'user-1', { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(result.domain).toBe('old.com');
      expect(projectRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Name', domain: 'old.com' }),
      );
    });

    it('updates only the domain when only domain is provided', async () => {
      projectRepo.findOne.mockResolvedValue({ ...project });
      memberRepo.findOne.mockResolvedValue({ id: 'm1', role: TeamRole.ADMIN });

      const result = await service.update('p1', 'user-1', {
        domain: 'new.com',
      });

      expect(result.name).toBe('Old Name');
      expect(result.domain).toBe('new.com');
    });

    it('updates both name and domain when both are provided', async () => {
      projectRepo.findOne.mockResolvedValue({ ...project });
      memberRepo.findOne.mockResolvedValue({ id: 'm1', role: TeamRole.ADMIN });

      const result = await service.update('p1', 'user-1', {
        name: 'New Name',
        domain: 'new.com',
      });

      expect(result.name).toBe('New Name');
      expect(result.domain).toBe('new.com');
    });

    it('throws NotFoundException when the caller is not a member of the project team', async () => {
      projectRepo.findOne.mockResolvedValue({ ...project });
      memberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('p1', 'stranger', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the caller is a member below ADMIN', async () => {
      projectRepo.findOne.mockResolvedValue({ ...project });
      memberRepo.findOne
        .mockResolvedValueOnce({ id: 'm1', role: TeamRole.MEMBER }) // findOne()'s membership check
        .mockResolvedValueOnce({ id: 'm1', role: TeamRole.MEMBER }); // update()'s role check

      await expect(
        service.update('p1', 'member-1', { name: 'New Name' }),
      ).rejects.toThrow(ForbiddenException);
      expect(projectRepo.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when neither name nor domain is provided', async () => {
      projectRepo.findOne.mockResolvedValue({ ...project });
      memberRepo.findOne.mockResolvedValue({ id: 'm1', role: TeamRole.ADMIN });

      await expect(service.update('p1', 'user-1', {})).rejects.toThrow(
        BadRequestException,
      );
      expect(projectRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the project does not exist', async () => {
      projectRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('missing', 'user-1', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
