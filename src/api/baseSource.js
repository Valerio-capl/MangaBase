import { fetchHtml } from './http/httpClient.js';
import { fixUrl, isDataUri } from './http/urlUtils.js';
import { normalizeDetails, normalizePageUrls, normalizeSearchResults } from './sourceContract.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const BASE_PLACEHOLDER_PATTERNS = [
  /placeholder/i,
  /spinner/i,
  /ajax[-_]loader/i,
  /^loading/i,
  /^loader/i,
  /^blank\./i,
];

class BaseSource {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.baseUrl;
    this.name = config.name;
    this.lang = config.lang;
    this.headers = {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Referer': config.baseUrl,
    };
  }

  async searchManga() { throw new Error('not implemented'); }
  async getMangaDetails() { throw new Error('not implemented'); }
  async getChapterImages() { throw new Error('not implemented'); }

  async _fetchHtml(url, { profile = 'details', signal } = {}) {
    return fetchHtml(url, { headers: this.headers, signal, profile });
  }

  _fixUrl(url) {
    return fixUrl(url, this.baseUrl);
  }

  _imageHeaders(referer = this.baseUrl) {
    return { 'Referer': referer, 'User-Agent': UA };
  }

  get extraPlaceholderPatterns() { return []; }

  /**
   * Extracts the best image URL from a cheerio img element.
   * Tries data-src, data-lazy-src, data-original, src in order.
   * Skips data URIs, javascript:, and placeholder filenames.
   */
  _extractImageUrl($img) {
    const attrs = ['data-src', 'data-lazy-src', 'data-original', 'src'];
    for (const attr of attrs) {
      const val = ($img.attr(attr) || '').trim();
      if (!val) continue;
      if (isDataUri(val)) continue;
      if (val.toLowerCase().startsWith('javascript:')) continue;

      const filename = val.split('?')[0].split('/').pop() || '';
      if (BASE_PLACEHOLDER_PATTERNS.some(rx => rx.test(filename))) continue;
      if (this.extraPlaceholderPatterns.some(rx => rx.test(val))) continue;

      return val;
    }
    return null;
  }

  _finalizeSearch(results) {
    return normalizeSearchResults(results, this.name);
  }

  _finalizeDetails(details) {
    return normalizeDetails(details, this.name);
  }

  _finalizePages(rawUrls, { expectedCount, dedupe = false, referer } = {}) {
    const fixed = (rawUrls || []).map(u => this._fixUrl(u)).filter(Boolean);
    const validated = normalizePageUrls(fixed, { expectedCount, dedupe, sourceName: this.name });
    return validated.map((url, i) => ({
      page: i + 1,
      url,
      headers: this._imageHeaders(referer),
    }));
  }
}

export default BaseSource;
