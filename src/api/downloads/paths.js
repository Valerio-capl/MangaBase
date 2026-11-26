import * as FileSystem from 'expo-file-system/legacy';
import { getMangaKey } from '../mangaKey';

export const DOWNLOAD_FOLDER = FileSystem.documentDirectory + 'manga_downloads/';

// Builds a filesystem-safe folder name from any id.
export const toSafeName = (value) => {
  const text = String(value);
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  const readable = text.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return `${readable || 'chapter'}_${(hash >>> 0).toString(36)}`;
};

export const getPageFileName = (pageNumber) => `page_${String(pageNumber - 1).padStart(3, '0')}.jpg`;

export const getMangaFolderName = (mangaId, source) => toSafeName(getMangaKey({ id: mangaId, source }));

// New entries store the cover file name; legacy entries only have an absolute file:// URI
export const getCoverFileName = (entry) => {
  if (entry.coverFile) return entry.coverFile;
  if (entry.coverUrl && entry.coverUrl.startsWith('file://')) return `cover_${entry.id}.jpg`;
  return null;
};

// Legacy entries have no stored folder, so the old id-based path is used for them
export const getChapterFolderUri = (mangaId, chapterId, storedFolder) => {
  const relativePath = storedFolder || `manga_downloads/${mangaId}/${chapterId}/`;
  return FileSystem.documentDirectory + relativePath;
};

// chapterRows: { manga_id, chapter_id, folder } of every other downloaded manga
export const isFolderInUse = (chapterRows, folderUri) => chapterRows.some((row) => (
  getChapterFolderUri(row.manga_id, row.chapter_id, row.folder).startsWith(folderUri)
));

export const ensureDownloadsDirExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_FOLDER);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOAD_FOLDER, { intermediates: true });
  }
};
