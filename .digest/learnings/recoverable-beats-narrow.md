---
type: learning
status: active
updated: 2026-09-13
depends_on: []
tags: [atomicity, recovery, state]
summary: When two writes must agree, do not try to shrink the window between them — record enough before the first that the…
---

# Recoverable beats narrow

## Rule

When two writes must agree, do not try to shrink the window between them — record enough before the first that the second can be recovered.

## Why

Marking content seen and publishing it cannot be one atomic write. Reordering them only moves which failure loses data. A write-ahead record of intent plus a ground truth to check against makes the window recoverable, and then its size stops mattering.

## How to apply

Write the intent, do the thing, then confirm. On startup, resolve any unconfirmed intent by asking the thing itself what happened — not by trusting the intent record.

## Does not apply when

Not when the operation has no observable ground truth to reconcile against; then a real transaction or an idempotent retry is the answer.
