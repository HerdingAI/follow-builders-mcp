---
type: summary
status: closed
phase: 2
updated: 2026-09-13
depends_on: [plan.md, contracts.md]
summary: Marks are committed only once the feed is on disk, and a crash between the two is reconciled from the feed.
---

# Phase 02 · Publish atomicity — Summary

## Built

- `scripts/lib/publish.js` — `publish()` with write-ahead marks, `reconcile()` resolving a pending entry from the published feed, `feedIds()` reading both feed shapes
- `scripts/lib/state-store.js` — `writeAtomic` extracted so feeds and state are written identically; the pending section carried through pruning
- `scripts/test/publish.test.js` — both crash directions, a stale feed, pending surviving a prune, and an exactly-once sequence across run-crash-run
- `scripts/generate-feed.js` — fetch collects marks, reconciliation runs before fetching, each feed publishes through the step

## Not built (and why)

- **Expiry for a pending entry.** Reconciliation resolves it on the next run; a stuck entry means the next run never happened, which is a different problem.
- **Write-ahead delivery.** This phase covers feed publication. A duplicate reaching a reader despite correct feeds would be a delivery bug, and nobody has seen one.
- **A transaction log.** A single pending section plus the feed as ground truth covers the failure modes without a second thing that can disagree.

## Deviations

| ADR | What changed | Affects phases |
|---|---|---|
| ADR-0001 | Deviation in task 02.1: contract-change (01:state-path gains an optional `pending` section, so phase…). | 1, 4 |

## Gotchas

- The original code marked content seen inside the fetch loop, which is the worst place: a fetch that succeeds and a publish that fails loses the content silently, and nothing downstream can tell.
- Reconciliation cannot trust the pending record alone — that would promote marks for a feed that was never written. The published feed is the only honest witness, and it happens to already be on disk.
- Pruning and pending have different lifetimes. Passing the state object straight through `prune` dropped the pending section on the first save, which would lose exactly the recovery information a crashed run needs. It is now carried through explicitly, and a test holds that.
- A stale feed from an earlier run can contain none of this run's ids, which is what makes the "one matching id is enough" rule safe. It stops being safe if feeds ever become incrementally written.

## What the next planner must know

- The state file now has an optional `pending` section (see the deviation ADR). Any reader must tolerate it.
- Phase 4 consumes `02:publish` for the published-item count and the committed marks, both in the return value rather than the file.
- `reconcile` must run before fetching, or a crashed run's content is re-featured before the recovery happens.

## Learnings promoted

| Candidate | Promoted to | Or rejected because |
|---|---|---|
| Make the recoverable window explicit rather than trying to make it small | `learnings/recoverable-beats-narrow.md` | — |
| Two records with different lifetimes must not share a maintenance path | `learnings/different-lifetimes-different-paths.md` | — |
| Use JSON.stringify with 2-space indent everywhere | — | a formatting convention, already consistent and not a pattern worth a page |

## Acceptance

| REQ | Criterion | Status | Evidence |
|---|---|---|---|
| REQ-2 | A failure after fetching but before the feed is written leaves no item marked seen. | pass | publish.test.js: failure before write |
| REQ-2 | A failure after the feed is written but before state is saved does not cause the next run to re-feature published content. | pass | publish.test.js: reconcile promotes |
| REQ-2 | An item appears in exactly one published feed across any sequence of runs and failures. | pass | publish.test.js: exactly-once sequence |
| REQ-4 | Upstream responses, including failures and rate limits, can be supplied by a test. | pass | publish.test.js supplies feeds and failures directly, no network |
