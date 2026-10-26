import type Database from 'better-sqlite3';

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE enrollments (
      id TEXT PRIMARY KEY NOT NULL,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      school_system TEXT NOT NULL CHECK(school_system IN ('ua', 'bg')),
      academic_year TEXT NOT NULL CHECK(academic_year GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]'),
      grade INTEGER NOT NULL CHECK(grade BETWEEN 1 AND 12),
      homework_language TEXT NOT NULL CHECK(homework_language IN ('uk', 'bg', 'en')),
      created_at TEXT NOT NULL,
      UNIQUE(profile_id, school_system, academic_year)
    );
    CREATE TABLE lessons (
      id TEXT PRIMARY KEY NOT NULL,
      enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      subject TEXT NOT NULL DEFAULT 'maths' CHECK(subject = 'maths'),
      position INTEGER NOT NULL CHECK(position >= 1),
      title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
      school_language TEXT NOT NULL CHECK(school_language IN ('uk', 'bg', 'en')),
      topic_notes TEXT NOT NULL DEFAULT '' CHECK(length(topic_notes) <= 1000),
      prerequisite_notes TEXT NOT NULL DEFAULT '' CHECK(length(prerequisite_notes) <= 500),
      is_current INTEGER NOT NULL DEFAULT 0 CHECK(is_current IN (0, 1)),
      related_lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX lessons_by_enrollment ON lessons(enrollment_id, position);
    CREATE UNIQUE INDEX lessons_one_current_per_enrollment ON lessons(enrollment_id) WHERE is_current = 1;
    ALTER TABLE profiles ADD COLUMN selected_enrollment_id TEXT REFERENCES enrollments(id) ON DELETE SET NULL;
  `);
}
