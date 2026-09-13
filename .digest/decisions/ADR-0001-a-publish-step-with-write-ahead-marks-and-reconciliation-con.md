---
type: adr
id: ADR-0001
status: draft
updated: 2026-09-13
depends_on: []
affects_phases: [1, 4]
supersedes: null
deviation_in: 2
summary: Deviation in task 02.1: contract-change (01:state-path gains an optional `pending` section, so phase…).
---

# ADR-0001 · A publish step with write-ahead marks and reconciliation: contract-change

## Context

Task 02.1 of phase 02 planned:

- files: scripts/lib/publish.js, scripts/test/publish.test.js, scripts/lib/state-store.js
- verify: cd scripts && npm test
- done: a failed write leaves nothing seen; a crash after a successful write promotes on the next run; an item is delivered exactly once across a run-crash-run sequence

Execution found otherwise: a contract item changed during execution.

## Decision

Extend `01:state-path` to allow an optional `pending` object alongside `seenTweets` and `seenVideos`. Existing files stay valid — the key is absent in every committed state written so far, and the loader already tolerates extra keys — so the dedup history is preserved and no migration is needed.

## Consequences

Phase 1's contract is closed and now describes the file inaccurately; its `01:state-path` shape is amended with a pointer here. Any future reader of the state file must tolerate `pending`. Phase 4 consumes `01:state-store` rather than `01:state-path`, so its `consumes` entry stays resolvable and needs no review.

## Affects

| Phase | Page | Action |
|---|---|---|
| 1 | `phases/01/contracts.md` | mark needs-review |
| 4 | `phases/04/contracts.md` | mark needs-review |

## Revisit trigger

The next plan that touches these files.
