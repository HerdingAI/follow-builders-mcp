---
type: context
status: closed
phase: 2
updated: 2026-09-13
depends_on: [../../spine.md, ../../roadmap.md]
summary: Locked preferences for publish atomicity: write-ahead marks, reconciliation from the feed itself.
---

# Phase 02 · Publish atomicity — Context

The only place this phase's technology choices are made (INV-1).

## Decisions

### D-01 · Marks are written ahead of publishing, then promoted once the feed is on disk
- **why:** the guarantee has to hold in both directions. Marking before publishing loses content on a failed write; marking after publishing re-features it if the state save fails. A write-ahead record makes the window recoverable instead of merely smaller
- **alternatives:** mark after the feed write and accept the window — rejected, that window is a duplicate digest, the exact failure the tool exists to avoid; a transaction log — rejected as heavier than a single pending section
- **reversible:** costly — the state file now carries a pending section and readers must tolerate it

### D-02 · Reconciliation asks the published feed, not a journal
- **why:** the feed is the ground truth for what went out, and it is already on disk. A separate journal would be a second thing that can disagree
- **alternatives:** trust the pending record and always promote — rejected, it would mark content seen that a failed write never delivered
- **reversible:** cheap

### D-03 · One id from the pending entry found in the feed is enough to promote the whole entry
- **why:** a feed is written atomically, so partial presence is impossible: either the feed that landed is this one or it is not
- **alternatives:** require every id — rejected, it would fail spuriously if the feed shape filters an item out after the marks are collected
- **reversible:** cheap

### D-04 · The pending section is carried through pruning untouched
- **why:** pruning is about retention of seen ids; pending is an in-flight record with different lifetime rules, and dropping it would lose the recovery information exactly when a run crashed
- **alternatives:** prune pending by age too — deferred until there is evidence of a stuck entry
- **reversible:** cheap

## Parked questions

| # | Question | Default for now | What closes it |
|---|---|---|---|
| P-01 | Should a pending entry expire? | no — reconciliation resolves it on the next run, and a stuck entry means the next run never happened | an observed stuck entry |
| P-02 | Should delivery also be write-ahead? | out of scope — this phase covers feed publication, not channel delivery | a duplicate reaching a reader despite correct feeds |

## Prior art read

- The existing `main()` in `scripts/generate-feed.js` — the order of fetch, write, save is what changes; the feed shapes are untouched
- Phase 1's `01:state-store` — `writeAtomic` was extracted there so feeds and state are written the same way

## Does not decide

- retry behaviour on the fetch side — phase 3
