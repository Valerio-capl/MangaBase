import * as cheerio from 'react-native-cheerio';
class MangaWorld {
  constructor() {
    this.BASE_URL = 'https://www.mangaworld.mx';
    this.name = 'MangaWorld';
    this.lang = 'it';
    
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Referer': this.BASE_URL,
    };
  }

  async searchManga(query) {
    try {
      const searchUrl = `${this.BASE_URL}/archive?keyword=${encodeURIComponent(query)}`;
      const html = await this._fetchHtml(searchUrl);
      const $ = cheerio.load(html);

      const cards = $('.entry, .anime-card, .col-6');
      const results = [];

      cards.each((i, el) => {
        const title = $(el).find('.name, h3, .title').text().trim();
        const url = $(el).find('a').attr('href');
        const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');

        if (url && url.includes('/manga/')) {
          const parts = url.split('?')[0].split('/');
          const mangaIndex = parts.indexOf('manga')
          if (mangaIndex !== -1 && parts.length > mangaIndex + 2) {
            const extractedId = parts[mangaIndex + 1];
            const extractedSlug = parts[mangaIndex + 2];

            results.push({
              id: extractedId,
              slug: extractedSlug,
              url: this._fixUrl(url),
              cover: this._fixUrl(cover),
              source:this.name,
            });
          }
        }
      });
      return results;
    } catch (err) {
      console.error('Errore nella search:', err);
      return [];
    }
  }

  async getMangaDetails(mangaId, slug) {
    try {
      const mangaUrl = `${this.BASE_URL}/manga/${mangaId}/${slug}`;
      const html = await this._fetchHtml(mangaUrl);
      const $ = cheerio.load(html);

      const title = $('h1.name, .comic-title h1').first().text().trim();
      const cover = $('.comic-info img, .manga-cover img').first().attr('src');
      const description = $('.description p, .synopsis p').each((i, el) => {
                          description += $(el).text().trim() + '\n\n';});

      const chapters = this._parseChapters($)

      return {
        id: mangaId,
        slug: slug,
        title: title,
        coverUrl: this._fixUrl(cover),
        description: description,
        chapters: chapters,
      };
    } catch (err) {
      console.error('Errore nel dettaglio manga:', err);
      return null;
    }
  }

  async getChapterImages(mangaId, slug, chapterId) {
    try {
      const chapterUrl = `${this.BASE_URL}/manga/${mangaId}/${slug}/read/${chapterId}`;
      const images = [];
      let pageNum = 1;
      let hasMorePages = true;

      while (hasMorePages){
        const pageUrl = `${chapterUrl}/${pageNum}`;
        
        const html = await this._fetchHtml(pageUrl)
        const $ = cheerio.load(html);
        const img = $('#page img.img-fluid, #reader img, img.page-image, .reader-container img');
        const src = img.attr('src') || img.attr('data-src');

        if (src) {
          const lastPart = src.substring(src.lastIndexOf('/') + 1);
          const imgPageNum = parseInt(lastPart.split('.')[0]);
          // controlla perche dopo ultima pag torna alla 1 -> loop inf
          if (imgPageNum < pageNum) {
            hasMorePages = false;

          } else {
            const fixedSrc = await this._fixUrl(src);
            images.push({
              page: pageNum,
              url:  fixedSrc
            });
          }

        } else {
          hasMorePages = false;
          console.log(`Pagina ${pageNum}: nessuna immagine trovata, fine capitolo`);
        }

        pageNum++;
        if (pageNum > 200) {
          hasMorePages = false;
          console.warn('Raggiunto limite di 200 pagine');
        }
      }
      return images;

    } catch (err) {
      console.error('Errore caricamento immagini capitolo:', err);
      return [];
    }
  }

  // helpers
  async _fetchHtml(url) {
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) throw new Error(`HTTP ${response.status} su ${url}`);
    return await response.text();
  }

  async _fixUrl(url) {
    if (! url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    return BASE_URL + url;
  }

  _parseChapters($) {
    const chapters = [];
    const $rows = $('.chapter, .chapter-item, .row-content-chapter'); 

    $rows.each((i, el) => {
      const $el = $(el);
      const $link = $el.find('a').first();
      if (!$link.length) return;
      const href = $link.attr('href');
      const rawTitle = $link.attr('title') || $link.text().trim();

      let chapId = null;
      if (href.includes('/read/')) {
        const parts = href.split('/read/');
        if (parts.length > 1) {
          chapId = parts[1].split('/')[0];
        }
      }
      
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

      if (chapId && chapNum) {
        const cleanTitle = `Capitolo ${chapNum}`;
        chapters.push({
          id: chapId,
          number: chapNum,
          title: cleanTitle,
          url: this._fixUrl(href),
        });
      }
    });
    return chapters;
  }
}
export default new MangaWorld();
