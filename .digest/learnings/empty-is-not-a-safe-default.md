---
type: learning
status: active
updated: 2026-09-13
depends_on: []
tags: [error-handling, state, silent-failure]
summary: When a read fails, return a status the caller must handle — never a plausible empty value.
---

# Empty is not a safe default

## Rule

When a read fails, return a status the caller must handle — never a plausible empty value.

## Why

The digest tool caught a JSON parse error on its dedup state and returned `{}`. That turns a corrupted file into a digest that re-sends all 213 previously featured items. The failure surfaces as content, to the reader, days later.

## How to apply

Return `{ value, status }` with an explicit `unreadable` case, and make the caller decide. A first-run `missing` and a corrupted `unreadable` are different facts and must not collapse into one.

## Does not apply when

Not for genuinely optional reads where absence and emptiness are the same thing — a cache, or an optional config with real defaults.
