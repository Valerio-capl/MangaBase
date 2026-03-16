import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SourceManager from './sourceManager';

const DOWNLOAD_FOLDER = FileSystem.documentDirectory + 'manga_downloads/';
export const DownloadManager = {
    async dirExist(){
      const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_FOLDER)
      if (!dirInfo.exists){
        await FileSystem.makeDirectoryAsync(DOWNLOAD_FOLDER,{intermediates: true})
      } 
    },
    async downloadChapters(manga, chapters, onProgress) {
      if (!manga.source) {
        console.error("Error: Source missing");
        if (onProgress) onProgress("Error: Source missing");
        return;
      }
      await DownloadManager.dirExist();

      const json = await AsyncStorage.getItem('downloaded_manga');
      let downloadsDB = json ? JSON.parse(json) : [];

      let localManga = downloadsDB.find((m) => m.id === manga.id); //vedi se è gia nel db
      if (!localManga){
        const localCoverUri = DOWNLOAD_FOLDER + `cover_${manga.id}.jpg`;
        try {
          await FileSystem.downloadAsync(manga.coverUrl, localCoverUri);
        } catch (e) {
          console.warn("Unable to download covers, using remote URL", e);
        }
        localManga = {
          id: manga.id,
          title: manga.title,
          coverUrl: localCoverUri, 
          source: 'local', // modifica readerscreen
          originalSource: manga.source,
          chapters: []
        };
        downloadsDB.push(localManga);
      }
      for (const chapter of chapters){
        if (onProgress) onProgress(`Downloading ${chapter.title}...`);

        try {
          const images = await SourceManager.getChapterImages(
            manga.source, 
            manga.id, 
            manga.slug, 
            chapter.id
          );

          const chapterFolder = DOWNLOAD_FOLDER + `${manga.id}/${chapter.id}/`;
          await FileSystem.makeDirectoryAsync(chapterFolder, { intermediates: true });
          const localImages = [];
          for (let i = 0; i < images.length; i++) {
              const imgObj = images[i];
              const fileName = `page_${String(i).padStart(3, '0')}.jpg`;
              const fileUri = chapterFolder + fileName;

              await FileSystem.downloadAsync(imgObj.url, fileUri);
              localImages.push({
                  page: i + 1,
                  url: fileUri
              });
          }
          localManga.chapters = localManga.chapters.filter((c) => c.id !== chapter.id);
          localManga.chapters.push({
            id: chapter.id,
            number: chapter.number,
            title: chapter.title,
            pages: localImages,
            date: new Date().toISOString()
          });
          await AsyncStorage.setItem('downloaded_manga', JSON.stringify(downloadsDB));

        } catch(error){
          console.error(`Error chapter download  ${chapter.number} from ${manga.source}:`, error);
          if (onProgress) onProgress(`Error: chapter ${chapter.number}`);
        }
      }
      if (onProgress) onProgress("Download Completed!");
    },
    async getDownloadedChapterIds(mangaId) {
    try {
      const json = await AsyncStorage.getItem('downloaded_manga');
      if (!json) return [];
      
      const db = JSON.parse(json);
      const localManga = db.find((m) => m.id === mangaId);
      
      if (!localManga) return [];
      return localManga.chapters.map((c) => c.id);
    } catch (e) {
      console.error("Download ID retrieval error:", e);
      return [];
    }
  },
    async getLocalChapterImages(mangaId, chapterId) {
      try {
        const json = await AsyncStorage.getItem('downloaded_manga');
        if (!json) return [];
        
        const db = JSON.parse(json);
        const localManga = db.find((m) => m.id === mangaId);
        
        if (!localManga) return [];

        const localChapter = localManga.chapters.find((c) => c.id === chapterId);
        
        return localChapter ? localChapter.pages : [];
      } catch (error) {
        console.error("Local chapter reading error:", error);
        return [];
      }
  },
  async deleteChapters(mangaId, chapterIds) {
    try {
      const json = await AsyncStorage.getItem('downloaded_manga');
      if (!json) return;
      let db = JSON.parse(json);
      
      const mangaIndex = db.findIndex((m) => m.id === mangaId);
      if (mangaIndex === -1) return;

      const manga = db[mangaIndex];
      for (const chapId of chapterIds) {
        // Percorso: manga_downloads/ID_MANGA/ID_CAPITOLO/
        const chapterFolder = FileSystem.documentDirectory + `manga_downloads/${mangaId}/${chapId}/`;
        await FileSystem.deleteAsync(chapterFolder, { idempotent: true });
      }

      manga.chapters = manga.chapters.filter((c) => !chapterIds.includes(c.id));

      if (manga.chapters.length === 0) {
        await FileSystem.deleteAsync(FileSystem.documentDirectory + `manga_downloads/${mangaId}/`, { idempotent: true });
        db.splice(mangaIndex, 1);
      } else {
        db[mangaIndex] = manga;
      }

      await AsyncStorage.setItem('downloaded_manga', JSON.stringify(db));

    } catch (error) {
      console.error("Error:", error);
    }
  },
};