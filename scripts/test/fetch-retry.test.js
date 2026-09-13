// Fetch resilience: what is retried, what is not, and what a run reports.
// Entirely offline — the transport and the clock are injected (REQ-4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithRetry, classify, delayFor, FetchReport, DEFAULTS } from '../lib/fetch-retry.js';

const res = (status, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
});

/** A transport that replays a scripted sequence and records what it was asked. */
function scripted(...steps) {
  const calls = [];
  const t = async (url) => {
    calls.push(url);
    const step = steps[Math.min(calls.length - 1, steps.length - 1)];
    if (step instanceof Error) throw step;
    return step;
  };
  t.calls = calls;
  return t;
}
const noSleep = () => { let slept = 0; const fn = async (ms) => { slept += ms; }; fn.total = () => slept; return fn; };

test('classification: 5xx and network errors retry, 429 is its own case, other 4xx are fatal', () => {
  assert.equal(classify({ response: res(200) }), 'ok');
  assert.equal(classify({ response: res(503) }), 'retryable');
  assert.equal(classify({ response: res(500) }), 'retryable');
  assert.equal(classify({ response: res(408) }), 'retryable');
  assert.equal(classify({ response: res(429) }), 'rate-limited');
  assert.equal(classify({ response: res(404) }), 'fatal');
  assert.equal(classify({ response: res(401) }), 'fatal');
  assert.equal(classify({ error: new Error('ECONNRESET') }), 'retryable');
});

test('a success on retry is indistinguishable from a first-attempt success', async () => {
  const transport = scripted(res(503), res(200));
  const r = await fetchWithRetry('u', {}, { transport, sleep: noSleep() });
  assert.equal(r.classification, 'ok');
  assert.equal(r.attempts, 2);
  assert.equal(r.response.status, 200);

  const direct = await fetchWithRetry('u', {}, { transport: scripted(res(200)), sleep: noSleep() });
  assert.equal(direct.classification, r.classification);
  assert.equal(direct.response.status, r.response.status);
});

test('retries are bounded: a permanently failing source cannot extend a run', async () => {
  const transport = scripted(res(503));
  const sleep = noSleep();
  const r = await fetchWithRetry('u', {}, { transport, sleep, attempts: 3 });
  assert.equal(r.attempts, 3, 'exactly the configured attempts, no more');
  assert.equal(transport.calls.length, 3);
  assert.equal(r.classification, 'retryable', 'and it reports the failure rather than throwing');
});

test('the total budget stops a retry that would exceed it', async () => {
  let clock = 0;
  const transport = scripted(res(503));
  const r = await fetchWithRetry('u', {}, {
    transport, attempts: 10, baseDelayMs: 1000, totalBudgetMs: 1500,
    sleep: async (ms) => { clock += ms; }, now: () => clock,
  });
  assert.ok(r.attempts < 10, `stopped early at ${r.attempts} attempts`);
  assert.ok(clock <= 1500, `slept ${clock}ms, budget 1500ms`);
});

test('a 4xx that is not a rate limit is not retried', async () => {
  const transport = scripted(res(404));
  const r = await fetchWithRetry('u', {}, { transport, sleep: noSleep() });
  assert.equal(r.attempts, 1);
  assert.equal(r.classification, 'fatal');
  assert.equal(transport.calls.length, 1, 'a 404 is our mistake; retrying it is pointless');
});

test('a rate limit is not retried by default, and is reported as its own case', async () => {
  const transport = scripted(res(429));
  const r = await fetchWithRetry('u', {}, { transport, sleep: noSleep() });
  assert.equal(r.attempts, 1);
  assert.equal(r.classification, 'rate-limited');
});

test('Retry-After wins over the backoff curve, capped at the maximum', () => {
  const o = { baseDelayMs: 500, maxDelayMs: 8000 };
  assert.equal(delayFor(1, o), 500);
  assert.equal(delayFor(2, o), 1000);
  assert.equal(delayFor(9, o), 8000, 'capped');
  assert.equal(delayFor(1, o, res(429, { 'retry-after': '3' })), 3000);
  assert.equal(delayFor(1, o, res(429, { 'retry-after': '9999' })), 8000, 'a server cannot stall us forever');
  assert.equal(delayFor(1, o, res(429, { 'retry-after': 'garbage' })), 500, 'an unparseable header falls back');
});

test('a network error is retried and the message is reported, not thrown', async () => {
  const transport = scripted(new Error('ECONNRESET'), res(200));
  const r = await fetchWithRetry('u', {}, { transport, sleep: noSleep() });
  assert.equal(r.classification, 'ok');
  assert.equal(r.attempts, 2);

  const dead = await fetchWithRetry('u', {}, { transport: scripted(new Error('EAI_AGAIN')), sleep: noSleep(), attempts: 2 });
  assert.equal(dead.classification, 'retryable');
  assert.equal(dead.error, 'EAI_AGAIN', 'the caller gets the reason without a try/catch');
});

test('rate limiting one source leaves the others fetched, and names the skipped one', async () => {
  const report = new FetchReport();
  const outcomes = { alice: res(200), bob: res(429), carol: res(200), dave: res(503) };
  for (const [source, response] of Object.entries(outcomes)) {
    report.record(source, await fetchWithRetry(source, {}, {
      transport: scripted(response), sleep: noSleep(), attempts: 2,
    }));
  }
  assert.equal(report.entries.length, 4, 'every source was attempted — none abandoned the run');
  assert.deepEqual(report.rateLimited.map((e) => e.source), ['bob']);
  assert.deepEqual(report.skipped.map((e) => e.source).sort(), ['bob', 'dave']);
  const messages = report.messages('X API: ');
  assert.ok(messages.some((m) => m.includes('bob') && m.includes('rate limited')));
  assert.ok(messages.some((m) => m.includes('dave') && m.includes('after 2 attempt')));
  assert.ok(messages.every((m) => m.startsWith('X API: ')));
});

test('the defaults are conservative enough to be safe in a scheduled job', () => {
  assert.ok(DEFAULTS.attempts <= 3, 'a scheduled job should not retry many times');
  assert.ok(DEFAULTS.totalBudgetMs <= 30_000, 'nor hold a runner for long');
  assert.equal(DEFAULTS.retryRateLimit, false, 'and never hammer a rate limit by default');
});
