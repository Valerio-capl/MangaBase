import { getDb } from './db/database';
import { SQL_MATCH as MATCH, resolveSource } from './mangaKey';

// Chapter ids in reading order, the most recently read one last
export const getReadChapters = async (mangaId, source, originalSource) => {
  if (!mangaId) return [];
  try {
    const db = await getDb();
    const sourceName = resolveSource({ source, originalSource });
    const rows = await db.getAllAsync(
      `SELECT chapter_id FROM read_chapters
       WHERE ${MATCH}
       GROUP BY chapter_id
       ORDER BY MAX(read_at) ASC`,
      [String(mangaId), sourceName, sourceName]
    );
    return rows.map((row) => row.chapter_id);
  } catch (error) {
    console.error("Error loading read chapters:", error);
    return [];
  }
};

export const saveChapterRead = async (mangaId, chapterId, source, originalSource) => {
  if (!mangaId || !chapterId) return;
  try {
    const db = await getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO read_chapters (source, manga_id, chapter_id, read_at) VALUES (?, ?, ?, ?)',
      [resolveSource({ source, originalSource }), String(mangaId), String(chapterId), Date.now()]
    );
  } catch (error) {
    console.error("Error saving chapter read:", error);
    throw error;
  }
};

// decides which chapter the "continue" button opens.
// chapters: newest first, the same order the reader uses for previous/next.
// readIds: chapter ids in the order they were read, the most recent one last.
export const getContinueTarget = (chapters, readIds = []) => {
  if (!chapters || chapters.length === 0) return null;
  const indexById = new Map(chapters.map((chapter, index) => [chapter.id, index]));
  for (let i = readIds.length - 1; i >= 0; i--) {
    const readIndex = indexById.get(readIds[i]);
    if (readIndex === undefined) continue;
    if (readIndex === 0) {
      return { state: 'upToDate', chapter: chapters[0] };
    }
    return { state: 'continue', chapter: chapters[readIndex - 1] };
  }

  // nothing read yet, or nothing matches the current list: start from the oldest chapter
  return { state: 'start', chapter: chapters[chapters.length - 1] };
};
