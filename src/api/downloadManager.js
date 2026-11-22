import * as FileSystem from 'expo-file-system/legacy';
import {
  DOWNLOAD_FOLDER,
  ensureDownloadsDirExists,
  getChapterFolderUri,
  getCoverFileName,
  getMangaFolderName,
  getPageFileName,
  isFolderInUse,
} from './downloads/paths';
import {
  findDownloadedManga,
  findDownloadedMangaIndex,
  getDownloadedManga,
  getRawDownloadsDB,
  saveDownloadsDB,
} from './downloads/downloadsStore';
import { downloadSingleChapter, isChapterComplete } from './downloads/chapterDownloader';
import { logChapterStorage } from './downloads/diagnostics';

export { getMangaFolderName };

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

    const downloadsDB = await getRawDownloadsDB();
    const mangaFolderName = getMangaFolderName(manga.id, manga.source);

    let localManga = findDownloadedManga(downloadsDB, manga.id, manga.source);
    if (!localManga) {
      const coverFile = `cover_${mangaFolderName}.jpg`;
      const localCoverUri = DOWNLOAD_FOLDER + coverFile;
      let coverUri = manga.coverUrl;
      let storedCoverFile = null;
      try {
        const coverResult = await FileSystem.downloadAsync(manga.coverUrl, localCoverUri);
        if (coverResult.status === 200) {
          coverUri = localCoverUri;
          storedCoverFile = coverFile;
        } else {
          await FileSystem.deleteAsync(localCoverUri, { idempotent: true });
        }
      } catch (e) {
        console.warn("Unable to download cover, using remote URL", e);
      }
      localManga = {
        id: manga.id,
        title: manga.title,
        coverUrl: coverUri,
        coverFile: storedCoverFile,
        source: 'local',
        originalSource: manga.source,
        chapters: []
      };
      downloadsDB.push(localManga);
    }

    for (const chapter of chapters) {
      const existing = localManga.chapters.find((c) => c.id === chapter.id);
      if (existing && await DownloadManager.isChapterComplete(manga.id, existing)) {
        skipped.push(chapter.number);
        continue;
      }

      try {
        const chapterEntry = await downloadSingleChapter({
          manga,
          chapter,
          mangaFolderName,
          localManga,
          onProgress
        });

        localManga.chapters = localManga.chapters.filter((c) => c.id !== chapter.id);
        localManga.chapters.push(chapterEntry);
        await saveDownloadsDB(downloadsDB);
      } catch (error) {
        failed.push(chapter.number);
      }
    }

    if (onProgress) {
      onProgress(failed.length > 0 ? "Download completed with errors" : "Download Completed!");
    }
    return { failed, skipped };
  },

  async getDownloadedChapterIds(mangaId, source) {
    try {
      const db = await getRawDownloadsDB();
      const localManga = findDownloadedManga(db, mangaId, source);
      if (!localManga) return [];
      return localManga.chapters.map((c) => c.id);
    } catch (e) {
      console.error("Download ID retrieval error:", e);
      return [];
    }
  },

  async getLocalChapterImages(mangaId, chapterId, source) {
    try {
      const db = await getRawDownloadsDB();
      const localManga = findDownloadedManga(db, mangaId, source);
      if (!localManga) return [];

      const localChapter = localManga.chapters.find((c) => c.id === chapterId);
      if (!localChapter) return [];
      const folderUri = getChapterFolderUri(mangaId, chapterId, localChapter.folder);
      const pages = localChapter.pages.map((p) => ({
        page: p.page,
        url: folderUri + getPageFileName(p.page)
      }));

      if (__DEV__) {
        await DownloadManager.logChapterStorage(folderUri, localChapter.pages[0]?.url, pages[0]?.url);
      }

      return pages;
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
      const db = await getRawDownloadsDB();
      const mangaIndex = findDownloadedMangaIndex(db, mangaId, source);
      if (mangaIndex === -1) return;

      const manga = db[mangaIndex];
      for (const chapId of chapterIds) {
        const entry = manga.chapters.find((c) => c.id === chapId);
        await FileSystem.deleteAsync(
          getChapterFolderUri(mangaId, chapId, entry?.folder),
          { idempotent: true }
        );
      }

      manga.chapters = manga.chapters.filter((c) => !chapterIds.includes(c.id));
      if (manga.chapters.length === 0) {
        const coverFile = getCoverFileName(manga);
        if (coverFile) {
          await FileSystem.deleteAsync(DOWNLOAD_FOLDER + coverFile, { idempotent: true });
        }

        const mangaFolders = [
          DOWNLOAD_FOLDER + `${mangaId}/`,                                              // legacy layout
          DOWNLOAD_FOLDER + `${getMangaFolderName(mangaId, manga.originalSource)}/`    // layout with source
        ];
        for (const folderUri of mangaFolders) {
          if (!isFolderInUse(db, mangaIndex, folderUri)) {
            await FileSystem.deleteAsync(folderUri, { idempotent: true });
          }
        }
        db.splice(mangaIndex, 1);
      } else {
        db[mangaIndex] = manga;
      }

      await saveDownloadsDB(db);
    } catch (error) {
      console.error("Error:", error);
    }
  },

  async isChapterComplete(mangaId, chapterEntry) {
    return isChapterComplete(mangaId, chapterEntry);
  },

  async logChapterStorage(folderUri, storedUrl, rebuiltUrl) {
    return logChapterStorage(folderUri, storedUrl, rebuiltUrl);
  },
};
