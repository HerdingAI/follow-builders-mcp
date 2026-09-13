---
type: context
status: closed
phase: 3
updated: 2026-09-13
depends_on: [../../spine.md, ../../roadmap.md]
summary: Locked preferences for fetch resilience: classify then decide, bound the cost, inject the transport.
---

# Phase 03 · Fetch resilience — Context

The only place this phase's technology choices are made (INV-1).

## Decisions

### D-01 · Classify an outcome into ok, retryable, rate-limited or fatal before deciding anything
- **why:** the old code branched on `res.ok` and then special-cased 429 inline, which is how a rate limit came to abandon the whole run. Naming four cases makes the policy reviewable and each branch testable
- **alternatives:** retry everything that is not 2xx — rejected, it hammers a 404 and a revoked credential; retry nothing — that is the current defect
- **reversible:** cheap — the classifier is one function

### D-02 · A rate limit is not retried by default; it skips that source
- **why:** retrying into a rate limit is what earns a longer one, and the run has other sources to fetch. The source is reported skipped so the gap is visible
- **alternatives:** honour Retry-After and wait — rejected for a scheduled job that has a next run in hours; hammer — actively harmful
- **reversible:** cheap, behind the `retryRateLimit` flag that already exists

### D-03 · Retries are bounded twice: by attempt count and by a total time budget
- **why:** attempt count alone is not a bound when a server states a long Retry-After; a scheduled job must not hold a runner
- **alternatives:** attempts only — rejected, a cooperative server can stall us for minutes
- **reversible:** cheap

### D-04 · The transport and the clock are parameters, not imports
- **why:** REQ-4 requires every path — including a rate limit and a network reset — to be testable offline with no credential. Injecting both is what makes that possible without a mocking library
- **alternatives:** a mocking library — rejected, it adds a dependency to test two parameters; hit a sandbox API — rejected, it makes the suite need network and a key
- **reversible:** one-way in spirit: the tests now depend on the seam

### D-05 · A fetch failure is reported, never thrown
- **why:** the caller is the only code that knows whether losing this source should cost the run, and an exception takes that decision away from it
- **alternatives:** throw and let callers catch — rejected, it is the same decision with more ceremony and an easier mistake
- **reversible:** costly — every call site branches on the classification

## Parked questions

| # | Question | Default for now | What closes it |
|---|---|---|---|
| P-01 | Should the backoff be jittered? | no — one process fetching a handful of sources has no thundering herd | a second concurrent runner |
| P-02 | Should a repeatedly rate-limited source be dropped from the source list? | no — report it and let a human decide | an operator asking for it |

## Prior art read

- The existing fetch calls in `scripts/generate-feed.js` — every one of them, including the `break` on 429 that this phase removes
- Phase 1's injectable-clock pattern in the state store tests, reused here for the backoff

## Does not decide

- how a run reports its outcome to an operator — phase 4 owns that, and consumes this phase's classification
