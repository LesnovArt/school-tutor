import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';
import { err, ok, type Result } from 'neverthrow';
import { randomUUID } from 'node:crypto';
import type { ApiError } from '../../contracts/api';
import {
  createProfileInputSchema, updateExplanationLanguageInputSchema,
  type CreateProfileInput, type Profile, profileSchema, uiLanguageSchema,
} from '../../contracts/profile';
import { z } from 'zod';
import { runMigrations } from './migrations';

let database: Database.Database | undefined;

export function openDatabase(): Result<Database.Database, ApiError> {
  try {
    const dbPath = path.join(app.getPath('userData'), 'school-tutor.sqlite3');
    database = new Database(dbPath);
    database.pragma('journal_mode = WAL');
    database.pragma('foreign_keys = ON');
    runMigrations(database);
    return ok(database);
  } catch {
    return err({ code: 'PersistenceFailure', message: 'Could not open the local study database.' });
  }
}

export function closeDatabase(): void {
  database?.close();
  database = undefined;
}

function requireDatabase(): Database.Database {
  if (!database) throw new Error('Database is not initialized');
  return database;
}

export function getDatabase(): Database.Database {
  return requireDatabase();
}

export function listProfiles(): Result<Profile[], ApiError> {
  try {
    const rows = requireDatabase().prepare(`SELECT id, display_name AS displayName, age_band AS ageBand,
      preferred_language AS preferredLanguage, learning_preferences AS learningPreferences, created_at AS createdAt
      FROM profiles ORDER BY created_at`).all();
    return ok(rows.map((row) => profileSchema.parse(row)));
  } catch {
    return err({ code: 'PersistenceFailure', message: 'Could not load profiles.' });
  }
}

export function createProfile(input: unknown): Result<Profile, ApiError> {
  const parsed = createProfileInputSchema.safeParse(input);
  if (!parsed.success) return err({ code: 'InvalidInput', message: 'Check the profile details and try again.' });
  try {
    const count = (requireDatabase().prepare('SELECT COUNT(*) AS count FROM profiles').get() as { count: number }).count;
    if (count >= 2) return err({ code: 'InvalidInput', message: 'This installation supports two child profiles.' });
    return ok(insertProfile(parsed.data));
  } catch {
    return err({ code: 'PersistenceFailure', message: 'Could not save this profile.' });
  }
}

export function setExplanationLanguage(input: unknown): Result<Profile, ApiError> {
  const parsed = updateExplanationLanguageInputSchema.safeParse(input);
  if (!parsed.success) return err({ code: 'InvalidInput', message: 'Choose a profile and a supported language.' });
  try {
    const updated = requireDatabase().prepare('UPDATE profiles SET preferred_language = ? WHERE id = ?')
      .run(parsed.data.preferredLanguage, parsed.data.profileId);
    if (updated.changes === 0) return err({ code: 'InvalidInput', message: 'Choose an existing profile.' });
    return listProfiles().andThen((profiles): Result<Profile, ApiError> => {
      const profile = profiles.find((candidate) => candidate.id === parsed.data.profileId);
      return profile ? ok(profile) : err({ code: 'PersistenceFailure', message: 'Could not load profiles.' });
    });
  } catch {
    return err({ code: 'PersistenceFailure', message: 'Could not save this profile.' });
  }
}

function insertProfile(input: CreateProfileInput): Profile {
  const row: Profile = {
    id: randomUUID(),
    displayName: input.displayName,
    ageBand: input.ageBand,
    preferredLanguage: input.preferredLanguage,
    learningPreferences: input.learningPreferences,
    createdAt: new Date().toISOString(),
  };
  requireDatabase().prepare(`INSERT INTO profiles
    (id, display_name, age_band, preferred_language, learning_preferences, created_at)
    VALUES (@id, @displayName, @ageBand, @preferredLanguage, @learningPreferences, @createdAt)`).run(row);
  return row;
}

export function getUiLanguage(): Result<'uk' | 'bg' | 'en', ApiError> {
  try {
    const row = requireDatabase().prepare("SELECT value FROM app_settings WHERE key = 'ui_language'").get() as { value: string } | undefined;
    const parsed = uiLanguageSchema.safeParse(row?.value);
    return parsed.success ? ok(parsed.data) : ok('uk');
  } catch {
    return err({ code: 'PersistenceFailure', message: 'Could not load app settings.' });
  }
}

export function setUiLanguage(value: unknown): Result<'uk' | 'bg' | 'en', ApiError> {
  const parsed = uiLanguageSchema.safeParse(value);
  if (!parsed.success) return err({ code: 'InvalidInput', message: 'Choose a supported language.' });
  try {
    requireDatabase().prepare("INSERT INTO app_settings (key, value) VALUES ('ui_language', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(parsed.data);
    return ok(parsed.data);
  } catch {
    return err({ code: 'PersistenceFailure', message: 'Could not save app settings.' });
  }
}

export function getActiveProfileId(): Result<string | null, ApiError> {
  try {
    const row = requireDatabase().prepare("SELECT value FROM app_settings WHERE key = 'active_profile_id'").get() as { value: string } | undefined;
    if (!row?.value) return ok(null);
    const validId = z.string().uuid().safeParse(row.value);
    if (!validId.success) return ok(null);
    const exists = requireDatabase().prepare('SELECT 1 FROM profiles WHERE id = ?').get(validId.data);
    return ok(exists ? validId.data : null);
  } catch {
    return err({ code: 'PersistenceFailure', message: 'Could not load the selected profile.' });
  }
}

export function setActiveProfileId(value: unknown): Result<string, ApiError> {
  const parsed = z.string().uuid().safeParse(value);
  if (!parsed.success) return err({ code: 'InvalidInput', message: 'Choose a valid profile.' });
  try {
    const exists = requireDatabase().prepare('SELECT 1 FROM profiles WHERE id = ?').get(parsed.data);
    if (!exists) return err({ code: 'InvalidInput', message: 'Choose an existing profile.' });
    requireDatabase().prepare("INSERT INTO app_settings (key, value) VALUES ('active_profile_id', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(parsed.data);
    return ok(parsed.data);
  } catch {
    return err({ code: 'PersistenceFailure', message: 'Could not save the selected profile.' });
  }
}
