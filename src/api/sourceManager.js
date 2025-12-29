import MangaWorld from './mangaworld/mangaworld';
import MangaKatana from './mangakatana/mangakatana';

class SourceManager {
  constructor() {
// registro fonti
    this.sources = {
      [MangaWorld.name]: MangaWorld,
      [MangaKatana.name]: MangaKatana,
    };
// da modificare con impostazioni
    this.activeSources = [MangaWorld.name, MangaKatana.name];
  }

  /**
   * @param {string} query 
   * @param {function} onResult 
   */
  async searchAll(query, onResult) {
    const promises = this.activeSources.map(async (sourceName) => {
      const source = this.sources[sourceName];
      if (!source) return;

      try {
        const results = await source.searchManga(query);
        const taggedResults = results.map(item => ({
          ...item,
          source: sourceName 
        }));

        if (onResult && taggedResults.length > 0) {
          onResult(taggedResults);
        }
      } catch (error) {
        console.error(`[SourceManager] Error searching on ${sourceName}:`, error);
      }
    });
    await Promise.allSettled(promises);
  }

  async getMangaDetails(sourceName, mangaId, slug) {
    const source = this.sources[sourceName];
    if (!source) throw new Error(`Source ${sourceName} not found`);
    return await source.getMangaDetails(mangaId, slug);
  }

  async getChapterImages(sourceName, mangaId, slug, chapterId) {
    const source = this.sources[sourceName];
    if (!source) throw new Error(`Source ${sourceName} not found`);
    return await source.getChapterImages(mangaId, slug, chapterId);
  }
}

export default new SourceManager();