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

  // Searches every active source in parallel.

  async searchAll(query, onUpdate, options = {}) {
    const { signal } = options;
    if (signal?.aborted) return;
    // Report every source as loading first, so the UI can draw all sections at once
    this.activeSources.forEach((sourceName) => onUpdate({ source: sourceName, status: 'loading' }));

    await Promise.allSettled(this.activeSources.map(async (sourceName) => {
      try {
        const results = await this.sources[sourceName].searchManga(query, { signal });
        if (signal?.aborted) return;
        const tagged = results.map((item) => ({ ...item, source: sourceName }));
        onUpdate({ source: sourceName, status: tagged.length > 0 ? 'ok' : 'empty', results: tagged });
      } catch (error) {
        if (signal?.aborted) return;
        onUpdate({ source: sourceName, status: 'error', error });
      }
    }));
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