import config from './MangaWorld.config.json' with {type: 'json'};
import { NetworkError, HTTPError, ParseError } from '../../errors/SourceErrors.js'; 
import * as cheerio from 'react-native-cheerio';


class MangaWorld {
  constructor() {
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
      
      const sel = this.config.selectors.search;

      $(sel.resultCard).each((index, element) => {
        const $el = $(element);
        const $link = $el.find(sel.url).first(); 
        const title = $el.find(sel.title).text().trim();
        const url = $link.attr('href');
        const $img = $el.find(sel.cover); 
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
    } catch (err) {
      throw err;
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
      const sel = this.config.selectors.manga;

      const title = $(sel.title).text().trim();
      const coverUrl = $(sel.cover).first().attr('src');
      const description = $('#noidungm').text().trim();
      
      const chapters = this._parseChapters($, sel.chapter);

      let author = "";
      let year = "";
      let status = "";
      $(sel.info).each((i, el) => {
        const $el = $(el);
        const $labelNode = $el.find(sel.label).first();
        const labelText = $labelNode.text().toLowerCase().trim();
        const links = $el.find('a').map((_, a) => $(a).text().trim()).get()

        let value = "";
        if (links.length > 0) {
          value = links.join(', ');

        }else {
          const fullText = $el.text().trim();
          value = fullText.replace($labelNode.text(), '').trim();
        }

        if (labelText.includes('autor')) {author = value;} 
        else if (labelText.includes('anno') || labelText.includes('data')) {year = value;}
        else if (labelText.includes('stato') || labelText.includes('status')) {status = value;}
      });

      return {
        id: mangaId,
        slug: slug,
        title: title,
        author: author || "Sconosciuto",
        year: year || "Sconosciuto",
        status: status || "Sconosciuto",
        coverUrl: this._fixUrl(coverUrl),
        description: description.trim(),
        chapters: chapters,
      };
      
    } catch (err) {
      throw err;
    }
  }

  async getChapterImages(mangaId, slug, chapterId) {
      try {
        const chapterUrl = `${this.baseUrl}/manga/${mangaId}/${slug}/read/${chapterId}`;
        

        const firstPageUrl = `${chapterUrl}/1`;
        const html = await this._fetchHtml(firstPageUrl);
        const $ = cheerio.load(html);
        const firstImgUrl = this._extractImageFromHtml($);
        

        const pageSelect = $(this.config.selectors.chapter.pageSelect);
        let totalPages = 1;
        if (pageSelect.length) {
          const text = pageSelect.find('option').last().text(); 
          const match = text.match(/(\d+)$/);
          if (match) totalPages = parseInt(match[1]);
          else totalPages = pageSelect.find('option').length;
        }

        const pageNums = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        const restImages = [];
        const batchSize = 3; 
        for (let i = 0; i < pageNums.length; i += batchSize) {
          const batch = pageNums.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (pageNum) => {
              try {
                const html = await this._fetchHtml(`${chapterUrl}/${pageNum}`);
                const $ = cheerio.load(html);
                const src = this._extractImageFromHtml($);
                return {
                  page: pageNum,
                  url: this._fixUrl(src),
                  headers: { Referer: this.baseUrl, 'User-Agent': this.headers['User-Agent'] }
                };
              } catch { return null; }
            })
          );
          restImages.push(...batchResults);
        }

        const images = [
          { page: 1, url: this._fixUrl(firstImgUrl), headers: { Referer: this.baseUrl, 'User-Agent': this.headers['User-Agent'] } },
          ...restImages.filter(Boolean)
        ];
            return images.sort((a, b) => a.page - b.page);
      
          } catch (err) {
            throw err;
          }
        }

  // --- HELPERS ---

  async _fetchHtml(url) {
    try{
      const response = await fetch(url, { headers: this.headers });
      if (!response.ok) throw new HTTPError(`HTTP ${response.status} su ${url}`);
      return await response.text();
    } catch (error) {
    
      if (error instanceof HTTPError || error instanceof ParseError) {
        throw error;}
      throw new NetworkError(`Connection Error: ${error.message}`);
    }
  }

  _extractImageFromHtml($) {
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

  _parseChapters($, chapterSelector) {
    const chapters = [];
    const $rows = $(chapterSelector); 

    $rows.each((i, el) => {
      const $el = $(el);
      const $link = $el.find('a').first();
      if (!$link.length) return;

      const href = $link.attr('href');
      const rawTitle = ($link.attr('title') || $link.text().trim()).toLowerCase();
      
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

  _fixUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }
}
export default new MangaWorld();