import { ValidationPipe } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateTeamDto } from './update-team.dto';

describe('UpdateTeamDto', () => {
  const build = (overrides: Record<string, unknown> = {}) =>
    plainToInstance(UpdateTeamDto, {
      name: 'New Team Name',
      ...overrides,
    });

  it('accepts a valid payload', async () => {
    expect(await validate(build())).toHaveLength(0);
  });

  it('rejects empty name', async () => {
    const errors = await validate(build({ name: '' }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects name over 100 chars', async () => {
    const errors = await validate(build({ name: 'x'.repeat(101) }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects non-string name', async () => {
    const errors = await validate(build({ name: 123 }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('survives the global whitelist ValidationPipe instead of being stripped', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });
    const result = await pipe.transform(
      { name: 'New Team Name' },
      { type: 'body', metatype: UpdateTeamDto, data: '' },
    );
    expect(result).toBeInstanceOf(UpdateTeamDto);
    expect(result.name).toBe('New Team Name');
  });
});
