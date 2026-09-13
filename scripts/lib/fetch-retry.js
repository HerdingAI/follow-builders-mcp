// ============================================================================
// Fetch with bounded retries
// ============================================================================
// Contract 03:fetch-retry.
//
// A transient upstream failure used to lose a whole source for a run, and a
// rate limit used to abandon every source after it. This module classifies a
// response, retries only what is worth retrying, and bounds the cost so a
// permanently failing source cannot extend a run indefinitely.
//
// The transport and the clock are injectable so every path — including rate
// limits and network errors — is testable offline with no credential.
// ============================================================================

/** @typedef {'ok'|'retryable'|'rate-limited'|'fatal'} Classification */

export const DEFAULTS = {
  attempts: 3,            // one try plus two retries
  baseDelayMs: 500,
  maxDelayMs: 8_000,
  totalBudgetMs: 20_000,  // a permanently failing source cannot outlast this
  retryRateLimit: false,  // a rate limit is a signal to back off, not to hammer
};

/**
 * Classify an outcome. A thrown error is a network failure and is retryable;
 * a 429 is its own case so the caller can skip the source rather than retry or die.
 * @returns {Classification}
 */
export function classify({ response, error }) {
  if (error) return 'retryable';
  if (!response) return 'fatal';
  if (response.ok) return 'ok';
  if (response.status === 429) return 'rate-limited';
  if (response.status >= 500) return 'retryable';
  if (response.status === 408) return 'retryable';      // request timeout
  return 'fatal';                                        // every other 4xx is our mistake, not theirs
}

/** Exponential backoff, capped. `Retry-After` wins when the server states one. */
export function delayFor(attempt, { baseDelayMs, maxDelayMs }, response = null) {
  const stated = Number(response?.headers?.get?.('retry-after'));
  if (Number.isFinite(stated) && stated > 0) return Math.min(stated * 1000, maxDelayMs);
  return Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
}

/**
 * Fetch with bounded retries.
 *
 * Never throws for an upstream problem — it reports one, so a caller can decide
 * whether losing this source should cost the run.
 *
 * @returns {Promise<{response: object|null, classification: Classification, attempts: number,
 *                    elapsedMs: number, error: string|null}>}
 */
export async function fetchWithRetry(url, init = {}, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const transport = o.transport || fetch;
  const sleep = o.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const now = o.now || (() => Date.now());

  const started = now();
  let attempts = 0;
  let last = { response: null, classification: 'fatal', error: null };

  while (attempts < o.attempts) {
    attempts++;
    let response = null, error = null;
    try {
      response = await transport(url, init);
    } catch (err) {
      error = err;
    }
    const classification = classify({ response, error });
    last = { response, classification, error: error ? error.message : null };

    if (classification === 'ok' || classification === 'fatal') break;
    if (classification === 'rate-limited' && !o.retryRateLimit) break;
    if (attempts >= o.attempts) break;

    const wait = delayFor(attempts, o, response);
    // Honour the budget: a retry that would exceed it is not worth starting.
    if (now() - started + wait > o.totalBudgetMs) break;
    await sleep(wait);
  }

  return { ...last, attempts, elapsedMs: now() - started };
}

/**
 * Collect per-source outcomes so a run can report what it skipped and why.
 * A rate limit marks the source skipped without stopping the others.
 */
export class FetchReport {
  constructor() { this.entries = []; }
  record(source, result) {
    this.entries.push({
      source,
      classification: result.classification,
      attempts: result.attempts,
      status: result.response?.status ?? null,
      error: result.error,
    });
    return result;
  }
  get skipped() { return this.entries.filter((e) => e.classification !== 'ok'); }
  get rateLimited() { return this.entries.filter((e) => e.classification === 'rate-limited'); }
  /** One line per problem source, for the run's errors array. */
  messages(prefix = '') {
    return this.skipped.map((e) => {
      const why = e.classification === 'rate-limited' ? 'rate limited'
        : e.classification === 'retryable' ? `still failing after ${e.attempts} attempt(s)`
        : 'failed';
      const detail = e.status ? `HTTP ${e.status}` : e.error || 'unknown';
      return `${prefix}${e.source}: ${why} (${detail})`;
    });
  }
}
