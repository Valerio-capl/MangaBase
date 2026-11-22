import * as FileSystem from 'expo-file-system/legacy';
import SourceManager from '../sourceManager';
import { getChapterFolderUri, toSafeName } from './paths';

export const isChapterComplete = async (mangaId, chapterEntry) => {
  try {
    const folderUri = getChapterFolderUri(mangaId, chapterEntry.id, chapterEntry.folder);
    const entries = await FileSystem.readDirectoryAsync(folderUri);
    return chapterEntry.pages.length > 0 && entries.length === chapterEntry.pages.length;
  } catch (e) {
    return false;
  }
};

export const downloadSingleChapter = async ({
  manga,
  chapter,
  mangaFolderName,
  localManga,
  onProgress
}) => {
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

    return {
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
      folder: relativeFolder,
      pages: results.map((r) => r.value),
      date: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error chapter download ${chapter.number} from ${manga.source}:`, error);
    await FileSystem.deleteAsync(tempFolder, { idempotent: true });
    if (onProgress) onProgress(`Error: chapter ${chapter.number}`);
    throw error;
  }
};
