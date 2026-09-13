---
type: learning
status: active
updated: 2026-09-13
depends_on: []
tags: [error-handling, loops, silent-failure]
summary: In a loop over independent sources, never `break` on one source's failure — `continue`, and report the skip.
---

# Break drops the tail

## Rule

In a loop over independent sources, never `break` on one source's failure — `continue`, and report the skip.

## Why

A `break` on HTTP 429 meant one rate-limited account dropped every account after it in the list. The run still succeeded, the feed was still written, and the only trace was one non-fatal error line. Which builders lost their content depended on list order.

## How to apply

Per iteration: classify, record, continue. Aggregate the skips and surface them in the run's output. Reserve `break` for a failure that genuinely invalidates the remaining work, and say why in a comment.

## Does not apply when

Not when the items are dependent, or when continuing would compound the failure — a quota that is shared and already exhausted, for instance.
