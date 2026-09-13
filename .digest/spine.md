---
type: spine
status: draft
updated: 2026-09-13
depends_on: []
summary: Vision, architecture overview, invariants, glossary and non-goals for Follow Builders digest.
---

# Spine — Follow Builders digest

Layer 1. Capability level only. **No technology choices on this page.** A technology choice
belongs in `phases/NN/context.md`.

## 1. Vision

Someone who wants to follow what AI builders are actually shipping gets a short daily digest of their own posts and podcast appearances, instead of an algorithmic feed of people talking about them.

## 2. Problem

The content is scattered across accounts and long video episodes. Reading it directly costs an hour a day, and the obvious shortcut — an algorithmic feed — optimises for engagement rather than for what was shipped.

The tool exists; what it lacks is reliability. Its dedup state is committed to the repository and written without atomicity, content is marked seen before it is published, a single upstream hiccup loses a whole run, and nothing is tested.

## 3. Architecture overview

A scheduled job fetches, a preparation step assembles, a delivery step sends.

- **Fetch** reads the upstream sources, writes two feed files and updates the dedup state.
- **Prepare** turns the feeds plus the prompts into one digest document.
- **Deliver** sends that document to a channel.

The dedup state is committed alongside the feeds, so the job is stateless between runs and its memory is a file in version control. That is what makes atomicity a correctness property rather than a nicety: a half-written state file is a repository with a corrupted memory.

## 4. Invariants

Never violated. Every session loads this section.

- **INV-1 · Never send the same content twice.** Content that has appeared in a digest is never featured again, across runs and across crashes.
- **INV-2 · A run that cannot fetch is silent, not wrong.** Failing upstream produces an empty digest, never a stale or duplicated one.
- **INV-3 · Every write leaves a valid state file.** The dedup state is committed to the repository, so a crash mid-write must not be able to corrupt it.
- **INV-4 · A credential never reaches a feed, a log line, or a digest.** Secrets arrive from the environment and stay there.
- **INV-5 · The tool reads upstream and writes locally; it never posts.** No upstream mutation, ever.

### Testable reading

| Invariant | Signal |
|---|---|
| INV-1 | an id present in a published feed but absent from the seen state |
| INV-2 | a feed written from a run whose fetch reported errors |
| INV-3 | a non-atomic write to the state path |
| INV-4 | a token-shaped string in any written file |
| INV-5 | a non-GET request to an upstream API |

## 5. Glossary

- **Feed** — A generated JSON file holding one run's fetched content.
- **Seen state** — The committed record of content ids already featured, used for deduplication.
- **Run** — One execution of the scheduled fetch job.
- **Digest** — The assembled document a reader receives.

## 6. Non-goals

- Not a reader or a UI — the digest is delivered to a channel the reader already uses.
- Not a scheduler — the schedule belongs to the job runner, not to this code.
- Not a general aggregator — the source list is curated by hand, deliberately.
- Not a summariser — the agent skill does the summarising; this tool supplies it with material.
