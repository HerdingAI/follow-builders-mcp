---
type: plan
status: closed
phase: 3
reqs: [REQ-3, REQ-4]
approved: true
updated: 2026-09-13
depends_on: [contracts.md, context.md, ../../requirements.md]
summary: Retry what is worth retrying, bound the cost, and let one rate-limited source not cost the run.
---

# Phase 03 · Fetch resilience — Plan

## Goal

A transient upstream failure stops losing a source, and a rate limit stops losing every source after it. Retries are bounded by attempts and by time, and every skipped source is named in the run's errors.

## Out of scope

- how a run reports to an operator — phase 4
- jitter and multi-runner coordination — one process, a handful of sources
- changing which sources are fetched or what a feed contains

## Tasks

### Task 03.1 · A classifying fetch wrapper with bounded retries
- **reqs:** REQ-3, REQ-4
- **contracts:** 03:fetch-retry
- **depends on tasks:** []
- **files:** scripts/lib/fetch-retry.js, scripts/test/fetch-retry.test.js
- **goal:** one place that decides what is worth retrying, with the cost bounded and every path testable offline
- **action:** 1. `classify()` maps an outcome to ok, retryable, rate-limited or fatal. 2. `fetchWithRetry()` retries retryable outcomes with capped exponential backoff, honouring `Retry-After` when stated, bounded by attempts and a total budget. 3. it reports rather than throws. 4. `FetchReport` collects per-source outcomes and renders one line per problem source. 5. inject transport, sleep and clock so the suite needs no network and no credential.
- **verify:** cd scripts && npm test
- **done:** a 5xx and a network error retry; a 404 does not; a 429 is its own case and is not retried; the attempt count and the time budget both bound the work; a rate-limited source does not stop the others
- **deviation check:** retrying a rate limit by default; throwing for an upstream problem

### Task 03.2 · Route every upstream call through the wrapper
- **reqs:** REQ-3
- **contracts:** 03:fetch-retry
- **depends on tasks:** 03.1
- **files:** scripts/generate-feed.js
- **goal:** the real script stops losing a run to one bad response
- **action:** 1. replace every bare `fetch` in the fetch paths with `fetchWithRetry`. 2. replace the `break` on 429 with a `continue`, so a rate limit costs one account. 3. collect outcomes in a `FetchReport` per source family and append its messages to the run's errors.
- **verify:** cd scripts && npm test && node --check generate-feed.js
- **done:** no bare fetch remains in a fetch path, the 429 break is gone, and skipped sources reach the run's errors array
- **deviation check:** changing a feed shape or the selection logic while moving the call

## Manual acceptance

| REQ | Criterion | Task | Evidence |
|---|---|---|---|
| REQ-3 | A 5xx or a network error is retried, and a success on retry produces the same result as a first-attempt success. | 03.1 | fetch-retry.test.js: success on retry |
| REQ-3 | Retries are bounded: a permanently failing source cannot extend a run indefinitely. | 03.1 | fetch-retry.test.js: attempt bound and budget bound |
| REQ-3 | A 4xx that is not a rate limit is not retried. | 03.1 | fetch-retry.test.js: 404 not retried |
| REQ-3 | Rate limiting one source leaves the other sources fetched, and names the skipped one in the run's errors. | 03.2 | fetch-retry.test.js: four sources, one rate limited; the 429 break removed from generate-feed.js |
| REQ-4 | Upstream responses, including failures and rate limits, can be supplied by a test. | 03.1 | fetch-retry.test.js: scripted transport |

## Closing notes for the next planner

1. Phase 4 consumes `03:fetch-retry` for the classification and the attempt count. Both are in the returned object and in `FetchReport.entries`, not inferred from logs.
2. A fetch failure is reported, never thrown. Every call site now branches on the classification, which is deliberate: only the caller knows whether losing this source should cost the run.
3. The 429 policy is "skip, do not retry". That is right for a job with a next run in hours and wrong for an interactive tool; `retryRateLimit` exists for the latter.
