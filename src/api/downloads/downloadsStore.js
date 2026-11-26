import { getDb } from '../db/database';
import { matchParams, SQL_MATCH } from '../mangaKey';
import { DOWNLOAD_FOLDER } from './paths';

const toChapter = (row) => ({
  id: row.chapter_id,
  number: row.number,
  title: row.title,
  folder: row.folder,
  pageCount: row.page_count,
  date: row.downloaded_at,
});

const CHAPTER_COLUMNS = 'chapter_id, number, title, folder, page_count, downloaded_at';

// A legacy row without source matches any source
export const findDownloadedManga = async (mangaId, source) => {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT source, manga_id, title, cover_url, cover_file FROM downloaded_manga WHERE ${SQL_MATCH}`,
    matchParams(mangaId, source)
  );
  if (!row) return null;
  return {
    source: row.source,
    id: row.manga_id,
    title: row.title,
    coverUrl: row.cover_url,
    coverFile: row.cover_file,
  };
};

export const insertManga = async (manga) => {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO downloaded_manga (source, manga_id, title, cover_url, cover_file) VALUES (?, ?, ?, ?, ?)',
    [manga.source, String(manga.id), manga.title, manga.coverUrl, manga.coverFile]
  );
  return manga;
};

export const getChapters = async (source, mangaId) => {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT ${CHAPTER_COLUMNS} FROM downloaded_chapters WHERE source = ? AND manga_id = ?`,
    [source, String(mangaId)]
  );
  return rows.map(toChapter);
};

export const getChapter = async (source, mangaId, chapterId) => {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT ${CHAPTER_COLUMNS} FROM downloaded_chapters WHERE source = ? AND manga_id = ? AND chapter_id = ?`,
    [source, String(mangaId), String(chapterId)]
  );
  return row ? toChapter(row) : null;
};

// Inserts the chapter or replaces a previous copy of it
export const saveChapter = async (source, mangaId, chapter) => {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO downloaded_chapters
       (source, manga_id, chapter_id, number, title, folder, page_count, downloaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [source, String(mangaId), String(chapter.id), chapter.number, chapter.title, chapter.folder, chapter.pageCount, chapter.date]
  );
};

export const deleteChapterRows = async (source, mangaId, chapterIds) => {
  if (chapterIds.length === 0) return;
  const db = await getDb();
  const placeholders = chapterIds.map(() => '?').join(', ');
  await db.runAsync(
    `DELETE FROM downloaded_chapters WHERE source = ? AND manga_id = ? AND chapter_id IN (${placeholders})`,
    [source, String(mangaId), ...chapterIds.map(String)]
  );
};

export const countChapters = async (source, mangaId) => {
  const db = await getDb();
  const row = await db.getFirstAsync(
    'SELECT COUNT(*) AS total FROM downloaded_chapters WHERE source = ? AND manga_id = ?',
    [source, String(mangaId)]
  );
  return row?.total ?? 0;
};

export const deleteManga = async (source, mangaId) => {
  const db = await getDb();
  // Chapter rows go away with it (ON DELETE CASCADE)
  await db.runAsync('DELETE FROM downloaded_manga WHERE source = ? AND manga_id = ?', [source, String(mangaId)]);
};

// Chapters of every other manga, used to avoid deleting a folder that is still in use
export const getOtherChapterLocations = async (source, mangaId) => {
  const db = await getDb();
  return db.getAllAsync(
    'SELECT manga_id, chapter_id, folder FROM downloaded_chapters WHERE NOT (source = ? AND manga_id = ?)',
    [source, String(mangaId)]
  );
};

// Shape expected by the Offline screen: source is the 'local' marker, originalSource the real one
export const getDownloadedManga = async () => {
  const db = await getDb();
  const mangaRows = await db.getAllAsync(
    'SELECT source, manga_id, title, cover_url, cover_file FROM downloaded_manga ORDER BY rowid'
  );
  const chapterRows = await db.getAllAsync(
    `SELECT source, manga_id, ${CHAPTER_COLUMNS} FROM downloaded_chapters`
  );

  return mangaRows.map((m) => ({
    id: m.manga_id,
    title: m.title,
    // Cover URIs are absolute and go stale: rebuild them from the current directory
    coverUrl: m.cover_file ? DOWNLOAD_FOLDER + m.cover_file : m.cover_url,
    source: 'local',
    originalSource: m.source,
    chapters: chapterRows
      .filter((c) => c.source === m.source && c.manga_id === m.manga_id)
      .map(toChapter),
  }));
};