import * as FileSystem from 'expo-file-system/legacy';
import { downloadSingleChapter, isChapterComplete } from './downloads/chapterDownloader';
import {
  countChapters,
  deleteChapterRows,
  deleteManga,
  findDownloadedManga,
  getChapter,
  getChapters,
  getDownloadedManga,
  getOtherChapterLocations,
  insertManga,
  saveChapter,
} from './downloads/downloadsStore';
import {
  DOWNLOAD_FOLDER,
  ensureDownloadsDirExists,
  getChapterFolderUri,
  getMangaFolderName,
  getPageFileName,
  isFolderInUse,
} from './downloads/paths';

export { getMangaFolderName };

// Saves the cover next to the chapters; returns its file name, or null to keep the remote URL
const downloadCover = async (manga, mangaFolderName) => {
  const coverFile = `cover_${mangaFolderName}.jpg`;
  const localCoverUri = DOWNLOAD_FOLDER + coverFile;
  try {
    const result = await FileSystem.downloadAsync(manga.coverUrl, localCoverUri);
    if (result.status === 200) return coverFile;
    await FileSystem.deleteAsync(localCoverUri, { idempotent: true });
  } catch (e) {
    console.warn("Unable to download cover, using remote URL", e);
  }
  return null;
};

export const DownloadManager = {
  async dirExist() {
    await ensureDownloadsDirExists();
  },

  async downloadChapters(manga, chapters, onProgress) {
    const failed = [];
    const skipped = [];
    if (!manga.source) {
      console.error("Error: Source missing");
      if (onProgress) onProgress("Error: Source missing");
      return { failed: chapters.map((c) => c.number), skipped: [] };
    }
    await DownloadManager.dirExist();

    const mangaFolderName = getMangaFolderName(manga.id, manga.source);
    let localManga = await findDownloadedManga(manga.id, manga.source);

    // A new manga entry is written only once its first chapter is complete
    const newManga = localManga ? null : {
      source: manga.source,
      id: manga.id,
      title: manga.title,
      coverUrl: manga.coverUrl,
      coverFile: await downloadCover(manga, mangaFolderName),
    };

    for (const chapter of chapters) {
      const existing = localManga
        ? await getChapter(localManga.source, localManga.id, chapter.id)
        : null;
      if (existing && await DownloadManager.isChapterComplete(manga.id, existing)) {
        skipped.push(chapter.number);
        continue;
      }

      try {
        const chapterEntry = await downloadSingleChapter({
          manga,
          chapter,
          mangaFolderName,
          previousChapter: existing,
          onProgress
        });

        if (!localManga) localManga = await insertManga(newManga);
        await saveChapter(localManga.source, localManga.id, chapterEntry);
      } catch (error) {
        failed.push(chapter.number);
      }
    }

    // Nothing was saved for a new manga: drop the cover downloaded for it
    if (!localManga && newManga.coverFile) {
      await FileSystem.deleteAsync(DOWNLOAD_FOLDER + newManga.coverFile, { idempotent: true });
    }

    if (onProgress) {
      onProgress(failed.length > 0 ? "Download completed with errors" : "Download Completed!");
    }
    return { failed, skipped };
  },

  async getDownloadedChapterIds(mangaId, source) {
    try {
      const manga = await findDownloadedManga(mangaId, source);
      if (!manga) return [];
      const chapters = await getChapters(manga.source, manga.id);
      return chapters.map((c) => c.id);
    } catch (e) {
      console.error("Download ID retrieval error:", e);
      return [];
    }
  },

  async getLocalChapterImages(mangaId, chapterId, source) {
    try {
      const manga = await findDownloadedManga(mangaId, source);
      if (!manga) return [];
      const chapter = await getChapter(manga.source, manga.id, chapterId);
      if (!chapter) return [];

      // Pages are numbered 1..pageCount, so the file paths can be rebuilt from the folder
      const folderUri = getChapterFolderUri(mangaId, chapterId, chapter.folder);
      return Array.from({ length: chapter.pageCount }, (_, i) => ({
        page: i + 1,
        url: folderUri + getPageFileName(i + 1),
      }));
    } catch (error) {
      console.error("Local chapter reading error:", error);
      return [];
    }
  },

  async getDownloadedManga() {
    return getDownloadedManga();
  },

  async deleteChapters(mangaId, chapterIds, source) {
    try {
      const manga = await findDownloadedManga(mangaId, source);
      if (!manga) return;

      const chapters = await getChapters(manga.source, manga.id);
      for (const chapId of chapterIds) {
        const entry = chapters.find((c) => c.id === chapId);
        await FileSystem.deleteAsync(
          getChapterFolderUri(manga.id, chapId, entry?.folder),
          { idempotent: true }
        );
      }
      await deleteChapterRows(manga.source, manga.id, chapterIds);

      if (await countChapters(manga.source, manga.id) === 0) {
        if (manga.coverFile) {
          await FileSystem.deleteAsync(DOWNLOAD_FOLDER + manga.coverFile, { idempotent: true });
        }

        const others = await getOtherChapterLocations(manga.source, manga.id);
        const mangaFolders = [
          DOWNLOAD_FOLDER + `${manga.id}/`,                                          // legacy layout
          DOWNLOAD_FOLDER + `${getMangaFolderName(manga.id, manga.source)}/`         // layout with source
        ];
        for (const folderUri of mangaFolders) {
          if (!isFolderInUse(others, folderUri)) {
            await FileSystem.deleteAsync(folderUri, { idempotent: true });
          }
        }
        await deleteManga(manga.source, manga.id);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  },

  async isChapterComplete(mangaId, chapterEntry) {
    return isChapterComplete(mangaId, chapterEntry);
  },
};