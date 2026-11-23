import { CancelledError, HTTPError, NetworkError } from '../../errors/SourceErrors.js';
import { createLimiter, sleep } from './asyncUtils.js';
import { devLog } from './devLog.js';
import { getHost, shortenUrl } from './urlUtils.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Request profiles: { timeout ms, max retries }
const REQUEST_PROFILES = {
  search:  { timeout: 8000,  retries: 0 },
  details: { timeout: 12000, retries: 1 },
  chapter: { timeout: 15000, retries: 2 },
};

const MAX_CONCURRENT_PER_HOST = 4;
const limiters = new Map();

function getLimiter(host) {
  if (!limiters.has(host)) limiters.set(host, createLimiter(MAX_CONCURRENT_PER_HOST));
  return limiters.get(host);
}

function backoffMs(attempt) {
  return Math.min(400 * 2 ** attempt, 4000) + Math.random() * 250;
}

// Fetches HTML from url with timeout, retry, host concurrency limit and optional signal.
export async function fetchHtml(url, options = {}) {
  if (options.signal?.aborted) throw new CancelledError();

  const profileName = options.profile || 'details';
  const profile = REQUEST_PROFILES[profileName] || REQUEST_PROFILES.details;
  const headers = { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8', ...options.headers };
  const host = getHost(url);
  const limiter = getLimiter(host);

  let lastError;

  for (let attempt = 0; attempt <= profile.retries; attempt++) {
    const t0 = Date.now();
    let outcome = 'ok';

    const result = await limiter.run(async () => {
      const internal = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; internal.abort(); }, profile.timeout);

      const onAbort = () => internal.abort();
      options.signal?.addEventListener('abort', onAbort, { once: true });

      try {
        const response = await fetch(url, { headers, signal: internal.signal });
        const text = await response.text();
        if (!response.ok) {
          throw new HTTPError(response.status, `HTTP ${response.status} on ${shortenUrl(url)}`);
        }
        return { ok: true, text, response };
      } catch (err) {
        if (options.signal?.aborted) return { ok: false, err: new CancelledError(), retryable: false };
        if (timedOut || (internal.signal.aborted && !options.signal?.aborted)) {
          return { ok: false, err: new NetworkError('Request timed out', { isTimeout: true }), retryable: true };
        }
        if (err instanceof HTTPError) {
          // Handle Retry-After on 429
          let retryAfter = 0;
          if (err.statusCode === 429) {
            const ra = parseInt((err.retryAfterHeader || ''), 10);
            if (!isNaN(ra)) retryAfter = Math.min(ra * 1000, 5000);
          }
          return { ok: false, err, retryable: err.retryable, retryAfter };
        }
        return { ok: false, err: new NetworkError(`Connection Error: ${err.message}`), retryable: true };
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', onAbort);
      }
    }, options.signal);

    const elapsed = Date.now() - t0;

    if (result.ok) {
      devLog('[http]', profileName, 'ok', elapsed + 'ms', 'attempt=' + attempt, shortenUrl(url));
      return result.text;
    }

    lastError = result.err;
    outcome = result.err?.name || 'error';
    devLog('[http]', profileName, outcome, elapsed + 'ms', 'attempt=' + attempt, shortenUrl(url));

    if (!result.retryable || attempt >= profile.retries) break;
    if (options.signal?.aborted) throw new CancelledError();

    const delay = result.retryAfter || backoffMs(attempt);
    await sleep(delay, options.signal);
  }

  throw lastError;
}
