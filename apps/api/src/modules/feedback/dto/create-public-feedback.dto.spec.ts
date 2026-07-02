import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePublicFeedbackDto } from './create-public-feedback.dto';

describe('CreatePublicFeedbackDto', () => {
  const build = (overrides: Record<string, unknown> = {}) =>
    plainToInstance(CreatePublicFeedbackDto, {
      apiKey: 'key-123',
      content: 'Great product!',
      ...overrides,
    });

  it('accepts a valid payload', async () => {
    expect(await validate(build())).toHaveLength(0);
  });

  it('rejects missing apiKey', async () => {
    const errors = await validate(build({ apiKey: undefined }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects empty content', async () => {
    const errors = await validate(build({ content: '' }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects content over 5000 chars', async () => {
    const errors = await validate(build({ content: 'x'.repeat(5001) }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects non-string source', async () => {
    const errors = await validate(build({ source: 123 }));
    expect(errors.length).toBeGreaterThan(0);
  });
});
