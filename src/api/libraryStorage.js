import { getDb } from './db/database';
import { resolveSource } from './mangaKey';

const toSource = (source) => (source === undefined || source === null ? '' : String(source));

// Same rule as isSameManga: a row or a query without source matches by id alone
const MATCH = "manga_id = ? AND (source = ? OR source = '' OR ? = '')";
const matchParams = (mangaId, source) => [String(mangaId), source, source];

// Retrieves all saved manga from the library, ordered by the last read date.
export const getSavedLibrary = async () => {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync(
      `SELECT manga_id, source, slug, title, cover_url, last_read
       FROM library
       ORDER BY COALESCE(last_read, 0) DESC, rowid ASC`
    );
    return rows.map((row) => ({
      id: row.manga_id,
      slug: row.slug,
      title: row.title,
      coverUrl: row.cover_url,
      source: row.source,
      lastRead: row.last_read,
    }));
  } catch (error) {
    console.error("Library loading error:", error);
    return [];
  }
};

// Checks whether a manga is already in the library.
export const isMangaSaved = async (mangaId, source) => {
  if (!mangaId) return false;
  try {
    const db = await getDb();
    const row = await db.getFirstAsync(
      `SELECT 1 AS found FROM library WHERE ${MATCH}`,
      matchParams(mangaId, toSource(source))
    );
    return row !== null;
  } catch (error) {
    console.error("Error checking saved manga status:", error);
    return false;
  }
};

// Adds a manga to the library or removes it if it is already saved.
export const toggleSaveManga = async (mangaData, source) => {
  try {
    const db = await getDb();
    const sourceName = toSource(source);
    let saved = false;

    await db.withTransactionAsync(async () => {
      const removed = await db.runAsync(
        `DELETE FROM library WHERE ${MATCH}`,
        matchParams(mangaData.id, sourceName)
      );
      if (removed.changes > 0) return;

      await db.runAsync(
        'INSERT OR REPLACE INTO library (source, manga_id, slug, title, cover_url) VALUES (?, ?, ?, ?, ?)',
        [sourceName, String(mangaData.id), mangaData.slug, mangaData.title, mangaData.coverUrl]
      );
      saved = true;
    });

    return saved;
  } catch (error) {
    console.error("Saving Error:", error);
    throw error;
  }
};

// Updates the last-read timestamp of a manga in the library.
export const updateLastRead = async (mangaId, source, originalSource, timestamp = Date.now()) => {
  try {
    const db = await getDb();
    const sourceName = resolveSource({ source, originalSource });
    await db.runAsync(
      `UPDATE library SET last_read = ? WHERE ${MATCH}`,
      [timestamp, ...matchParams(mangaId, sourceName)]
    );
  } catch (error) {
    console.error("Error updating lastRead:", error);
  }
};