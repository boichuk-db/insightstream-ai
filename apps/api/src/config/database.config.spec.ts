import { getTypeOrmConfig } from './database.config';

describe('getTypeOrmConfig', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('defaults migrationsRun to true when no override is passed', () => {
    const config = getTypeOrmConfig() as Record<string, unknown>;
    expect(config.migrationsRun).toBe(true);
  });

  it('respects an explicit migrationsRun: false override', () => {
    const config = getTypeOrmConfig({ migrationsRun: false }) as Record<
      string,
      unknown
    >;
    expect(config.migrationsRun).toBe(false);
  });

  it('reads DB connection settings from env vars', () => {
    process.env.DB_HOST = 'db.example.com';
    process.env.DB_PORT = '6543';
    process.env.DB_USERNAME = 'test_user';
    process.env.DB_PASSWORD = 'test_pass';
    process.env.DB_DATABASE = 'test_db';

    const config = getTypeOrmConfig() as Record<string, unknown>;

    expect(config).toMatchObject({
      type: 'postgres',
      host: 'db.example.com',
      port: 6543,
      username: 'test_user',
      password: 'test_pass',
      database: 'test_db',
    });
  });

  it('enables ssl only when DB_SSL=true', () => {
    process.env.DB_SSL = 'true';
    expect((getTypeOrmConfig() as Record<string, unknown>).ssl).toEqual({
      rejectUnauthorized: false,
    });

    process.env.DB_SSL = 'false';
    expect((getTypeOrmConfig() as Record<string, unknown>).ssl).toBe(false);
  });

  it('registers all 11 entities', () => {
    const config = getTypeOrmConfig() as { entities: unknown[] };
    expect(config.entities).toHaveLength(11);
  });
});
