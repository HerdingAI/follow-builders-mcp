---
type: contract
status: closed
phase: 3
contract_status: firm
updated: 2026-09-13
depends_on: [../../roadmap.md]
summary: what phase 03 (Fetch resilience) exposes to later phases and consumes from earlier ones.
---

# Phase 03 · Contracts

**Firm.** Firmed 2026-09-13 with the phase 03 plan; later phases may rely on it.

## exposes

### 03:fetch-retry
- **kind:** interface
- **shape:** `classify({ response, error }) -> "ok"|"retryable"|"rate-limited"|"fatal"`;
  `fetchWithRetry(url, init, { attempts, baseDelayMs, maxDelayMs, totalBudgetMs, retryRateLimit,
  transport, sleep, now }) -> { response, classification, attempts, elapsedMs, error }` which never
  throws for an upstream problem; `delayFor(attempt, opts, response)` honouring `Retry-After` under
  the cap; and a `FetchReport` collecting per-source outcomes with `.skipped`, `.rateLimited` and
  `.messages(prefix)`. Defaults: 3 attempts, 500ms base, 8s cap, 20s total budget, rate limits not retried.
- **stability:** firm


## consumes

_Nothing. Phase 3 depends on no earlier phase's surface._
