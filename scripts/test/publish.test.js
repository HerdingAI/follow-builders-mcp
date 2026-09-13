// Publish atomicity: a mark is committed only once the feed carrying it is on disk,
// and a crash between the two is recoverable. Runs offline (REQ-4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadState, saveState, hasSeen } from '../lib/state-store.js';
import { publish, reconcile, feedIds } from '../lib/publish.js';

const made = [];
function tmp() { const d = mkdtempSync(join(tmpdir(), 'publish-')); made.push(d); return d; }
test.after?.(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });

const xFeed = (ids) => ({ generatedAt: 'now', x: [{ handle: 'a', tweets: ids.map((id) => ({ id, text: 't' })) }] });
const podFeed = (ids) => ({ generatedAt: 'now', podcasts: ids.map((id) => ({ videoId: id, title: 'v' })) });
const marks = (kind, ids) => ids.map((id) => ({ kind, id }));

test('feedIds finds ids in both feed shapes, and nothing in an unknown one', () => {
  assert.deepEqual([...feedIds(xFeed(['1', '2']))].sort(), ['1', '2']);
  assert.deepEqual([...feedIds(podFeed(['v1']))], ['v1']);
  assert.deepEqual([...feedIds({ unexpected: true })], []);
  assert.deepEqual([...feedIds(null)], []);
});

test('a successful publish writes the feed and then commits the marks', async () => {
  const dir = tmp();
  const statePath = join(dir, 'state-feed.json');
  const feedPath = join(dir, 'feed-x.json');
  const state = { seenTweets: {}, seenVideos: {} };
  const r = await publish({ feedPath, feed: xFeed(['1', '2']), marks: marks('tweet', ['1', '2']), statePath, state });
  assert.equal(r.promoted, 2);
  assert.ok(existsSync(feedPath));
  const { state: back, status } = await loadState(statePath);
  assert.equal(status, 'ok');
  assert.ok(hasSeen(back, 'tweet', '1') && hasSeen(back, 'tweet', '2'));
  assert.equal(back.pending, undefined, 'nothing is left pending after a clean publish');
});

test('a failure before the feed is written leaves no item marked seen', async () => {
  const dir = tmp();
  const statePath = join(dir, 'state-feed.json');
  const feedPath = join(dir, 'nonexistent-dir', 'feed-x.json');   // the write will fail
  const state = { seenTweets: {}, seenVideos: {} };
  await assert.rejects(() => publish({ feedPath, feed: xFeed(['1']), marks: marks('tweet', ['1']), statePath, state }));
  const { state: back } = await loadState(statePath);
  assert.ok(!hasSeen(back, 'tweet', '1'), 'REQ-2: nothing is seen if nothing was published');
  assert.ok(back.pending, 'but the intent is recorded, so the next run can reconcile');
});

test('a crash after the feed is written does not re-feature it: reconcile promotes', async () => {
  const dir = tmp();
  const statePath = join(dir, 'state-feed.json');
  const feedPath = join(dir, 'feed-x.json');
  // the state a crash between publish and promote leaves behind
  const crashed = { seenTweets: {}, seenVideos: {}, pending: { 'feed-x.json': { at: Date.now(), marks: marks('tweet', ['7', '8']) } } };
  await saveState(statePath, crashed);
  writeFileSync(feedPath, JSON.stringify(xFeed(['7', '8'])));      // the feed did go out

  const { state } = await loadState(statePath);
  const r = await reconcile(state, { feedDir: dir, statePath });
  assert.equal(r.promoted, 2);
  assert.equal(r.dropped, 0);
  const { state: back } = await loadState(statePath);
  assert.ok(hasSeen(back, 'tweet', '7') && hasSeen(back, 'tweet', '8'),
    'REQ-2: published content is not re-featured after a crash');
  assert.equal(back.pending, undefined);
});

test('a crash before the feed was written drops the marks, so the content is not lost', async () => {
  const dir = tmp();
  const statePath = join(dir, 'state-feed.json');
  const crashed = { seenTweets: {}, seenVideos: {}, pending: { 'feed-x.json': { at: Date.now(), marks: marks('tweet', ['9']) } } };
  await saveState(statePath, crashed);
  // no feed file at all
  const { state } = await loadState(statePath);
  const r = await reconcile(state, { feedDir: dir, statePath });
  assert.equal(r.promoted, 0);
  assert.equal(r.dropped, 1);
  const { state: back } = await loadState(statePath);
  assert.ok(!hasSeen(back, 'tweet', '9'), 'unpublished content stays unseen and can be featured next run');
});

test('a stale feed from an earlier run does not promote this run\'s marks', async () => {
  const dir = tmp();
  const statePath = join(dir, 'state-feed.json');
  writeFileSync(join(dir, 'feed-x.json'), JSON.stringify(xFeed(['old1'])));  // last run's feed
  const crashed = { seenTweets: {}, seenVideos: {}, pending: { 'feed-x.json': { at: Date.now(), marks: marks('tweet', ['new1']) } } };
  await saveState(statePath, crashed);
  const { state } = await loadState(statePath);
  const r = await reconcile(state, { feedDir: dir, statePath });
  assert.equal(r.promoted, 0, 'the feed on disk is not the one this entry was written for');
  assert.equal(r.dropped, 1);
});

test('an item appears in exactly one published feed across a sequence of runs and failures', async () => {
  const dir = tmp();
  const statePath = join(dir, 'state-feed.json');
  const feedPath = join(dir, 'feed-x.json');
  let state = { seenTweets: {}, seenVideos: {} };
  const delivered = [];

  // run 1 publishes 1 and 2
  await publish({ feedPath, feed: xFeed(['1', '2']), marks: marks('tweet', ['1', '2']), statePath, state });
  delivered.push(...feedIds(JSON.parse(readFileSync(feedPath, 'utf-8'))));

  // run 2 crashes before writing: only 3 was candidate, and it must stay available
  state = (await loadState(statePath)).state;
  await assert.rejects(() => publish({ feedPath: join(dir, 'no-dir', 'feed-x.json'),
    feed: xFeed(['3']), marks: marks('tweet', ['3']), statePath, state }));
  state = (await loadState(statePath)).state;
  await reconcile(state, { feedDir: dir, statePath });

  // run 3 publishes 3 for real
  state = (await loadState(statePath)).state;
  assert.ok(!hasSeen(state, 'tweet', '3'), '3 was never delivered, so it is still available');
  await publish({ feedPath, feed: xFeed(['3']), marks: marks('tweet', ['3']), statePath, state });
  delivered.push(...feedIds(JSON.parse(readFileSync(feedPath, 'utf-8'))));

  assert.deepEqual(delivered.sort(), ['1', '2', '3'], 'each item delivered exactly once');
  assert.equal(new Set(delivered).size, delivered.length, 'no duplicates');
});

test('pending survives a prune, because it is publish\'s record and not prune\'s', async () => {
  const dir = tmp();
  const statePath = join(dir, 'state-feed.json');
  const state = { seenTweets: { ancient: 1 }, seenVideos: {},
                  pending: { 'feed-x.json': { at: Date.now(), marks: marks('tweet', ['5']) } } };
  const { pruned } = await saveState(statePath, state);
  assert.ok(pruned >= 1, 'the ancient entry is pruned');
  const { state: back } = await loadState(statePath);
  assert.ok(back.pending?.['feed-x.json'], 'but pending is carried through');
});
