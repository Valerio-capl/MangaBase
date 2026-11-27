import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCoverFileName } from '../downloads/paths';
import { devLog } from '../http/devLog.js';

const LIBRARY_KEY = 'myLibrary';
const PROGRESS_KEY = 'read_chapters';
const DOWNLOADS_KEY = 'downloaded_manga';

// Keep false while verifying the migration on real data; once verified, set to true,
// and before the release remove the constant and always remove the keys.
const REMOVE_LEGACY_KEYS = false;

const text = (value) => (value === undefined || value === null ? '' : String(value));

const hasId = (entry) => Boolean(entry) && text(entry.id) !== '';

// A corrupted or unexpected value aborts the whole migration: nothing is discarded unread
const parseStored = (raw, key, expectArray) => {
  if (raw === null) return expectArray ? [] : {};
  const value = JSON.parse(raw);
  if (value === null || typeof value !== 'object' || Array.isArray(value) !== expectArray) {
    throw new Error(`Unexpected format for ${key}`);
  }
  return value;
};

const buildLibraryRows = (library) => library.filter(hasId).map((entry) => ({
  source: text(entry.source),
  id: String(entry.id),
  slug: entry.slug ?? null,
  title: entry.title ?? null,
  coverUrl: entry.coverUrl ?? null,
  lastRead: typeof entry.lastRead === 'number' ? entry.lastRead : null,
}));

// Real source of a downloaded manga; 'local' was only a marker
const getRealSource = (entry) => {
  const original = text(entry.originalSource);
  if (original) return original;
  const source = text(entry.source);
  return source === 'local' ? '' : source;
};

const isRemoteUrl = (url) => typeof url === 'string' && /^https?:\/\//i.test(url);

// Chapters without pages are unusable and are dropped; so are manga left without chapters
const buildDownloadRows = (downloads) => {
  const mangaRows = [];
  const chapterRows = [];

  for (const entry of downloads) {
    if (!hasId(entry)) continue;

    const chapters = (Array.isArray(entry.chapters) ? entry.chapters : []).filter(
      (chapter) => hasId(chapter) && Array.isArray(chapter.pages) && chapter.pages.length > 0
    );
    if (chapters.length === 0) continue;

    const source = getRealSource(entry);
    const id = String(entry.id);

    mangaRows.push({
      source,
      id,
      title: entry.title ?? null,
      // A file:// URI is stale after app updates: only a remote URL is worth keeping
      coverUrl: isRemoteUrl(entry.coverUrl) ? entry.coverUrl : null,
      coverFile: getCoverFileName(entry),
    });

    for (const chapter of chapters) {
      chapterRows.push({
        source,
        mangaId: id,
        id: String(chapter.id),
        number: String(chapter.number ?? '0'),
        title: chapter.title ?? null,
        folder: chapter.folder ?? null,
        pageCount: chapter.pages.length,
        date: chapter.date ?? null,
      });
    }
  }
  return { mangaRows, chapterRows };
};

// Sources each manga id is known under, taken from the library and the downloads
const buildSourceMap = (rows) => {
  const map = new Map();
  for (const row of rows) {
    if (!row.source) continue;
    if (!map.has(row.id)) map.set(row.id, new Set());
    map.get(row.id).add(row.source);
  }
  return map;
};

const buildProgressRows = (progress, sourceMap, now) => {
  const rows = [];
  for (const [mangaId, rawIds] of Object.entries(progress)) {
    if (!Array.isArray(rawIds)) continue;
    const chapterIds = rawIds.filter((chapterId) => text(chapterId) !== '');

    // One known source: use it. None or several: '' keeps the old "any source" behaviour
    const sources = sourceMap.get(mangaId);
    const source = sources && sources.size === 1 ? [...sources][0] : '';

    chapterIds.forEach((chapterId, index) => {
      rows.push({
        source,
        mangaId,
        chapterId: String(chapterId),
        // Synthetic timestamps keep the original reading order, the last chapter being the latest
        readAt: now - (chapterIds.length - index),
      });
    });
  }
  return rows;
};

// Imports the old AsyncStorage data into SQLite. Idempotent: every insert is OR IGNORE.
export const migrateLegacyData = async (db) => {
  const entries = await AsyncStorage.multiGet([LIBRARY_KEY, PROGRESS_KEY, DOWNLOADS_KEY]);
  const stored = Object.fromEntries(entries);
  const existingKeys = entries.filter(([, value]) => value !== null).map(([key]) => key);
  if (existingKeys.length === 0) return;

  const library = parseStored(stored[LIBRARY_KEY], LIBRARY_KEY, true);
  const progress = parseStored(stored[PROGRESS_KEY], PROGRESS_KEY, false);
  const downloads = parseStored(stored[DOWNLOADS_KEY], DOWNLOADS_KEY, true);

  const libraryRows = buildLibraryRows(library);
  const { mangaRows, chapterRows } = buildDownloadRows(downloads);
  const sourceMap = buildSourceMap([...libraryRows, ...mangaRows]);
  const progressRows = buildProgressRows(progress, sourceMap, Date.now());

  const inserted = { library: 0, manga: 0, chapters: 0, progress: 0 };
  const run = async (sql, params) => (await db.runAsync(sql, params)).changes;

  await db.withTransactionAsync(async () => {
    for (const row of libraryRows) {
      inserted.library += await run(
        'INSERT OR IGNORE INTO library (source, manga_id, slug, title, cover_url, last_read) VALUES (?, ?, ?, ?, ?, ?)',
        [row.source, row.id, row.slug, row.title, row.coverUrl, row.lastRead]
      );
    }

    // Manga first: chapters reference them through a foreign key
    for (const row of mangaRows) {
      inserted.manga += await run(
        'INSERT OR IGNORE INTO downloaded_manga (source, manga_id, title, cover_url, cover_file) VALUES (?, ?, ?, ?, ?)',
        [row.source, row.id, row.title, row.coverUrl, row.coverFile]
      );
    }
    for (const row of chapterRows) {
      inserted.chapters += await run(
        `INSERT OR IGNORE INTO downloaded_chapters
           (source, manga_id, chapter_id, number, title, folder, page_count, downloaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.source, row.mangaId, row.id, row.number, row.title, row.folder, row.pageCount, row.date]
      );
    }

    for (const row of progressRows) {
      inserted.progress += await run(
        'INSERT OR IGNORE INTO read_chapters (source, manga_id, chapter_id, read_at) VALUES (?, ?, ?, ?)',
        [row.source, row.mangaId, row.chapterId, row.readAt]
      );
    }
  });

  devLog('[migration] library:', libraryRows.length, 'valid of', library.length, '->', inserted.library, 'inserted');
  devLog('[migration] downloads:', mangaRows.length, 'valid of', downloads.length, '->', inserted.manga, 'manga,', inserted.chapters, 'of', chapterRows.length, 'chapters inserted');
  devLog('[migration] progress:', progressRows.length, 'rows ->', inserted.progress, 'inserted');

  // Only reached if the transaction committed
  await AsyncStorage.multiRemove(existingKeys);
};