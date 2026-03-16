import * as cheerio from 'react-native-cheerio';
import { NetworkError, HTTPError, ParseError } from '../../errors/SourceErrors.js'; 
import config from './MangaRead.config.json' with {type: 'json'}; 


class MangaRead{
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
    try{
      const pagesToFetch = [1, 2]; 
      const sel = this.config.selectors.search;
      const pagePromises = pagesToFetch.map(async (pageNumber) => {
        try {
          // Usiamo l'impaginazione nativa di Madara (/page/X/)
          const searchUrl = `${this.baseUrl}/page/${pageNumber}/?s=${encodeURIComponent(query)}&post_type=wp-manga`;
          const html = await this._fetchHtml(searchUrl);
          const $ = cheerio.load(html);
          
          const pageResults = [];

          $(sel.resultCard).each((index, element) => {
            const $el = $(element);
            
            const $link = $el.find(sel.url);
            const title = $link.text().trim();
            const url = $link.attr('href');
            
            const $img = $el.find(sel.cover);
            const coverUrl = $img.attr('src') || $img.attr('data-src');

            if (url && url.includes('/manga/') && title) {
              const urlMatch = url.match(/\/manga\/([^\/]+)/);
              if (urlMatch) {
                pageResults.push({
                  id: urlMatch[1], 
                  slug: urlMatch[1],
                  title: title || urlMatch[1],
                  coverUrl: this._fixUrl(coverUrl),
                  source: this.name,
                });
              }
            }
          });
          
          return pageResults;
        } catch (err) {
          if (pageNumber > 1) {
            return [];
          }
          throw err;
        }
      });
      const allPagesResults = await Promise.all(pagePromises);
      const finalResults = allPagesResults.flat();
      if (finalResults.length === 0) {
        return [];
      }
      return finalResults;

    }catch(e){
      console.warn(`[MangaRead] Search error:`, e);
      throw e;
    }
  }
  async getMangaDetails(mangaId, slug) {
    try{
      const mangaUrl = `${this.baseUrl}/manga/${slug}/`;
      const html = await this._fetchHtml(mangaUrl);
      const $ = cheerio.load(html);
      const sel = this.config.selectors.manga;

      const title = $(sel.title).first().text().trim();
      const coverUrl = $(sel.cover).attr('src');
      const description = $(sel.description).eq(1).text().trim();
      const author = $(sel.author)
        .map((_, el) => $(el).text().trim())
        .get()
        .join(', ');

      let status = "";
      let year = "";
      $(sel.detailsContainer).each((_, el) => {
        const label = $(el).find(sel.detailsLabel).text().trim().toLowerCase();
        const value = $(el).find(sel.detailsValue).text().trim();
        if (label.includes("status")) status = value;
        else if (label.includes("release")) year = value;
      });

      const chapters = [];
      $(sel.chapterRow).each((i,el)=>{
        const $row = $(el);
        const $a = $row.find(sel.chapterLink);
        const href = $a.attr("href");
        const parts = href.replace(/\/$/, '').split('/');
        const chapterId = parts[parts.length - 1];
        const chTitle = $a.text().trim()
        const date = $row.find(sel.chapterDate).text().trim();
        const numMatch = chTitle.match(/chapter\s*(\d+(\.\d+)?)/i);
        const chapNum = numMatch ? numMatch[1] : null;

        if (chapterId) {
          chapters.push({
            id: chapterId,
            number: chapNum || '0',
            title: chTitle,
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
        description: description || "Description not available",
        author: author || "Unknown",
        status: status || "Unknown",
        year: year ||"Unknown",
        chapters: chapters
      };
    }catch(e){
      console.warn(e)
      throw e;
    }
  }

  async getChapterImages(mangaId, slug, chapterId) {
    try{
      const mangaUrl = `${this.baseUrl}/manga/${slug}/${chapterId}/`;
      const html = await this._fetchHtml(mangaUrl);
      const $ = cheerio.load(html);
      const sel = this.config.selectors.chapter;

      const images = [];
      $(sel.image).each((i,el)=>{
        const $img = $(el);
        if ($img.length) {
          const imgUrl = ($img.attr('src') || $img.attr('data-src')).trim();
          images.push({
            page: i + 1,
            url: this._fixUrl(imgUrl),
            headers: {
              'Referer': this.baseUrl,
              'User-Agent': this.headers['User-Agent']
            }
          });
        }
      });
      if (images.length === 0) {
        throw new ParseError("No pages found. Possible layout change.");
      }
      return images;
    } catch(e){
      console.warn(e)
      throw e;
    }
  }


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
  _fixUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    return `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }
}
export default new MangaRead();