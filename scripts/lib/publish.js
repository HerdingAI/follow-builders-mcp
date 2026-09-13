// ============================================================================
// Publish step
// ============================================================================
// Contract 02:publish.
//
// The old order was: mark content seen while fetching, write the feed, save state.
// That breaks the never-repeated guarantee in both directions. A failure before
// the feed is written leaves items marked seen that nobody ever received; a
// failure after it is written but before state is saved re-features published
// content on the next run.
//
// The order here is write-ahead: record the intent to mark, publish, then promote.
// A crash in the middle is recoverable, because the published feed itself says
// whether the content went out.
// ============================================================================

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { basename } from 'path';
import { writeAtomic, saveState, markSeen } from './state-store.js';

/** Ids present in a published feed. Knows both feed shapes; unknown shapes yield nothing. */
export function feedIds(feed) {
  const ids = new Set();
  for (const account of feed?.x || []) {
    for (const tweet of account.tweets || []) if (tweet.id) ids.add(String(tweet.id));
  }
  for (const episode of feed?.podcasts || []) if (episode.videoId) ids.add(String(episode.videoId));
  return ids;
}

/**
 * Publish one feed and commit its marks only once it is on disk.
 *
 * @param {object}   o
 * @param {string}   o.feedPath   where the feed is written
 * @param {object}   o.feed       the feed document
 * @param {Array}    o.marks      [{ kind: 'tweet'|'video', id }] — what publishing this feed earns
 * @param {string}   o.statePath  the seen-state file
 * @param {object}   o.state      the in-memory state, mutated on promotion
 * @returns {Promise<{published: boolean, promoted: number}>}
 */
export async function publish({ feedPath, feed, marks = [], statePath, state, now = Date.now() }) {
  const key = basename(feedPath);

  // 1. Write-ahead: record what publishing this feed would mark, before it is published.
  //    A crash from here on is recoverable, because reconcile() can read the feed and ask
  //    whether the content actually went out.
  state.pending = { ...(state.pending || {}), [key]: { at: now, marks } };
  await saveState(statePath, state, { now });

  // 2. Publish atomically. A reader sees the old feed or the new one, never half of one.
  await writeAtomic(feedPath, JSON.stringify(feed, null, 2) + '\n');

  // 3. Promote: the content is out, so the marks are earned.
  const promoted = promotePending(state, key, { now });
  await saveState(statePath, state, { now });
  return { published: true, promoted };
}

function promotePending(state, key, { now }) {
  const entry = state.pending?.[key];
  if (!entry) return 0;
  const tweets = entry.marks.filter((m) => m.kind === 'tweet').map((m) => String(m.id));
  const videos = entry.marks.filter((m) => m.kind === 'video').map((m) => String(m.id));
  markSeen(state, 'tweet', tweets, { now });
  markSeen(state, 'video', videos, { now });
  delete state.pending[key];
  if (!Object.keys(state.pending).length) delete state.pending;
  return tweets.length + videos.length;
}

/**
 * Recover from a crash between publishing and promoting.
 *
 * For every pending entry, read the feed it names. If the feed exists and carries the ids,
 * the content went out and the marks are promoted. If it does not, nothing was delivered and
 * the marks are dropped so the content can be featured next run.
 *
 * @returns {Promise<{promoted: number, dropped: number, checked: string[]}>}
 */
export async function reconcile(state, { feedDir, statePath, now = Date.now() } = {}) {
  const pending = state.pending || {};
  const checked = [];
  let promoted = 0, dropped = 0;

  for (const [key, entry] of Object.entries(pending)) {
    checked.push(key);
    const feedPath = `${feedDir}/${key}`;
    let published = new Set();
    if (existsSync(feedPath)) {
      try { published = feedIds(JSON.parse(await readFile(feedPath, 'utf-8'))); } catch { published = new Set(); }
    }
    // Any id from this entry present in the published feed means the feed that went out is
    // this one. Partial presence cannot happen — a feed is written atomically — so one hit
    // is enough, and zero hits means the publish never landed.
    const landed = entry.marks.some((m) => published.has(String(m.id)));
    if (landed) promoted += promotePending(state, key, { now });
    else { dropped += entry.marks.length; delete state.pending[key]; }
  }
  if (state.pending && !Object.keys(state.pending).length) delete state.pending;
  if ((promoted || dropped) && statePath) await saveState(statePath, state, { now });
  return { promoted, dropped, checked };
}
