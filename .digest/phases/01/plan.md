---
type: plan
status: closed
phase: 1
reqs: [REQ-1, REQ-4]
approved: true
updated: 2026-09-13
depends_on: [contracts.md, context.md, ../../requirements.md]
summary: Crash-safe seen state: atomic rename under a lock, corruption reported rather than swallowed.
---

# Phase 01 · State integrity — Plan

## Goal

Make the committed seen state trustworthy. A run interrupted at any point leaves a valid file; a corrupted file is reported rather than silently treated as empty; two writers cannot interleave. Everything later depends on this.

## Out of scope

- deciding when a mark is committed relative to publishing — phase 2
- retry behaviour — phase 3
- changing the on-disk format — deliberately unchanged so existing dedup history stays valid

## Tasks

### Task 01.1 · A state store with atomic save, a lock, and a readable-or-reported load
- **reqs:** REQ-1, REQ-4
- **contracts:** 01:state-store, 01:state-path
- **depends on tasks:** []
- **files:** scripts/lib/state-store.js, scripts/test/state-store.test.js, scripts/package.json
- **goal:** one module the rest of the tool goes through for the seen state, with crash-safety as a property rather than a hope
- **action:** 1. `loadState(path)` returns `{ state, status }` with status `ok`, `missing` or `unreadable`; it never invents an empty state for a file that exists and does not parse. 2. `saveState(path, state, { retentionMs })` prunes entries older than the window, writes to a temp file in the same directory, flushes it, then renames. 3. hold a `proper-lockfile` lock across the read-modify-write. 4. add a `test` script to package.json so the suite is runnable.
- **verify:** cd scripts && npm test
- **done:** a torn write leaves the previous file intact; an unparseable file reports `unreadable`; entries inside the retention window survive a prune; the suite runs offline with no credential set
- **deviation check:** changing the on-disk format; a write that is not a rename; swallowing a parse error

### Task 01.2 · Route the generator through the store
- **reqs:** REQ-1
- **contracts:** 01:state-store
- **depends on tasks:** 01.1
- **files:** scripts/generate-feed.js
- **goal:** the real script uses the store, and refuses to run on an unreadable state rather than re-sending everything
- **action:** 1. replace the local `loadState` and `saveState` with the store. 2. on status `unreadable`, report and exit non-zero — a run that cannot read its memory must not publish. 3. on `missing`, proceed with empty state, which is the genuine first-run case. 4. keep the retention window and the file location exactly as they were.
- **verify:** cd scripts && npm test && node --check generate-feed.js
- **done:** the generator imports the store, has no local state functions left, and exits non-zero on unreadable state
- **deviation check:** any change to fetching or feed shape — that is not this task

## Manual acceptance

| REQ | Criterion | Task | Evidence |
|---|---|---|---|
| REQ-1 | A write interrupted partway leaves the previous state intact and readable. | 01.1 | state-store.test.js: torn write |
| REQ-1 | A corrupted state file is reported as an error, and the run refuses rather than proceeding with empty state. | 01.2 | state-store.test.js: unreadable status; generate-feed exits non-zero |
| REQ-1 | Two concurrent writers cannot interleave a write. | 01.1 | state-store.test.js: concurrent saves |
| REQ-1 | Pruning removes only entries older than the retention window, and never the whole file. | 01.1 | state-store.test.js: prune window |
| REQ-4 | The test suite runs offline, with no credential set, and passes. | 01.1 | npm test with no env |

## Closing notes for the next planner

1. Phase 2 consumes `01:state-store` and relies on the atomic save plus the unreadable signal, not the file format. Keep the format out of the contract.
2. The retention window stayed at 7 days and the file stayed at the repository root on purpose: the existing committed state must remain valid, or adopting this change re-sends everything once.
