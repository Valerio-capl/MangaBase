import * as SQLite from 'expo-sqlite';

const DB_NAME = 'mangabase.db';
const SCHEMA_VERSION = 1;

// Every table is keyed by (source, manga_id); source is '' for legacy rows saved without one
const SCHEMA_V1 = `
  CREATE TABLE library (
    source TEXT NOT NULL,
    manga_id TEXT NOT NULL,
    slug TEXT,
    title TEXT,
    cover_url TEXT,
    last_read INTEGER,
    PRIMARY KEY (source, manga_id)
  );

  CREATE TABLE read_chapters (
    source TEXT NOT NULL,
    manga_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    read_at INTEGER NOT NULL,
    PRIMARY KEY (source, manga_id, chapter_id)
  );

  CREATE TABLE downloaded_manga (
    source TEXT NOT NULL,
    manga_id TEXT NOT NULL,
    title TEXT,
    cover_url TEXT,
    cover_file TEXT,
    PRIMARY KEY (source, manga_id)
  );

  CREATE TABLE downloaded_chapters (
    source TEXT NOT NULL,
    manga_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    number TEXT,
    title TEXT,
    folder TEXT,
    page_count INTEGER NOT NULL DEFAULT 0,
    downloaded_at TEXT,
    PRIMARY KEY (source, manga_id, chapter_id),
    FOREIGN KEY (source, manga_id) REFERENCES downloaded_manga (source, manga_id) ON DELETE CASCADE
  );
`;

const openAndPrepare = async () => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // Foreign keys are enabled per connection, so this runs on every open
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion < SCHEMA_VERSION) {
    await db.withTransactionAsync(async () => {
      if (currentVersion < 1) await db.execAsync(SCHEMA_V1);
      await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    });
  }
  return db;
};

// The connection is opened once; concurrent callers share the same promise
let dbPromise = null;

export const getDb = () => {
  if (!dbPromise) {
    dbPromise = openAndPrepare().catch((error) => {
      dbPromise = null; // allow a retry on the next call
      throw error;
    });
  }
  return dbPromise;
};