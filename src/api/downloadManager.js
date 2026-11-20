import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { getMangaKey, isSameManga } from './mangaKey';
import SourceManager from './sourceManager';

const DOWNLOAD_FOLDER = FileSystem.documentDirectory + 'manga_downloads/';

// Builds a filesystem-safe folder name from any id.
const toSafeName = (value) => {
  const text = String(value);
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  const readable = text.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return `${readable || 'chapter'}_${(hash >>> 0).toString(36)}`;
};

const getPageFileName = (pageNumber) => `page_${String(pageNumber - 1).padStart(3, '0')}.jpg`;
const getMangaFolderName = (mangaId, source) => toSafeName(getMangaKey({ id: mangaId, source }));
const isEntryOf = (mangaId, source) => (entry) => isSameManga(entry, { id: mangaId, source });
// New entries store the cover file name; legacy entries only have an absolute file:// URI
const getCoverFileName = (entry) => {
  if (entry.coverFile) return entry.coverFile;
  if (entry.coverUrl && entry.coverUrl.startsWith('file://')) return `cover_${entry.id}.jpg`;
  return null;
};

const isFolderInUse = (db, ignoredIndex, folderUri) => db.some((entry, index) => (
  index !== ignoredIndex && entry.chapters.some((chapter) => (
    getChapterFolderUri(entry.id, chapter.id, chapter.folder).startsWith(folderUri)
  ))
));
// Legacy entries have no stored folder, so the old id-based path is used for them
const getChapterFolderUri = (mangaId, chapterId, storedFolder) => {
  const relativePath = storedFolder || `manga_downloads/${mangaId}/${chapterId}/`;
  return FileSystem.documentDirectory + relativePath;
};

