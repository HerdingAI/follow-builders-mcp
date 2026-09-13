---
type: catalog
status: active
updated: 2026-09-13
depends_on: []
generated_by: pw-wiki
page_count: 33
summary: One line per wiki page — the agent's map, regenerated from frontmatter by pw-wiki catalog.
---

# Catalog

Format: `path · type · phase · status · summary` (`conventions.md` §5). Generated — never hand-edited.

```
README.md · index · - · active · How to read this wiki, and which bundle each session type loads.
conventions.md · conventions · - · approved · Wiki layout, frontmatter schema, ID conventions, status lifecycle and catalog line format.
decisions/ADR-0001-a-publish-step-with-write-ahead-marks-and-reconciliation-con.md · adr · - · draft · Deviation in task 02.1: contract-change (01:state-path gains an optional `pending` section, so phase…).
learnings/README.md · index · - · active · Cross-cutting reusable patterns promoted from closed phases.
learnings/bound-retries-twice.md · learning · - · active · Bound a retry loop by attempt count *and* by a total time budget, and cap any server-stated delay.
learnings/break-drops-the-tail.md · learning · - · active · In a loop over independent sources, never `break` on one source's failure — `continue`, and report the skip.
learnings/different-lifetimes-different-paths.md · learning · - · active · If two pieces of state have different lifetime rules, never let one's maintenance routine see the other without an…
learnings/empty-is-not-a-safe-default.md · learning · - · active · When a read fails, return a status the caller must handle — never a plausible empty value.
learnings/recoverable-beats-narrow.md · learning · - · active · When two writes must agree, do not try to shrink the window between them — record enough before the first that the…
learnings/unused-dependencies-mark-abandoned-intent.md · learning · - · active · Grep for every declared dependency that is never imported; each one is a decision someone made and did not finish.
phases/01/context.md · context · 1 · closed · Locked preferences for state integrity: atomic rename, the already-declared lock library, status over silence.
phases/01/contracts.md · contract · 1 · closed · what phase 01 (State integrity) exposes to later phases and consumes from earlier ones.
phases/01/plan.md · plan · 1 · closed · Crash-safe seen state: atomic rename under a lock, corruption reported rather than swallowed.
phases/01/summary.md · summary · 1 · closed · The seen state is now crash-safe: atomic rename under a lock, with corruption reported rather than swallowed.
phases/02/context.md · context · 2 · closed · Locked preferences for publish atomicity: write-ahead marks, reconciliation from the feed itself.
phases/02/contracts.md · contract · 2 · closed · what phase 02 (Publish atomicity) exposes to later phases and consumes from earlier ones.
phases/02/plan.md · plan · 2 · closed · Mark content seen only once the feed carrying it is on disk, and recover from a crash between the two.
phases/02/summary.md · summary · 2 · closed · Marks are committed only once the feed is on disk, and a crash between the two is reconciled from the feed.
phases/03/context.md · context · 3 · closed · Locked preferences for fetch resilience: classify then decide, bound the cost, inject the transport.
phases/03/contracts.md · contract · 3 · closed · what phase 03 (Fetch resilience) exposes to later phases and consumes from earlier ones.
phases/03/plan.md · plan · 3 · closed · Retry what is worth retrying, bound the cost, and let one rate-limited source not cost the run.
phases/03/summary.md · summary · 3 · closed · Transient failures are retried within a bounded budget, and a rate limit costs one source instead of the run.
phases/04/contracts.md · contract · 4 · needs-review · Draft — what phase 04 (Run reporting) exposes to later phases and consumes from earlier ones.
requirements.md · requirements · - · draft · REQ-1..REQ-5 — capabilities of Follow Builders digest with acceptance criteria.
roadmap.md · roadmap · - · draft · Ordered phases for Follow Builders digest, with REQ mapping, dependencies and gates.
spine.md · spine · - · draft · Vision, architecture overview, invariants, glossary and non-goals for Follow Builders digest.
state.md · state · - · active · Append-only session log — position, decisions, deviations and bundle sizes.
templates/adr.md · template · - · approved · Template for decisions/ADR-nnnn-<slug>.md, in the Nygard shape plus downstream routing.
templates/context.md · template · - · approved · Template for phases/NN/context.md — the phase's locked technical preferences.
templates/contracts.md · template · - · approved · Template for phases/NN/contracts.md — the exposes/consumes surface of one phase.
templates/learning.md · template · - · approved · Template for learnings/<slug>.md — a cross-cutting reusable pattern.
templates/plan.md · template · - · approved · Template for phases/NN/plan.md and its self-contained task blocks.
templates/summary.md · template · - · approved · Template for phases/NN/summary.md, written by pw-close after verification.
```

**33 pages**, ~1178 estimated tokens of index (budget 2000; chars/4 heuristic (ADR-0011)).
