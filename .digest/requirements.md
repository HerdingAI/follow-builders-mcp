---
type: requirements
status: draft
updated: 2026-09-13
depends_on: [spine.md]
summary: REQ-1..REQ-5 — capabilities of Follow Builders digest with acceptance criteria.
---

# Requirements

Layer 1. Capability level, with stable ids. **No implementation choices on this page** (INV-1).

Priority: **P0** the system does not work without it · **P1** strongly improves it · **P2** design
for it, do not build it.

| Id | Capability | Pri | Phase(s) |
|---|---|---|---|
| REQ-1 | Deduplication survives a crash | P0 | 1 |
| REQ-2 | Content is marked seen only once it is published | P0 | 2 |
| REQ-3 | A transient upstream failure does not lose a run | P0 | 3 |
| REQ-4 | The fetch layer is testable without the network | P1 | 1, 2, 3 |
| REQ-5 | A run reports what it did and why | P1 | 4 |

---

## REQ-1 · Deduplication survives a crash `P0`

The seen state is always readable and always complete. A run interrupted at any point leaves a valid state file, and a corrupted file is detected and reported rather than silently treated as empty.

### Acceptance criteria

- [ ] A write interrupted partway leaves the previous state intact and readable.
- [ ] A corrupted state file is reported as an error, and the run refuses rather than proceeding with empty state.
- [ ] Two concurrent writers cannot interleave a write.
- [ ] Pruning removes only entries older than the retention window, and never the whole file.


## REQ-2 · Content is marked seen only once it is published `P0`

An item is recorded as seen only after the feed containing it has been written successfully. A failure between fetching and publishing leaves the item unseen, so the next run can feature it.

### Acceptance criteria

- [ ] A failure after fetching but before the feed is written leaves no item marked seen.
- [ ] A failure after the feed is written but before state is saved does not cause the next run to re-feature published content.
- [ ] An item appears in exactly one published feed across any sequence of runs and failures.


## REQ-3 · A transient upstream failure does not lose a run `P0`

A retryable upstream response is retried with backoff, within a bounded budget. Rate limiting skips the affected source rather than abandoning the remaining ones, and every skipped source is reported.

### Acceptance criteria

- [ ] A 5xx or a network error is retried, and a success on retry produces the same result as a first-attempt success.
- [ ] Retries are bounded: a permanently failing source cannot extend a run indefinitely.
- [ ] A 4xx that is not a rate limit is not retried.
- [ ] Rate limiting one source leaves the other sources fetched, and names the skipped one in the run's errors.


## REQ-4 · The fetch layer is testable without the network `P1`

Every behaviour above can be exercised in a test without reaching an upstream API or holding a credential.

### Acceptance criteria

- [ ] The test suite runs offline, with no credential set, and passes.
- [ ] Upstream responses, including failures and rate limits, can be supplied by a test.


## REQ-5 · A run reports what it did and why `P1`

An operator reading a run's output can tell an empty digest caused by nothing new from an empty digest caused by a failure.

### Acceptance criteria

- [ ] A run that fetched nothing new and a run that failed to fetch are distinguishable from the output alone.
- [ ] Every skipped or failed source appears in the run's report with the reason.
