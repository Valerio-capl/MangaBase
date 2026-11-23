# Source Module Template

This document describes the standard pattern for adding a new source to MangaBase.

---

## 1. Structure

Each source is a class that extends `BaseSource` (`src/api/baseSource.js`). The class reads its configuration from a matching `.config.json` file and must not reimplement `_fetchHtml`, `_fixUrl`, or `_extractImageUrl`.

```js
import * as cheerio from 'react-native-cheerio';
import BaseSource from '../baseSource.js';
import config from './MySource.config.json' with { type: 'json' };

class MySource extends BaseSource {
  constructor() {
    super(config); // sets this.config, this.baseUrl, this.name, this.lang, this.headers
  }
  // ...
}
export default new MySource();
```

---

## 2. Required Methods

All three methods accept an optional `options` object as their last parameter. Always forward `options.signal` to every `_fetchHtml` call.

### `searchManga(query, options = {})`

```js
async searchManga(query, options = {}) {
  const html = await this._fetchHtml(url, { profile: 'search', signal: options.signal });
  // parse results...
  return this._finalizeSearch(results); // validates and dedupes
}
```

### `getMangaDetails(mangaId, slug, options = {})`

```js
async getMangaDetails(mangaId, slug, options = {}) {
  const html = await this._fetchHtml(url, { profile: 'details', signal: options.signal });
  // parse details...
  return this._finalizeDetails({ id, slug, title, coverUrl, description, author, year, status, chapters });
}
```

### `getChapterImages(mangaId, slug, chapterId, options = {})`

```js
async getChapterImages(mangaId, slug, chapterId, options = {}) {
  const html = await this._fetchHtml(url, { profile: 'chapter', signal: options.signal });
  // collect rawUrls string array...
  return this._finalizePages(rawUrls, { referer: url }); // maps to { page, url, headers }
}
```

---

## 3. Request Profiles

Pass the correct profile to `_fetchHtml` to get the right timeout and retry count:

| Profile    | Timeout | Retries |
|------------|---------|---------|
| `search`   | 8 s     | 0       |
| `details`  | 12 s    | 1       |
| `chapter`  | 15 s    | 2       |

---

## 4. Finalize Helpers

| Helper | Purpose |
|--------|---------|
| `_finalizeSearch(results)` | Trims fields, filters missing id/slug, dedupes by id |
| `_finalizeDetails(details)` | Throws ParseError if title empty, normalizes chapters |
| `_finalizePages(rawUrls, opts)` | Applies `_fixUrl`, validates count, maps to page objects |

Options for `_finalizePages`:
- `referer` — sets the `Referer` header on each page object
- `dedupe` — removes duplicate URLs (default false)
- `expectedCount` — throws ParseError if fewer URLs are found

---

## 5. Image Extraction

Use `this._extractImageUrl($img)` on a cheerio img element. It tries `data-src`, `data-lazy-src`, `data-original`, `src` in order, skipping data URIs, `javascript:` values, and common placeholder filenames.

To skip additional placeholder patterns, override `get extraPlaceholderPatterns()` and return an array of regex objects tested against the full URL.

---

## 6. Error Rules

- Never return `[]` or `undefined` from a catch block. Always rethrow.
- Do not add silent catch blocks that discard errors.
- `ParseError`, `NetworkError`, and `HTTPError` from `src/errors/SourceErrors.js` are the only error types to throw.
- `CancelledError` is thrown automatically by the HTTP client when a signal is aborted; do not catch and suppress it.

---

## 7. Contract Invariants

- **Search result:** `id` (string), `slug`, `title`, `coverUrl` (string or null), `source`.
- **Details:** `id`, `slug`, `title`, `coverUrl`, `description`, `author`, `year`, `status`, `chapters`.
- **Chapter:** `id`, `number` (string), `title`, `url`, `date`. Order must be newest-first.
- **Page:** `page` (integer from 1, consecutive), `url`, `headers` with `Referer` and `User-Agent`.
- NoveCool uses the chapter URL as `id` — do not change this.
