---
type: summary
status: closed
phase: 3
updated: 2026-09-13
depends_on: [plan.md, contracts.md]
summary: Transient failures are retried within a bounded budget, and a rate limit costs one source instead of the run.
---

# Phase 03 · Fetch resilience — Summary

## Built

- `scripts/lib/fetch-retry.js` — `classify`, `fetchWithRetry` with capped backoff bounded by attempts and by time, `delayFor` honouring `Retry-After`, and `FetchReport` for per-source outcomes
- `scripts/test/fetch-retry.test.js` — ten cases covering every classification, both bounds, `Retry-After` including an unparseable one, a network error, and four sources of which one is rate limited
- `scripts/generate-feed.js` — every upstream call routed through the wrapper, the 429 `break` replaced with a `continue`, and skipped sources appended to the run's errors

## Not built (and why)

- **Jitter on the backoff.** One process fetching a handful of sources has no thundering herd to avoid.
- **Dropping a repeatedly rate-limited source.** Reported, not decided — that is an operator's call.
- **Honouring a long `Retry-After` by waiting.** The cap wins: a scheduled job with a next run in hours should not hold a runner for minutes.

## Deviations

| ADR | What changed | Affects phases |
|---|---|---|
| — | ran to plan | — |

## Gotchas

- The old `break` on a 429 was the worst bug in this file and the least visible: one rate-limited account silently dropped every account after it, and the only trace was a single non-fatal error line saying "skipping remaining accounts". Ordering made it arbitrary which builders lost their content.
- Attempt count alone is not a bound. A server stating `Retry-After: 9999` turns three attempts into hours, which is why there is a time budget too and why the header is capped.
- An unparseable `Retry-After` has to fall back to the backoff curve rather than to zero or to NaN. `Number("garbage")` is NaN, and `Math.min(NaN, cap)` is NaN, which would have become an immediate retry.
- Making the wrapper report instead of throw moved a decision to every call site. That is more code, and it is the right place: only the caller knows whether this source is load-bearing for the run.

## What the next planner must know

- Phase 4 consumes the classification and the attempt count from the returned object and from `FetchReport.entries` — not from log output.
- Every call site now branches on `classification !== "ok"`. A new upstream call that forgets to is a silent regression, and nothing catches it automatically.
- The transport seam is what makes the suite offline. Any new fetch must take the same parameter or the test suite starts needing network.

## Learnings promoted

| Candidate | Promoted to | Or rejected because |
|---|---|---|
| A loop that breaks on one source's failure silently drops every source after it | `learnings/break-drops-the-tail.md` | — |
| Bound retries by time as well as by count | `learnings/bound-retries-twice.md` | — |
| Inject the clock in every timing test | — | already covered by "separate the conversation from the writer" in the pw wiki — the same seam idea, and duplicating it here would dilute both |

## Acceptance

| REQ | Criterion | Status | Evidence |
|---|---|---|---|
| REQ-3 | A 5xx or a network error is retried, and a success on retry produces the same result as a first-attempt success. | pass | fetch-retry.test.js: success on retry |
| REQ-3 | Retries are bounded: a permanently failing source cannot extend a run indefinitely. | pass | fetch-retry.test.js: attempt bound and budget bound |
| REQ-3 | A 4xx that is not a rate limit is not retried. | pass | fetch-retry.test.js: 404 not retried |
| REQ-3 | Rate limiting one source leaves the other sources fetched, and names the skipped one in the run's errors. | pass | fetch-retry.test.js: four sources, one rate limited; the 429 break removed from generate-feed.js |
| REQ-4 | Upstream responses, including failures and rate limits, can be supplied by a test. | pass | fetch-retry.test.js: scripted transport |