export const DownloadManager = {
  async dirExist() {
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_FOLDER)
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DOWNLOAD_FOLDER, { intermediates: true })
    }
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

    const json = await AsyncStorage.getItem('downloaded_manga');
    const downloadsDB = json ? JSON.parse(json) : [];
    const mangaFolderName = getMangaFolderName(manga.id, manga.source);

    let localManga = downloadsDB.find(isEntryOf(manga.id, manga.source));
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

      if (onProgress) onProgress(`Downloading ${chapter.title}...`);
      const safeName = toSafeName(chapter.id);
      const relativeFolder = `manga_downloads/${mangaFolderName}/${safeName}/`;
      const finalFolder = FileSystem.documentDirectory + relativeFolder;
      const tempFolder = FileSystem.documentDirectory + `manga_downloads/${mangaFolderName}/${safeName}.tmp/`;

      try {
        const rawImages = await SourceManager.getChapterImages(
          manga.source,
          manga.id,
          manga.slug,
          chapter.id
        );

        if (!rawImages || rawImages.length === 0) {
          throw new Error("No pages found");
        }
        const images = [...rawImages].sort((a, b) => a.page - b.page);
        if (images.some((img, i) => img.page !== i + 1)) {
          throw new Error("Some pages are missing from the source");
        }
        await FileSystem.deleteAsync(tempFolder, { idempotent: true });
        await FileSystem.makeDirectoryAsync(tempFolder, { intermediates: true });

        const results = await Promise.allSettled(images.map(async (imgObj, i) => {
          if (!imgObj.url) {
            throw new Error(`Missing URL for page ${i + 1}`);
          }
          const fileName = `page_${String(i).padStart(3, '0')}.jpg`;
          const options = imgObj.headers ? { headers: imgObj.headers } : {};
          const result = await FileSystem.downloadAsync(imgObj.url, tempFolder + fileName, options);
          if (result.status !== 200) {
            throw new Error(`HTTP ${result.status} on page ${i + 1}`);
          }
          return { page: i + 1, url: finalFolder + fileName };
        }));

        const failedPages = results.filter((r) => r.status === 'rejected');
        if (failedPages.length > 0) {
          throw new Error(`${failedPages.length}/${images.length} pages failed (${failedPages[0].reason?.message})`);
        }

        // Replace the previous copy only now that the new one is complete
        const previous = localManga.chapters.find((c) => c.id === chapter.id);
        if (previous) {
          await FileSystem.deleteAsync(
            getChapterFolderUri(manga.id, previous.id, previous.folder),
            { idempotent: true }
          );
        }
        await FileSystem.deleteAsync(finalFolder, { idempotent: true });
        await FileSystem.moveAsync({ from: tempFolder, to: finalFolder });

        localManga.chapters = localManga.chapters.filter((c) => c.id !== chapter.id);
        localManga.chapters.push({
          id: chapter.id,
          number: chapter.number,
          title: chapter.title,
          folder: relativeFolder,
          pages: results.map((r) => r.value),
          date: new Date().toISOString()
        });
        await AsyncStorage.setItem('downloaded_manga', JSON.stringify(downloadsDB));

      } catch (error) {
        console.error(`Error chapter download ${chapter.number} from ${manga.source}:`, error);
        await FileSystem.deleteAsync(tempFolder, { idempotent: true });
        failed.push(chapter.number);
        if (onProgress) onProgress(`Error: chapter ${chapter.number}`);

      }
    }
    if (onProgress) {
      onProgress(failed.length > 0 ? "Download completed with errors" : "Download Completed!");
    }
    return { failed, skipped };
  },

  async getDownloadedChapterIds(mangaId, source) {
    try {
      const json = await AsyncStorage.getItem('downloaded_manga');
      if (!json) return [];

      const db = JSON.parse(json);
      const localManga = db.find(isEntryOf(mangaId, source));
      if (!localManga) return [];
      return localManga.chapters.map((c) => c.id);
    } catch (e) {
      console.error("Download ID retrieval error:", e);
      return [];
    }
  },

  async getLocalChapterImages(mangaId, chapterId, source) {
    try {
      const json = await AsyncStorage.getItem('downloaded_manga');
      if (!json) return [];

      const db = JSON.parse(json);
      const localManga = db.find(isEntryOf(mangaId, source));
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
    const json = await AsyncStorage.getItem('downloaded_manga');
    const db = json ? JSON.parse(json) : [];
    // Cover URIs are absolute and go stale like page URIs: rebuild them from the current directory
    return db.map((m) => {
      const coverFile = getCoverFileName(m);
      return coverFile ? { ...m, coverUrl: DOWNLOAD_FOLDER + coverFile } : m;
    });
  },

  async deleteChapters(mangaId, chapterIds, source) {
    try {
      const json = await AsyncStorage.getItem('downloaded_manga');
      if (!json) return;
      const db = JSON.parse(json);

      const mangaIndex = db.findIndex(isEntryOf(mangaId, source));
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

      await AsyncStorage.setItem('downloaded_manga', JSON.stringify(db));
    } catch (error) {
      console.error("Error:", error);
    }
  },

  async isChapterComplete(mangaId, chapterEntry) {
    try {
      const folderUri = getChapterFolderUri(mangaId, chapterEntry.id, chapterEntry.folder);
      const entries = await FileSystem.readDirectoryAsync(folderUri);
      return chapterEntry.pages.length > 0 && entries.length === chapterEntry.pages.length;
    } catch (e) {
      return false;
    }
  },

  async logChapterStorage(folderUri, storedUrl, rebuiltUrl) {
    try {
      console.log("[Downloads] documentDirectory:", FileSystem.documentDirectory);
      console.log("[Downloads] stored URL (first page):", storedUrl);
      console.log("[Downloads] rebuilt URL (first page):", rebuiltUrl);

      const rebuiltInfo = await FileSystem.getInfoAsync(rebuiltUrl);
      console.log("[Downloads] rebuilt file exists:", rebuiltInfo.exists);
      if (storedUrl) {
        const storedInfo = await FileSystem.getInfoAsync(storedUrl);
        console.log("[Downloads] stored file exists:", storedInfo.exists);
      }

      let dir = folderUri;
      while (dir.length >= DOWNLOAD_FOLDER.length) {
        const info = await FileSystem.getInfoAsync(dir);
        if (info.exists) {
          const entries = await FileSystem.readDirectoryAsync(dir);
          console.log(`[Downloads] ${dir} contains ${entries.length} entries:`, entries.slice(0, 20));
          break;
        }
        console.log(`[Downloads] missing folder: ${dir}`);
        dir = dir.replace(/[^/]+\/$/, '');
      }
    } catch (e) {
      console.warn("[Downloads] diagnostic failed:", e);
    }
  },

};