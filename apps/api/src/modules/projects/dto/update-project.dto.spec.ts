import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProjectDto } from './update-project.dto';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(UpdateProjectDto, payload);
  return validate(dto);
}

describe('UpdateProjectDto', () => {
  it('accepts a name-only update', async () => {
    const errors = await validateDto({ name: 'Renamed Project' });
    expect(errors).toHaveLength(0);
  });

  it('accepts a domain-only update with a plain hostname', async () => {
    const errors = await validateDto({ domain: 'my-app.com' });
    expect(errors).toHaveLength(0);
  });

  it('accepts a single-label hostname like localhost', async () => {
    const errors = await validateDto({ domain: 'localhost' });
    expect(errors).toHaveLength(0);
  });

  it('accepts both fields together', async () => {
    const errors = await validateDto({ name: 'X', domain: 'x.com' });
    expect(errors).toHaveLength(0);
  });

  it('accepts an empty payload (service enforces "at least one field")', async () => {
    const errors = await validateDto({});
    expect(errors).toHaveLength(0);
  });

  it('rejects an empty-string name', async () => {
    const errors = await validateDto({ name: '' });
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('rejects an empty-string domain', async () => {
    const errors = await validateDto({ domain: '' });
    expect(errors.some((e) => e.property === 'domain')).toBe(true);
  });

  it('rejects a domain with a protocol', async () => {
    const errors = await validateDto({ domain: 'https://my-app.com' });
    expect(errors.some((e) => e.property === 'domain')).toBe(true);
  });

  it('rejects a domain with a path', async () => {
    const errors = await validateDto({ domain: 'my-app.com/path' });
    expect(errors.some((e) => e.property === 'domain')).toBe(true);
  });

  it('rejects a name over 100 characters', async () => {
    const errors = await validateDto({ name: 'a'.repeat(101) });
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });
});
