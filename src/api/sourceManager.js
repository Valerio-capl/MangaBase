import MangaKatana from './mangakatana/mangakatana';
import MangaRead from './mangaread/mangaread';
import MangaWorld from './mangaworld/mangaworld';
import NoveCoolIT from './novecool/novecool-it';

class SourceManager {
  constructor() {
// registro fonti
    this.sources = {
      [MangaWorld.name]: MangaWorld,
      [NoveCoolIT.name]: NoveCoolIT,
      [MangaKatana.name]: MangaKatana,
      [MangaRead.name]: MangaRead,
    };
// da modificare con impostazioni
    this.activeSources = [MangaWorld.name, NoveCoolIT.name, MangaKatana.name, MangaRead.name];
  }

  /**
   * @param {string} query 
   * @param {function} onResult 
   */
  async searchAll(query, onResult, options = {}) {
    const promises = this.activeSources.map(async (sourceName) => {
      const source = this.sources[sourceName];
      if (!source) return Promise.reject(new Error("Source not found"));

      const results = await source.searchManga(query, { signal: options.signal });
      const taggedResults = results.map(item => ({
        ...item,
        source: sourceName 
      }));

      if (onResult && taggedResults.length > 0) {
        onResult(taggedResults);
      }
    });
    const settledPromises = await Promise.allSettled(promises);
    const allFailed = settledPromises.every(p => p.status === 'rejected');
    if (allFailed && settledPromises.length > 0) {
      throw settledPromises[0].reason; 
    }
  }

  async getMangaDetails(sourceName, mangaId, slug, options = {}) {
    const source = this.sources[sourceName];
    if (!source) throw new Error(`Source ${sourceName} not found`);
    return await source.getMangaDetails(mangaId, slug, options);
  }

  async getChapterImages(sourceName, mangaId, slug, chapterId, options = {}) {
    const source = this.sources[sourceName];
    if (!source) throw new Error(`Source ${sourceName} not found`);
    return await source.getChapterImages(mangaId, slug, chapterId, options);
  }
}

export default new SourceManager();