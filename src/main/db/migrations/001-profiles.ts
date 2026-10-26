import type Database from 'better-sqlite3';

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE profiles (
      id TEXT PRIMARY KEY NOT NULL,
      display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 40),
      age_band TEXT NOT NULL CHECK(age_band IN ('6-8', '9-11', '12-14', '15+')),
      preferred_language TEXT NOT NULL CHECK(preferred_language IN ('uk', 'bg', 'en')),
      learning_preferences TEXT NOT NULL DEFAULT '' CHECK(length(learning_preferences) <= 240),
      created_at TEXT NOT NULL
    );
    CREATE TABLE app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    INSERT INTO app_settings (key, value) VALUES ('ui_language', 'uk');
    INSERT INTO app_settings (key, value) VALUES ('active_profile_id', '');
  `);
}
