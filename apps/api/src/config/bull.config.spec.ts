import { getBullConfig } from './bull.config';

describe('getBullConfig', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('defaults to localhost Redis when REDIS_URL is unset', () => {
    delete process.env.REDIS_URL;
    expect(getBullConfig()).toEqual({
      connection: { url: 'redis://localhost:6379' },
    });
  });

  it('reads REDIS_URL from env when set', () => {
    process.env.REDIS_URL = 'redis://redis:6379';
    expect(getBullConfig()).toEqual({
      connection: { url: 'redis://redis:6379' },
    });
  });
});
