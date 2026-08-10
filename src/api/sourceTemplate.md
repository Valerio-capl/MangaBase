# Source Module Template and Data Flow Architecture

This document outlines the standard structural blueprint and data flow pattern required for any custom source provider module within the `/src/api/` directory. Based on robust scraper implementations, each module must follow an object-oriented class architecture configured externally via a matching JSON configuration file.

---

## 1. General Class Structure & Initialization

Every provider module must be implemented as a class that initializes using its corresponding configuration file (`.config.json`). It should expose standard request headers (including a realistic `User-Agent`, `Accept` parameters, and `Referer`) and implement built-in network and URL-normalization helper methods.

* **Configuration Handling:** Extracts base URLs, source names, language codes, and custom HTML/CSS selectors directly from the configuration file.
* **Network Execution (`_fetchHtml`):** Manages HTTP requests centrally, wrapping native fetch operations with custom error types (`HTTPError`, `NetworkError`, `ParseError`) to handle status validation and connectivity issues uniformly.
* **URL Normalization (`_fixUrl`):** Ensures relative paths, protocol-relative links (`//`), and absolute URLs are correctly mapped back to the provider's base domain.

---

## 2. Standard Methods and Data Flow Architecture

### A. `searchManga(query)`
This method handles user queries by requesting the provider's search endpoint and mapping raw HTML elements into a unified metadata structure.

* **Data Flow & Logic:**
  1. **URL Construction:** Encodes the search query string and appends it to the provider's search path (supporting standard query parameters or pagination structures like `/page/X/`).
  2. **Fetching & Parsing:** Retrieves the HTML payload and loads it into an HTML parser instance (cheerio).
  3. **Card Iteration:** Iterates through container elements defined in the configuration selectors (`search.resultCard`).
  4. **Extraction:** Extracts target attributes, specifically looking for title texts, destination links (`href`), and cover image sources (`src` or `data-src`).
  5. **ID/Slug Regularization:** Parses target URLs using regular expressions to isolate unique identifiers and slugs.
  6. **Mapping:** Returns a clean array of objects containing `id`, `slug`, `title`, `coverUrl` (normalized via `_fixUrl`), and `source`.

### B. `getMangaDetails(mangaId, slug)`
This method retrieves comprehensive metadata for a specific title, including publication details, status, description, and the complete chapter index.

* **Data Flow & Logic:**
  1. **Target Routing:** Builds the precise title endpoint using the provided `mangaId` and/or `slug`.
  2. **Metadata Scraping:** Extracts primary elements like the main title, cover image, and full description.
  3. **Detail Containers:** Iterates through descriptive info panels (author, release year, serialization status) dynamically matching text labels to populate corresponding metadata fields.
  4. **Chapter Parsing (`_parseChapters`):** Processes the structural list of chapters. For each entry, it extracts:
     * Relative or absolute links to build individual chapter target keys (`id`).
     * Raw titles or text strings, parsing them to calculate clean chapter numbers.
     * Publication dates where available.
  5. **Response Object:** Returns a fully hydrated object containing metadata parameters alongside an ordered array of chapters.

### C. `getChapterImages(mangaId, slug, chapterId)`
This method handles single or multi-page chapter endpoints to compile an ordered sequence of image URLs and their required request headers.

* **Data Flow & Logic:**
  1. **Endpoint Resolution:** Constructs the chapter viewing URL.
  2. **Pagination Discovery:** Scans the initial response to identify total pages or page selection dropdown elements to determine layout depth.
  3. **Batch Retrieval / Extraction:** 
     * Extracts image source links matching predefined configuration image selectors, filtering out placeholder assets.
     * For multi-page setups, handles sequential or batched page requests (`Promise.all` chunks) to gather remaining image elements concurrently.
  4. **Sorting & Output:** Assembles an array of page structures containing the page index, normalized image `url`, and customized request headers (passing specific `Referer` and `User-Agent` configurations required by host image delivery systems), sorted sequentially.