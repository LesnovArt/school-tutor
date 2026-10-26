import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { runMigrations } from './index';

let db: Database.Database | undefined;
afterEach(() => { db?.close(); db = undefined; });

const versions = (d: Database.Database) =>
  (d.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as { version: number }[]).map((r) => r.version);

describe('runMigrations', () => {
  it('applies pending migrations in order and skips applied ones on rerun', () => {
    db = new Database(':memory:');
    const calls: number[] = [];
    const available = [
      { version: 2, up: (d: Database.Database) => { calls.push(2); d.exec('CREATE TABLE b (id INTEGER)'); } },
      { version: 1, up: (d: Database.Database) => { calls.push(1); d.exec('CREATE TABLE a (id INTEGER)'); } },
    ];
    runMigrations(db, available);
    runMigrations(db, available);
    expect(calls).toEqual([1, 2]);
    expect(versions(db)).toEqual([1, 2]);
  });

  it('upgrades a database already at an earlier version', () => {
    db = new Database(':memory:');
    runMigrations(db, [{ version: 1, up: (d) => d.exec('CREATE TABLE a (id INTEGER)') }]);
    runMigrations(db, [
      { version: 1, up: () => { throw new Error('must not rerun'); } },
      { version: 2, up: (d) => d.exec('CREATE TABLE b (id INTEGER)') },
    ]);
    expect(versions(db)).toEqual([1, 2]);
  });

  it('rolls back a failing migration and does not record it', () => {
    db = new Database(':memory:');
    const broken = { version: 1, up: (d: Database.Database) => { d.exec('CREATE TABLE a (id INTEGER)'); throw new Error('boom'); } };
    expect(() => runMigrations(db!, [broken])).toThrow('boom');
    expect(versions(db)).toEqual([]);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'a'").get()).toBeUndefined();
  });
});
