import { getMetadataArgsStorage } from 'typeorm';
import * as database from '@insightstream/database';
import { AppDataSource } from './data-source';

describe('data-source entities', () => {
  it('registers every @Entity exported by @insightstream/database', () => {
    // Importing '@insightstream/database' above registers all its @Entity()
    // classes into TypeORM's global metadata storage as a side effect.
    // This is the same introspection the `migration:generate` CLI uses to
    // diff entities against the database, so it's the authoritative list of
    // "tables the app knows about" — independent of any manually maintained
    // entities array (which is exactly what drifted before: a new entity
    // was added to @insightstream/database and to app.module.ts, but never
    // added here, so `migration:generate` never saw it and no migration was
    // ever created for it).
    const allRegisteredEntityNames = getMetadataArgsStorage()
      .tables.map((t) => (t.target as { name: string }).name)
      .sort();

    const dataSourceEntityNames = (AppDataSource.options.entities as any[])
      .map((e) => e.name)
      .sort();

    expect(dataSourceEntityNames).toEqual(allRegisteredEntityNames);
  });

  it('exports the database package UserProjectLastSeen entity specifically', () => {
    // Named regression check for the entity that was actually missing.
    expect(database.UserProjectLastSeen).toBeDefined();
    expect(
      (AppDataSource.options.entities as any[]).includes(
        database.UserProjectLastSeen,
      ),
    ).toBe(true);
  });
});
