---
type: plan
status: closed
phase: 2
reqs: [REQ-2, REQ-4]
approved: true
updated: 2026-09-13
depends_on: [contracts.md, context.md, ../../requirements.md]
summary: Mark content seen only once the feed carrying it is on disk, and recover from a crash between the two.
---

# Phase 02 · Publish atomicity — Plan

## Goal

Make the never-repeated guarantee hold across a crash in either direction: nothing is marked seen that was not published, and nothing published is re-featured. A crash between the two is recovered by asking the published feed what actually went out.

## Out of scope

- retry and rate-limit behaviour — phase 3
- channel delivery — this phase covers feed publication only
- the feed document shapes, which are unchanged

## Tasks

### Task 02.1 · A publish step with write-ahead marks and reconciliation
- **reqs:** REQ-2, REQ-4
- **contracts:** 02:publish, 01:state-store
- **depends on tasks:** []
- **files:** scripts/lib/publish.js, scripts/test/publish.test.js, scripts/lib/state-store.js
- **goal:** publishing and marking become one recoverable operation instead of two hopeful ones
- **action:** 1. extract `writeAtomic` from the state store so a feed is written the same way state is. 2. `publish()` records the marks as pending, saves, writes the feed atomically, then promotes and saves. 3. `reconcile()` reads each pending entry's feed and promotes if the ids are there, drops if they are not. 4. carry pending through pruning. 5. test both crash directions, a stale feed, and an exactly-once sequence across three runs.
- **verify:** cd scripts && npm test
- **done:** a failed write leaves nothing seen; a crash after a successful write promotes on the next run; an item is delivered exactly once across a run-crash-run sequence
- **deviation check:** extending the state file's schema — phase 1's contract calls it unchanged, so that needs recording

### Task 02.2 · Route the generator through publish
- **reqs:** REQ-2
- **contracts:** 02:publish
- **depends on tasks:** 02.1
- **files:** scripts/generate-feed.js
- **goal:** the real script stops marking content seen while fetching it
- **action:** 1. the fetch functions collect marks instead of committing them. 2. reconcile at startup, before fetching. 3. publish each feed through `publish()`, which commits that feed's marks. 4. the final save only prunes.
- **verify:** cd scripts && npm test && node --check generate-feed.js
- **done:** no direct mark survives in the generator, reconciliation runs before fetching, and each feed is published through the step
- **deviation check:** any change to fetching or to a feed shape

## Manual acceptance

| REQ | Criterion | Task | Evidence |
|---|---|---|---|
| REQ-2 | A failure after fetching but before the feed is written leaves no item marked seen. | 02.1 | publish.test.js: failure before write |
| REQ-2 | A failure after the feed is written but before state is saved does not cause the next run to re-feature published content. | 02.1 | publish.test.js: reconcile promotes |
| REQ-2 | An item appears in exactly one published feed across any sequence of runs and failures. | 02.1 | publish.test.js: exactly-once sequence |
| REQ-4 | Upstream responses, including failures and rate limits, can be supplied by a test. | 02.1 | publish.test.js supplies feeds and failures directly, no network |

## Closing notes for the next planner

1. The state file now carries an optional `pending` section. Phase 1's contract called the schema unchanged, so this is a contract extension and is recorded as one.
2. Phase 4 consumes `02:publish` for the published-item count and the committed marks. Both are in the return value, not in the file.
3. Reconciliation treats one matching id as proof the feed landed, because a feed is written atomically. If feeds ever become incrementally written, that reasoning breaks.
