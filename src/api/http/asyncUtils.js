import { CancelledError } from '../../errors/SourceErrors.js';

/** Waits ms milliseconds, rejects with CancelledError if signal is aborted. */
export function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new CancelledError()); return; }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new CancelledError());
    }, { once: true });
  });
}

export function createLimiter(maxConcurrent) {
  let active = 0;
  const queue = [];

  function next() {
    if (active >= maxConcurrent || queue.length === 0) return;
    const { task, signal, resolve, reject } = queue.shift();
    if (signal?.aborted) { reject(new CancelledError()); next(); return; }
    active++;
    Promise.resolve()
      .then(() => task())
      .then(resolve, reject)
      .finally(() => { active--; next(); });
  }

  return {
    run(task, signal) {
      return new Promise((resolve, reject) => {
        queue.push({ task, signal, resolve, reject });
        next();
      });
    },
  };
}

/**
 * Runs worker(item, index, signal) over items with a sliding window of limit.
 * Returns an array of { status: 'fulfilled'|'rejected', value?, reason? }.
 * Aborted-but-unstarted items are rejected with CancelledError.
 */
export async function runWithConcurrency(items, limit, worker, signal) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runOne() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      if (signal?.aborted) {
        results[i] = { status: 'rejected', reason: new CancelledError() };
        continue;
      }
      try {
        const value = await worker(items[i], i, signal);
        results[i] = { status: 'fulfilled', value };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, runOne);
  await Promise.all(workers);
  return results;
}
