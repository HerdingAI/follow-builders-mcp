---
type: learning
status: active
updated: 2026-09-13
depends_on: []
tags: [dependencies, archaeology, brownfield]
summary: Grep for every declared dependency that is never imported; each one is a decision someone made and did not finish.
---

# Unused dependencies mark abandoned intent

## Rule

Grep for every declared dependency that is never imported; each one is a decision someone made and did not finish.

## Why

`proper-lockfile` sat in `scripts/package.json` unused. Someone knew the state file needed locking, wrote it down in the only place that persists, and never wired it up. The dependency list was a to-do nobody read.

## How to apply

For each dependency, grep the source for an import. An unused one is either dead weight to remove or unfinished work to land — both worth knowing, and the diff is tiny.

## Does not apply when

Not for tooling pulled in by config rather than import — formatters, type packages, build plugins.
