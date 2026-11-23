import { ParseError } from '../errors/SourceErrors.js';
import { devWarn } from './http/devLog.js';

/** Normalizes an array of search results. Drops entries with empty id or slug. */
export function normalizeSearchResults(results, sourceName) {
  if (!Array.isArray(results)) return [];

  const seen = new Set();
  const out = [];

  for (const r of results) {
    const id = String(r.id || '').trim();
    const slug = String(r.slug || '').trim();
    const title = String(r.title || '').trim();
    if (!id || !slug) { devWarn(`[${sourceName}] search result dropped: missing id or slug`); continue; }
    if (seen.has(id)) { devWarn(`[${sourceName}] search result dropped: duplicate id ${id}`); continue; }
    seen.add(id);
    out.push({ ...r, id, slug, title, coverUrl: r.coverUrl || null, source: sourceName });
  }

  return out;
}

// Normalizes manga details. Throws ParseError if title is empty.
export function normalizeDetails(details, sourceName) {
  const title = String(details.title || '').trim();
  if (!title) throw new ParseError(`[${sourceName}] details missing title`);

  const rawChapters = Array.isArray(details.chapters) ? details.chapters : [];
  const seen = new Set();
  const chapters = [];

  for (const ch of rawChapters) {
    const id = String(ch.id || '').trim();
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    chapters.push({
      ...ch,
      id,
      number: String(ch.number ?? '0'),
      title: String(ch.title || ''),
      url: ch.url ? String(ch.url) : null,
      date: String(ch.date || ''),
    });
  }

  if (chapters.length === 0) devWarn(`[${sourceName}] details has 0 chapters`);

  const first = chapters[0];
  const last = chapters[chapters.length - 1];
  if (first && last && chapters.length > 1) {
    if (parseFloat(first.number) < parseFloat(last.number)) {
      devWarn(`[${sourceName}] chapters appear to be in ascending order`);
    }
  }

  return {
    ...details,
    id: String(details.id),
    slug: String(details.slug),
    title,
    chapters,
  };
}

/**
 * Validates and optionally dedupes an array of raw page URL strings.
 * Throws ParseError if empty or below expectedCount.
 */
export function normalizePageUrls(urls, { expectedCount, dedupe = false, sourceName } = {}) {
  let filtered = (urls || []).filter(u => typeof u === 'string' && u.trim() !== '');

  if (dedupe) {
    const seen = new Set();
    filtered = filtered.filter(u => { if (seen.has(u)) return false; seen.add(u); return true; });
  }

  if (filtered.length === 0) throw new ParseError(`[${sourceName}] no page URLs found`);

  if (expectedCount != null) {
    if (filtered.length < expectedCount) {
      throw new ParseError(`[${sourceName}] expected ${expectedCount} pages but got ${filtered.length}`);
    }
    if (filtered.length > expectedCount) {
      devWarn(`[${sourceName}] got ${filtered.length} pages, expected ${expectedCount}`);
    }
  }

  return filtered;
}
