import * as cheerio from 'react-native-cheerio';
import config from './MangaWorld.config.json' with {type: 'json'}; // Importazione del JSON

class MangaWorld {
  constructor() {
    // Usa la configurazione per le proprietà base
    this.config = config;
    this.baseUrl = this.config.baseUrl;
    this.name = this.config.name;
    this.lang = this.config.lang;
    
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Referer': this.baseUrl,
    };
  }

  /**
   * Cerca manga per nome
   */
  async searchManga(query) {
    try {
      const searchUrl = `${this.baseUrl}/archive?keyword=${encodeURIComponent(query)}`;
      const html = await this._fetchHtml(searchUrl);
      const $ = cheerio.load(html);
      const results = [];
      
      // CONFIG: Uso i selettori dal JSON
      const sel = this.config.selectors.search;

      $(sel.resultCard).each((index, element) => {
        const $el = $(element);
        const $link = $el.find(sel.url).first(); // Usa selettore config
        const title = $el.find(sel.title).text().trim(); // Usa selettore config
        const url = $link.attr('href');
        const $img = $el.find(sel.cover); // Usa selettore config
        const coverUrl = $img.attr('src') || $img.attr('data-src');
        
        if (url && url.includes('/manga/')) {
          const urlMatch = url.match(/\/manga\/(\d+)\/([^\/]+)/);
          if (urlMatch) {
            results.push({
              id: urlMatch[1],
              slug: urlMatch[2],
              title: title || urlMatch[2],
              coverUrl: this._fixUrl(coverUrl),
              source: this.name,
            });
          }
        }
      });
      
      return results;
    } catch (error) {
      console.error(`[Search] Errore: ${error.message}`);
      return [];
    }
  }

  /**
   * Ottiene dettagli e lista capitoli
   */
  async getMangaDetails(mangaId, slug) {
    try {
      const mangaUrl = `${this.baseUrl}/manga/${mangaId}/${slug}`;
      const html = await this._fetchHtml(mangaUrl);
      const $ = cheerio.load(html);
      
      // CONFIG: Uso i selettori dal JSON
      const sel = this.config.selectors.manga;

      const title = $(sel.title).text().trim();
      const coverUrl = $(sel.cover).first().attr('src');
      
      let description = '';
      $(sel.description).each((i, el) => {
        description += $(el).text().trim() + '\n\n';
      });
      
      // Passiamo il selettore capitoli alla funzione helper
      const chapters = this._parseChapters($, mangaId, sel.chapter);
      
      return {
        id: mangaId,
        slug: slug,
        title: title,
        coverUrl: this._fixUrl(coverUrl),
        description: description.trim(),
        chapters: chapters,
      };
      
    } catch (error) {
      console.error(`[Details] Errore: ${error.message}`);
      throw error;
    }
  }

  /**
   * STREAMING: Scarica immagini e notifica la UI man mano
   */
  async getChapterImages(mangaId, slug, chapterId, onProgress = null) {
    try {
      const chapterBaseUrl = `${this.baseUrl}/manga/${mangaId}/${slug}/read/${chapterId}`;
      const firstPageUrl = `${chapterBaseUrl}/1`;
      
      // 1. Scarica Pagina 1 e Info Totali
      const html = await this._fetchHtml(firstPageUrl);
      const $ = cheerio.load(html);
      
      // CONFIG: Uso il selettore per il menu pagine dal JSON
      const pageSelect = $(this.config.selectors.chapter.pageSelect);
      
      let totalPages = 1;
      if (pageSelect.length) {
        const text = pageSelect.find('option').last().text(); 
        const match = text.match(/(\d+)$/);
        if (match) totalPages = parseInt(match[1]);
        else totalPages = pageSelect.find('option').length;
      }

      let allImages = [];

      // Aggiungi subito la prima immagine
      const firstImgUrl = this._extractImageFromHtml($);
      if (firstImgUrl) {
        const firstBlock = [{ page: 1, url: firstImgUrl }];
        allImages.push(...firstBlock);
        if (onProgress) onProgress(firstBlock);
      }

      if (totalPages <= 1) return allImages;

      // 2. FETCH PARALLELO A BLOCCHI
      const pagesToFetch = [];
      for (let i = 2; i <= totalPages; i++) pagesToFetch.push(i);

      const fetchPageImage = async (pageNum) => {
        try {
          const pageHtml = await this._fetchHtml(`${chapterBaseUrl}/${pageNum}`);
          const $page = cheerio.load(pageHtml);
          const imgUrl = this._extractImageFromHtml($page);
          if (imgUrl) return { page: pageNum, url: imgUrl };
        } catch (e) { return null; }
      };

      const concurrencyLimit = 5; 
      
      for (let i = 0; i < pagesToFetch.length; i += concurrencyLimit) {
        const batch = pagesToFetch.slice(i, i + concurrencyLimit);
        const batchResults = await Promise.all(batch.map(p => fetchPageImage(p)));
        const validImages = batchResults.filter(img => img !== null);
        
        allImages.push(...validImages);
        if (onProgress && validImages.length > 0) {
          onProgress(validImages);
        }
        await new Promise(r => setTimeout(r, 100)); 
      }

      return allImages.sort((a, b) => a.page - b.page);

    } catch (error) {
      console.error(`[Images] Errore: ${error.message}`);
      throw error;
    }
  }

  // --- HELPERS ---

  async _fetchHtml(url) {
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) throw new Error(`HTTP ${response.status} su ${url}`);
    return await response.text();
  }

  // Ho aggiunto il parametro 'chapterSelector' per usare quello del config
  _parseChapters($, mangaId, chapterSelector) {
    const chapters = [];
    // CONFIG: Selettore passato dal config
    const $rows = $(chapterSelector); 

    $rows.each((i, el) => {
      const $el = $(el);
      const $link = $el.find('a').first();
      if (!$link.length) return;

      const href = $link.attr('href');
      const rawTitle = ($link.attr('title') || $link.text().trim()).toLowerCase();
      
      // 1. ID (Hash)
      let chapId = null;
      if (href.includes('/read/')) {
        const parts = href.split('/read/');
        if (parts.length > 1) {
          chapId = parts[1].split('/')[0];
        }
      }

      // 2. NUMERO (Parsing)
      let chapNum = null;
      let splitKey = 'capitolo';
      if (!rawTitle.includes(splitKey)) splitKey = 'chapter';
      
      if (rawTitle.includes(splitKey)) {
        const parts = rawTitle.split(splitKey);
        const numberPart = parts[1].trim();
        chapNum = parseFloat(numberPart);
      } else {
        const matches = rawTitle.match(/(\d+(\.\d+)?)/g);
        if (matches) {
           chapNum = matches[matches.length - 1];
        }
      }

      // CONFIG: Uso il selettore data dal JSON
      const dateSelector = this.config.selectors.manga.chapterDate;
      const dateText = $el.find(dateSelector).last().text().trim();

      if (chapId && chapNum) {
        const cleanTitle = `Capitolo ${chapNum}`;
        chapters.push({
          id: chapId,
          number: chapNum.toString(),
          title: cleanTitle,
          url: this._fixUrl(href),
          date: dateText
        });
      }
    });

    return chapters;
  }

  _extractImageFromHtml($) {
    // CONFIG: Prende l'array di selettori immagine dal JSON
    const selectors = this.config.selectors.chapter.images;
    
    for (const sel of selectors) {
      const $img = $(sel);
      if ($img.length) {
        const src = $img.attr('src') || $img.attr('data-src');
        if (src && !src.includes('loader')) return this._fixUrl(src);
      }
    }
    return null;
  }

  _fixUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }
}

export default new MangaWorld();