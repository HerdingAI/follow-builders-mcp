---
type: learning
status: active
updated: 2026-09-13
depends_on: []
tags: [state, retention, subtle-bugs]
summary: If two pieces of state have different lifetime rules, never let one's maintenance routine see the other without an…
---

# Different lifetimes, different paths

## Rule

If two pieces of state have different lifetime rules, never let one's maintenance routine see the other without an explicit decision.

## Why

Pruning exists to expire seen ids after a retention window. The pending section is in-flight data with no retention rule, and passing the whole state object through prune silently dropped it — losing the recovery record precisely when a run had crashed.

## How to apply

Have the maintenance function rebuild only what it owns, and carry anything else across explicitly with a comment saying whose it is. Test that the other record survives.

## Does not apply when

Not when the two genuinely share a lifetime, where a single rule is simpler and a second path would drift.
