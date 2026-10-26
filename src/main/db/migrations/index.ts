import type Database from 'better-sqlite3';
import { up as profiles } from './001-profiles';

type Migration = { version: number; up: (db: Database.Database) => void };

// Append new migrations with the next version number; never edit or reorder applied ones.
export const migrations: readonly Migration[] = [
  { version: 1, up: profiles },
];

export function runMigrations(db: Database.Database, available: readonly Migration[] = migrations): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL)');
  const applied = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map((row) => row.version),
  );
  for (const migration of [...available].sort((a, b) => a.version - b.version)) {
    if (applied.has(migration.version)) continue;
    db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(migration.version, new Date().toISOString());
    })();
  }
}
