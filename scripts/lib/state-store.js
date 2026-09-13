// ============================================================================
// Seen-state store
// ============================================================================
// The dedup state is committed to the repository, so a torn write is a
// corrupted repository rather than one bad run. Every save is therefore
// write-to-temp then rename, held under a lock, and every load reports
// whether the file was readable instead of inventing an empty state.
//
// Contract 01:state-store. The on-disk format is deliberately unchanged.
// ============================================================================

import { readFile, writeFile, rename, open, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, basename, join } from 'path';
import lockfile from 'proper-lockfile';

export const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const EMPTY = () => ({ seenTweets: {}, seenVideos: {} });

/**
 * Read the seen state.
 *
 * Returns a status rather than a plausible empty value: a file that exists and
 * does not parse is `unreadable`, never `{}`. Collapsing those two cases is how
 * a corrupted state file becomes a digest that re-sends everything (see
 * learnings/empty-is-not-a-safe-default).
 *
 * @returns {Promise<{state: object, status: 'ok'|'missing'|'unreadable', error?: string}>}
 */
export async function loadState(path) {
  if (!existsSync(path)) return { state: EMPTY(), status: 'missing' };
  let raw;
  try {
    raw = await readFile(path, 'utf-8');
  } catch (err) {
    return { state: EMPTY(), status: 'unreadable', error: `cannot read ${basename(path)}: ${err.message}` };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { state: EMPTY(), status: 'unreadable', error: `${basename(path)} is not valid JSON: ${err.message}` };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { state: EMPTY(), status: 'unreadable', error: `${basename(path)} is not a state object` };
  }
  // Missing sub-objects are tolerated — an older file may predate one of them — but a
  // present-and-wrong-shaped one is corruption, not an omission.
  for (const key of ['seenTweets', 'seenVideos']) {
    if (key in parsed && (typeof parsed[key] !== 'object' || parsed[key] === null || Array.isArray(parsed[key]))) {
      return { state: EMPTY(), status: 'unreadable', error: `${basename(path)}: "${key}" is not an object` };
    }
  }
  return { state: { ...EMPTY(), ...parsed }, status: 'ok' };
}

/**
 * Prune entries older than the retention window. Returns a new object; the caller's
 * copy is untouched, so a failed write cannot leave the process holding a pruned
 * state it never persisted.
 */
export function prune(state, { retentionMs = RETENTION_MS, now = Date.now() } = {}) {
  const cutoff = now - retentionMs;
  const out = EMPTY();
  let pruned = 0;
  for (const key of ['seenTweets', 'seenVideos']) {
    for (const [id, ts] of Object.entries(state[key] || {})) {
      // A non-numeric timestamp is kept rather than dropped: forgetting an id re-sends
      // its content, which is worse than keeping a row whose age we cannot read.
      if (typeof ts === 'number' && ts < cutoff) { pruned++; continue; }
      out[key][id] = ts;
    }
  }
  return { state: out, pruned };
}

/**
 * Write a file atomically: a sibling temp file, flushed, then renamed. Rename is only
 * atomic within a filesystem, which is why the temp file is a sibling rather than in /tmp.
 * Shared with the publish step so feeds and state are written the same way.
 */
export async function writeAtomic(path, body) {
  const tmp = join(dirname(path), `.${basename(path)}.tmp-${process.pid}`);
  const handle = await open(tmp, 'w');
  try {
    await handle.writeFile(body);
    await handle.sync();            // the bytes are on disk before the rename makes them visible
  } finally {
    await handle.close();
  }
  try {
    await rename(tmp, path);        // atomic within the filesystem
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  }
  return body.length;
}

/**
 * Write the state atomically, under a lock.
 *
 * Pruning happens before the write so that pruning and persisting are one step.
 * The temp file is a sibling of the target, because rename is only atomic within
 * a filesystem.
 *
 * @returns {Promise<{pruned: number, written: number}>}
 */
export async function saveState(path, state, { retentionMs = RETENTION_MS, now = Date.now() } = {}) {
  await mkdir(dirname(path), { recursive: true });
  // proper-lockfile needs the target to exist before it will lock it.
  if (!existsSync(path)) await writeFile(path, JSON.stringify(EMPTY(), null, 2) + '\n');

  const release = await lockfile.lock(path, {
    retries: { retries: 10, minTimeout: 20, maxTimeout: 200 },
    stale: 10_000,
  });
  try {
    const { state: next, pruned } = prune(state, { retentionMs, now });
    // Carry the pending section through untouched: it is publish's, not prune's (ADR in .digest).
    if (state.pending && Object.keys(state.pending).length) next.pending = state.pending;
    const written = await writeAtomic(path, JSON.stringify(next, null, 2) + '\n');
    return { pruned, written };
  } finally {
    await release();
  }
}

/** Mark ids seen. Kept here so callers never reach into the state shape directly. */
export function markSeen(state, kind, ids, { now = Date.now() } = {}) {
  const key = kind === 'tweet' ? 'seenTweets' : 'seenVideos';
  for (const id of ids) state[key][id] = now;
  return state;
}

export function hasSeen(state, kind, id) {
  const key = kind === 'tweet' ? 'seenTweets' : 'seenVideos';
  return Boolean(state[key]?.[id]);
}
