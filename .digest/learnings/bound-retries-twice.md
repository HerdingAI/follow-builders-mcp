---
type: learning
status: active
updated: 2026-09-13
depends_on: []
tags: [retries, bounds, scheduled-jobs]
summary: Bound a retry loop by attempt count *and* by a total time budget, and cap any server-stated delay.
---

# Bound retries twice

## Rule

Bound a retry loop by attempt count *and* by a total time budget, and cap any server-stated delay.

## Why

Three attempts sounds bounded until a server answers `Retry-After: 9999`. Honouring it turns a bounded retry into hours of a held runner, and the count never noticed.

## How to apply

Check the elapsed time before sleeping, not after: a retry that would exceed the budget is not worth starting. Cap a stated delay at the maximum backoff, and fall back to the curve when the header does not parse.

## Does not apply when

Not for a long-running worker whose whole job is to wait out an upstream — there, honouring the stated delay is the point.
