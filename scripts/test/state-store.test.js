// Seen-state store: crash safety, corruption reporting, locking, retention.
// Runs offline with no credentials (REQ-4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadState, saveState, prune, markSeen, hasSeen, RETENTION_MS } from '../lib/state-store.js';

const made = [];
function tmp() { const d = mkdtempSync(join(tmpdir(), 'state-store-')); made.push(d); return d; }
test.after?.(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });

test('no credentials are needed to run this suite (REQ-4)', () => {
  for (const key of ['X_BEARER_TOKEN', 'SUPADATA_API_KEY']) {
    assert.equal(process.env[key], undefined, `${key} must not be needed by the tests`);
  }
});

test('a missing file is "missing", not "unreadable"', async () => {
  const { state, status } = await loadState(join(tmp(), 'state-feed.json'));
  assert.equal(status, 'missing');
  assert.deepEqual(state, { seenTweets: {}, seenVideos: {} });
});

test('a corrupted file reports "unreadable" and never yields an empty state silently', async () => {
  const dir = tmp();
  const path = join(dir, 'state-feed.json');
  for (const bad of ['{ "seenTweets": {', '[]', 'null', '{ "seenTweets": [] }', '']) {
    writeFileSync(path, bad);
    const { status, error } = await loadState(path);
    assert.equal(status, 'unreadable', `"${bad.slice(0, 20)}" should be unreadable`);
    assert.ok(error && error.length > 10, 'and the reason must be reported');
  }
});

test('a truncated write does not destroy the previous state', async () => {
  const dir = tmp();
  const path = join(dir, 'state-feed.json');
  const good = { seenTweets: { a: Date.now() }, seenVideos: {} };
  await saveState(path, good);
  const before = readFileSync(path, 'utf-8');

  // Simulate the torn write the old in-place implementation could produce: a temp file is
  // left behind, and the target is untouched because the rename never happened.
  writeFileSync(join(dir, `.state-feed.json.tmp-${process.pid}`), '{ "seenTwe');
  assert.equal(readFileSync(path, 'utf-8'), before, 'the target file is not touched by a temp write');
  const { status, state } = await loadState(path);
  assert.equal(status, 'ok');
  assert.ok(hasSeen(state, 'tweet', 'a'));
});

test('saveState leaves no temp file behind and the target always parses', async () => {
  const dir = tmp();
  const path = join(dir, 'state-feed.json');
  for (let i = 0; i < 5; i++) {
    await saveState(path, markSeen({ seenTweets: {}, seenVideos: {} }, 'tweet', [`t${i}`]));
    JSON.parse(readFileSync(path, 'utf-8'));   // throws if a write was ever torn
  }
  const strays = readdirSync(dir).filter((f) => f.includes('.tmp-'));
  assert.deepEqual(strays, [], `temp files left behind: ${strays.join(', ')}`);
});

test('two concurrent writers do not interleave, and the file parses after both', async () => {
  const dir = tmp();
  const path = join(dir, 'state-feed.json');
  const a = { seenTweets: Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`a${i}`, Date.now()])), seenVideos: {} };
  const b = { seenTweets: Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`b${i}`, Date.now()])), seenVideos: {} };
  await Promise.all([saveState(path, a), saveState(path, b)]);
  const { state, status } = await loadState(path);
  assert.equal(status, 'ok', 'the file is valid after concurrent writes');
  const ids = Object.keys(state.seenTweets);
  assert.equal(ids.length, 200, 'one writer wins cleanly rather than the two interleaving');
  const prefixes = new Set(ids.map((i) => i[0]));
  assert.equal(prefixes.size, 1, `mixed output from two writers: ${[...prefixes].join(',')}`);
});

test('pruning drops only entries older than the window', () => {
  const now = Date.UTC(2026, 0, 20);
  const state = {
    seenTweets: { fresh: now - 1000, old: now - RETENTION_MS - 1000, edge: now - RETENTION_MS + 1000 },
    seenVideos: { oldVideo: now - RETENTION_MS - 1 },
  };
  const { state: out, pruned } = prune(state, { now });
  assert.deepEqual(Object.keys(out.seenTweets).sort(), ['edge', 'fresh']);
  assert.deepEqual(Object.keys(out.seenVideos), []);
  assert.equal(pruned, 2);
});

test('pruning never empties a file of in-window entries', async () => {
  const dir = tmp();
  const path = join(dir, 'state-feed.json');
  const now = Date.now();
  const state = { seenTweets: Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`t${i}`, now])), seenVideos: {} };
  const { pruned } = await saveState(path, state, { now });
  assert.equal(pruned, 0);
  const { state: back } = await loadState(path);
  assert.equal(Object.keys(back.seenTweets).length, 50);
});

test('an unreadable timestamp is kept, not dropped — forgetting an id re-sends its content', () => {
  const now = Date.now();
  const { state: out } = prune({ seenTweets: { weird: 'not-a-number', ok: now }, seenVideos: {} }, { now });
  assert.deepEqual(Object.keys(out.seenTweets).sort(), ['ok', 'weird']);
});

test('prune does not mutate the caller\'s state, so a failed write leaves it intact', () => {
  const now = Date.now();
  const state = { seenTweets: { old: now - RETENTION_MS - 1 }, seenVideos: {} };
  prune(state, { now });
  assert.deepEqual(Object.keys(state.seenTweets), ['old'], 'the input is untouched');
});

test('the existing committed state file still loads (the format did not change)', async () => {
  const real = new URL('../../state-feed.json', import.meta.url).pathname;
  if (!existsSync(real)) return;
  const { status, state } = await loadState(real);
  assert.equal(status, 'ok', 'the real committed state must remain readable');
  assert.ok(Object.keys(state.seenTweets).length > 0, 'and its dedup history must be intact');
});
