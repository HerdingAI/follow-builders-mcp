---
type: roadmap
status: draft
updated: 2026-09-13
depends_on: [spine.md, requirements.md]
summary: Ordered phases for Follow Builders digest, with REQ mapping, dependencies and gates.
---

# Roadmap

Layer 1. The rolling-wave window (REQ-10) means only phases inside the window carry a `plan.md`.

| Phase | Goal | REQ-ids | Depends on | Plan |
|---|---|---|---|---|
| 01 · State integrity | Make the seen state crash-safe: atomic writes, a real lock, and corruption detected rather than swallowed. | REQ-1, REQ-4 | — | not yet planned |
| 02 · Publish atomicity | Mark content seen only after the feed carrying it is on disk, so the never-repeated guarantee holds across a crash in either direction. | REQ-2, REQ-4 | 1 | not yet planned |
| 03 · Fetch resilience | Retry what is worth retrying, bound the cost, and let one rate-limited source not cost the run. | REQ-3, REQ-4 | — | not yet planned |
| 04 · Run reporting | Make a run's outcome legible: what was fetched, what was skipped, and whether empty meant quiet or broken. | REQ-5 | 1, 2, 3 | not yet planned |

---

## Phase 01 · State integrity

Make the seen state crash-safe: atomic writes, a real lock, and corruption detected rather than swallowed. Everything else depends on the state being trustworthy.

- **REQ-ids:** REQ-1, REQ-4
- **Depends on:** —
- **Draft contract — exposes:** state-store; state-path

## Phase 02 · Publish atomicity

Mark content seen only after the feed carrying it is on disk, so the never-repeated guarantee holds across a crash in either direction.

- **REQ-ids:** REQ-2, REQ-4
- **Depends on:** 1
- **Draft contract — exposes:** publish

## Phase 03 · Fetch resilience

Retry what is worth retrying, bound the cost, and let one rate-limited source not cost the run.

- **REQ-ids:** REQ-3, REQ-4
- **Depends on:** —
- **Draft contract — exposes:** fetch-retry

## Phase 04 · Run reporting

Make a run's outcome legible: what was fetched, what was skipped, and whether empty meant quiet or broken.

- **REQ-ids:** REQ-5
- **Depends on:** 1, 2, 3
- **Draft contract — exposes:** nothing

## Gates

**Every phase:** its own REQ acceptance criteria pass · `summary.md` written · catalog regenerated ·
no ADR naming the phase left in `draft`.
