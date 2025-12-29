import * as cheerio from 'react-native-cheerio';
import { NetworkError, HTTPError, ParseError } from '../../errors/SourceErrors.js';
import config from './MangaKatana.config.json' with {type: 'json'};

class MangaKatana {
    constructor() {
        this.config = config;
        this.baseUrl = this.config.baseUrl;
        this.name = this.config.name;
        this.lang = this.config.lang; // MangaKatana è in inglese
        
        this.headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': this.baseUrl,
        };
    }

    async searchManga(query){
        try{
            const searchUrl = `${this.baseUrl}/?search=${encodeURIComponent(query)}&search_by=book_name`;
            const html = await this._fetchHtml(searchUrl);
            const $ = cheerio.load(html);
            const results = []

            const sel = this.config.selectors.search;
            $(sel.resultCard).each((index, element) => {
                const $el = $(element);
                const $link = $el.find(sel.title);
                const title = $link.text().trim();
                const url = $link.attr('href');
                const $img = $el.find(sel.cover);
                const coverUrl = $img.attr('src') || $img.attr('data-src');

                // Pattern URL: /manga/slug.id (es: /manga/vagabond.3120)
                if (url) {
                    const match = url.match(/\/manga\/([^.]+)\.(\d+)$/);
                    if (match) {
                        results.push({
                            id: match[2],
                            slug: match[1],
                            title: title,
                            coverUrl: this._fixUrl(coverUrl),
                            source: this.name,
                        });
                    }
                }
        });
        
        return results;
        }catch(e){
            console.warn(`[MangaKatana] Search error: ${e.message}`);
            return [];
        }
    }
    async getMangaDetails(mangaId,slug){
        try{
            const mangaUrl = `${this.baseUrl}/manga/${slug}.${mangaId}`;
            const html = await this._fetchHtml(mangaUrl);
            const $ = cheerio.load(html);
            const sel = this.config.selectors.manga;

            const title = $(sel.title).text().trim();
            const coverUrl = $(sel.cover).attr('src');
            const description = $(sel.description).text().trim();
            let author = "";
            let artist = "";
            let status = "";

            $('.meta .d-row-small').each((i, el) => {
                const $el = $(el);
                const label = $el.find(sel.metaLabel).text().toLowerCase().trim();
                const $value = $el.find(sel.metaValue);

                if (label.includes('author') || label.includes('artist')) {
                    const authorsList = $value.find('a').map((_, a) => $(a).text().trim()).get();
                    author = authorsList.join(', ');
                }
                else if (label.includes('status')) {
                    status = $value.text().trim();
                }    
            });

            const chapters = [];
            $(sel.chapterRow).each((i,el)=>{
                const $row = $(el);
                const $link = $row.find(sel.chapterLink);

                if ($link.length) {
                    const href = $link.attr('href');
                    const rawTitle = $link.text().trim();
                    const dateText = $row.find(sel.chapterDate).text().trim();

                    const parts = href.split('/');
                    const chapterId = parts[parts.length - 1];

                    let chapNum = null;
                    const numMatch = rawTitle.match(/Chapter\s*(\d+(\.\d+)?)/i) || rawTitle.match(/(\d+(\.\d+)?)/);
                    if (numMatch) chapNum = numMatch[1];

                    if (chapterId && chapNum) {
                        chapters.push({
                            id: chapterId,
                            number: chapNum || '0',
                            title: rawTitle,
                            url: this._fixUrl(href),
                            date: dateText
                        });
                    }
                }
            });
            return {
                id: mangaId,
                slug: slug,
                title: title,
                coverUrl: this._fixUrl(coverUrl),
                description: description || "Descrizione non disponibile",
                author: author || "Sconosciuto",
                status: status || "Sconosciuto",
                year: "Sconosciuto",
                chapters: chapters,
            };
        }catch(e){
            throw e;
        }
    }

    async getChapterImages(mangaId,slug,chapterId){
        try{
            const chapterUrl = `${this.baseUrl}/manga/${slug}.${mangaId}/${chapterId}`;
            const html = await this._fetchHtml(chapterUrl);
            let images = [];
            let urls = null;

            const parseScriptArray = (sourceHtml, varName) => {
                // var thzq o ytaw
                const regex = new RegExp(`var\\s+${varName}\\s*=\\s*(\\[[^\;]+\\])`);
                const match = sourceHtml.match(regex);
                if (match) {
                    try {
                        let jsonStr = match[1].replace(/'/g, '"').replace(/,\s*\]/, ']');
                        const urls = JSON.parse(jsonStr);
                        return urls;
                    } catch (e) {
                        console.warn(`Errore parsing ${varName}:`, e);
                    }
                }
                return null;
            };
            const scriptVars = this.config.selectors.chapter.scriptVars;
            for (const varName of scriptVars) {
                const foundUrls = parseScriptArray(html, varName);
                if (foundUrls && foundUrls.length > (urls ? urls.length : 0)) {
                    urls = foundUrls;
                    if (urls.length > 1) break; 
                }
            }
            if (urls && urls.length > 0) {
                images = urls.map((url, i) => ({
                    page: i + 1,
                    url: url,
                    headers: { 
                        'Referer': this.baseUrl,
                        'User-Agent': this.headers['User-Agent'] 
                    }
                }));
            } else {
                const $ = cheerio.load(html);
                $(this.config.selectors.chapter.imagesDOM).each((index, element) => {
                    const $img = $(element);
                    let imgUrl=$img.attr('data-src')||$img.attr('src');
                    if (imgUrl) imgUrl = imgUrl.trim();
                    if (imgUrl && imgUrl !== '#' && imgUrl.startsWith('http')){
                        images.push({
                            page: index + 1,
                            url: imgUrl,
                            headers: { 
                                'Referer': this.baseUrl,
                                'User-Agent': this.headers['User-Agent'] 
                            }
                        });
                    }
                });
            }
            if (images.length === 0) {
                return []
            }
            return images;

        }catch(e){
            console.error('Errore caricamento immagini MK:', e);
            return [];
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
            throw new NetworkError(`Errore di connessione: ${error.message}`);
        }
        }
    _fixUrl(url) {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        if (url.startsWith('//')) return `https:${url}`;
        return `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }
}
export default new MangaKatana();