import * as cheerio from 'react-native-cheerio';
import { NetworkError, HTTPError, ParseError } from '../../errors/SourceErrors.js';
import config from './NoveCool.config.json' with {type: 'json'};

class NoveCoolIT{
  constructor(){
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
  async searchManga(query) {
    try {
      const searchUrl = `${this.baseUrl}/search/?name=${encodeURIComponent(query)}`;
      const html = await this._fetchHtml(searchUrl);
      const $ = cheerio.load(html);
      const sel = this.config.selectors.search;
      const results = [];

      $(sel.resultCard).each((index, element) => {
        const $el = $(element);
        const $link = $el.find(sel.url).first(); 
        const url = $link.attr('href');
        const title = $el.find(sel.title).text().trim();
        const coverUrl = $el.find(sel.cover).attr('src');
        
        // Pattern URL: /novel/slug.html (es: /novel/Vagabond.html)
        if (url) {
          const urlMatch = url.match(/\/novel\/([^.]+)\.html$/);
          if (urlMatch) {
            results.push({
              id: urlMatch[1],
              slug: urlMatch[1],
              title: title || urlMatch[1],
              coverUrl: this._fixUrl(coverUrl),
              source: this.name,
            });
          }
        }
      });
      return results;

    } catch (e) {
      console.warn(`[NoveCool] Search error: ${e.message}`);
      throw e
    }

  }
  async getMangaDetails(mangaId, slug) {
    try{
      console.log(`loading ${slug}`)
      const mangaUrl = `${this.baseUrl}/novel/${slug}.html`;
      const html = await this._fetchHtml(mangaUrl);
      const $ = cheerio.load(html);
      const sel = this.config.selectors.manga;

      const title = $(sel.title).first().text().trim();
      const coverUrl = $(sel.cover).attr('src');
      const description = $(sel.description).first().text().trim();
      const authorRaw = $(sel.author).attr('title') || "";
      const author = authorRaw
        .split(',')
        .map(a => a.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(', ');
      const status = $(sel.status).first().text().trim();

      const chapters = [];
      $(sel.chapterRow).each((i,el)=>{
        const $row = $(el);
        const $a = $row.find(sel.chapterLink).first();
        const href = $a.attr("href");
        const parts = href.split('/');
        const chapterId = parts[parts.length - 2];

        const rawTitle = $row.find(sel.chapterTitle).text().trim();
        const date = $row.find(sel.chapterDate).text().trim();
        let chapNum = null;
        const numMatch = rawTitle.match(/Chapter\s*(\d+(\.\d+)?)/i) || rawTitle.match(/(\d+(\.\d+)?)/);
        if (numMatch) chapNum = numMatch[1];

        if (chapterId) {
            chapters.push({
              id: href, //url invece che id per problema con costruzione url img
              number: chapNum || '0',
              title: rawTitle,
              url: this._fixUrl(href),
              date: date
            });
          }
        
      })
      return {
        id: mangaId,
        slug: slug,
        title: title,
        coverUrl: this._fixUrl(coverUrl),
        description: description || "Descrizione non disponibile",
        author: author || "Sconosciuto",
        status: status || "Sconosciuto",
        year: "Sconosciuto",
        chapters: chapters
      };
    } catch (e) {
      console.warn(e)
      throw e
    }
    
  }
  async getChapterImages(mangaId, slug, chapterId) {
    try{
      const chapterUrl = this._fixUrl(chapterId);
      const html = await this._fetchHtml(chapterUrl);
      const $ = cheerio.load(html);
      
      const pageUrls = [];
      $(this.config.selectors.chapter.pageSelect).first().find('option').each((_, el) => {
        const val = $(el).attr('value');
        if (val) pageUrls.push(val);
      });

      if (pageUrls.length === 0) {
        throw new ParseError("No pages found. Possible layout change of NoveCool.");
      }

      // fetch di 4 pagine per batch
      const images = [];
      const batchSize = 4;

      for (let i = 0; i < pageUrls.length; i += batchSize) {
        const batch = pageUrls.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (pageUrl, index) => {
            try {
              const pageHtml = await this._fetchHtml(pageUrl);
              const $page = cheerio.load(pageHtml);
              const src = this._extractImageFromHtml($page);
              
              if (!src) return null;
              
              return {
                page: i + index + 1,
                url: this._fixUrl(src),
                headers: { 'Referer': this.baseUrl, 'User-Agent': this.headers['User-Agent'] }
              };
            } catch {
              return null;
            }
          })
        );
        images.push(...batchResults.filter(Boolean));
      }
      if (images.length === 0) {
        throw new ParseError("Unable to extract images from pages.");
      }
      return images;
    }catch (e){
      console.warn(e)
    }
    
  }

  _extractImageFromHtml($) {
    const sel = this.config.selectors.chapter.image;
    const $img = $(sel);
    if ($img.length) {
      const src = $img.attr('src') || $img.attr('data-src');
      if (src) return this._fixUrl(src);
    }
    return null;
  }

  async _fetchHtml(url) {
      try{
        const response = await fetch(url, { headers: this.headers });
        if (!response.ok) throw new HTTPError(`HTTP ${response.status} on ${url}`);
        return await response.text();
      } catch (error) {
      
        if (error instanceof HTTPError || error instanceof ParseError) {
          throw error;}
        throw new NetworkError(`Connection Error: ${error.message}`);
      }
    }

  _fixUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

}
export default new NoveCoolIT();