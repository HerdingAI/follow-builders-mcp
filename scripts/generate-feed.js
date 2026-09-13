#!/usr/bin/env node

// ============================================================================
// Follow Builders — Central Feed Generator
// ============================================================================
// Runs on GitHub Actions (every 6h for tweets, every 24h for podcasts) to
// fetch content and publish feed-x.json and feed-podcasts.json.
//
// Deduplication: tracks previously seen tweet IDs and video IDs in
// state-feed.json so content is never repeated across runs.
//
// Usage: node generate-feed.js [--tweets-only | --podcasts-only]
// Env vars needed: X_BEARER_TOKEN, SUPADATA_API_KEY
// ============================================================================

import { readFile } from 'fs/promises';
import { join } from 'path';
import { loadState, saveState, hasSeen } from './lib/state-store.js';
import { publish, reconcile } from './lib/publish.js';
import { fetchWithRetry, FetchReport } from './lib/fetch-retry.js';

// -- Constants ---------------------------------------------------------------

const SUPADATA_BASE = 'https://api.supadata.ai/v1';
const X_API_BASE = 'https://api.x.com/2';
const TWEET_LOOKBACK_HOURS = 24;
const PODCAST_LOOKBACK_HOURS = 72;
const MAX_TWEETS_PER_USER = 3;

// State file lives in the repo root so it gets committed by GitHub Actions
const SCRIPT_DIR = decodeURIComponent(new URL('.', import.meta.url).pathname);
const REPO_ROOT = join(SCRIPT_DIR, '..');
const STATE_PATH = join(REPO_ROOT, 'state-feed.json');

// -- State Management --------------------------------------------------------

// Tracks which tweet IDs and video IDs we've already included in feeds so we never
// send the same content twice across runs. The store (lib/state-store.js) owns
// atomicity, locking and corruption reporting — this file only decides what to do
// when the state cannot be read.

// -- Load Sources ------------------------------------------------------------

async function loadSources() {
  const sourcesPath = join(SCRIPT_DIR, '..', 'config', 'default-sources.json');
  return JSON.parse(await readFile(sourcesPath, 'utf-8'));
}

// -- YouTube Fetching (Supadata API) -----------------------------------------

async function fetchYouTubeContent(podcasts, apiKey, state, errors, marks) {
  const cutoff = new Date(Date.now() - PODCAST_LOOKBACK_HOURS * 60 * 60 * 1000);
  const allCandidates = [];
  const report = new FetchReport();

  for (const podcast of podcasts) {
    try {
      let videosUrl;
      if (podcast.type === 'youtube_playlist') {
        videosUrl = `${SUPADATA_BASE}/youtube/playlist/videos?id=${podcast.playlistId}`;
      } else {
        videosUrl = `${SUPADATA_BASE}/youtube/channel/videos?id=${podcast.channelHandle}&type=video`;
      }

      const attempt = report.record(podcast.name, await fetchWithRetry(videosUrl, {
        headers: { 'x-api-key': apiKey }
      }));
      // A failing source costs that source, never the run.
      if (attempt.classification !== 'ok') continue;
      const videosRes = attempt.response;

      const videosData = await videosRes.json();
      const videoIds = videosData.videoIds || videosData.video_ids || [];

      // Check first 2 videos per channel, skip already-seen ones
      for (const videoId of videoIds.slice(0, 2)) {
        if (hasSeen(state, 'video', videoId)) continue; // dedup

        try {
          const metaAttempt = await fetchWithRetry(
            `${SUPADATA_BASE}/youtube/video?id=${videoId}`,
            { headers: { 'x-api-key': apiKey } }
          );
          if (metaAttempt.classification !== 'ok') continue;
          const meta = await metaAttempt.response.json();
          const publishedAt = meta.uploadDate || meta.publishedAt || meta.date || null;

          allCandidates.push({
            podcast, videoId,
            title: meta.title || 'Untitled',
            publishedAt
          });
          await new Promise(r => setTimeout(r, 300));
        } catch (err) {
          errors.push(`YouTube: Error fetching metadata for ${videoId}: ${err.message}`);
        }
      }
    } catch (err) {
      errors.push(`YouTube: Error processing ${podcast.name}: ${err.message}`);
    }
  }

  // Pick 1 unseen video from the last 72 hours.
  // Sort OLDEST first so videos are featured in chronological order —
  // if 3 videos were published in 72h, day 1 gets the oldest, day 2 the
  // next, day 3 the newest. Dedup ensures each is featured exactly once.
  const withinWindow = allCandidates
    .filter(v => v.publishedAt && new Date(v.publishedAt) >= cutoff)
    .sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt)); // oldest first

  const selected = withinWindow[0]; // oldest unseen video
  if (!selected) return [];

  // Fetch transcript
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${selected.videoId}`;
    const transcriptAttempt = report.record(`transcript ${selected.videoId}`, await fetchWithRetry(
      `${SUPADATA_BASE}/youtube/transcript?url=${encodeURIComponent(videoUrl)}&text=true`,
      { headers: { 'x-api-key': apiKey } }
    ));

    if (transcriptAttempt.classification !== 'ok') {
      errors.push(...report.messages('YouTube: '));
      return [];
    }

    const transcriptData = await transcriptAttempt.response.json();

    // Earned only once the feed is published (02:publish)
    marks.push({ kind: 'video', id: selected.videoId });

    return [{
      source: 'podcast',
      name: selected.podcast.name,
      title: selected.title,
      videoId: selected.videoId,
      url: `https://youtube.com/watch?v=${selected.videoId}`,
      publishedAt: selected.publishedAt,
      transcript: transcriptData.content || ''
    }];
  } catch (err) {
    errors.push(`YouTube: Error fetching transcript for ${selected.videoId}: ${err.message}`);
    return [];
  } finally {
    errors.push(...report.messages('YouTube: '));
  }
}

// -- X/Twitter Fetching (Official API v2) ------------------------------------

async function fetchXContent(xAccounts, bearerToken, state, errors, marks) {
  const results = [];
  const report = new FetchReport();
  const cutoff = new Date(Date.now() - TWEET_LOOKBACK_HOURS * 60 * 60 * 1000);

  // Batch lookup all user IDs (1 API call)
  const handles = xAccounts.map(a => a.handle);
  let userMap = {};

  for (let i = 0; i < handles.length; i += 100) {
    const batch = handles.slice(i, i + 100);
    try {
      const attempt = report.record(`user lookup batch ${i / 100 + 1}`, await fetchWithRetry(
        `${X_API_BASE}/users/by?usernames=${batch.join(',')}&user.fields=name,description`,
        { headers: { 'Authorization': `Bearer ${bearerToken}` } }
      ));
      if (attempt.classification !== 'ok') continue;

      const data = await attempt.response.json();
      for (const user of (data.data || [])) {
        userMap[user.username.toLowerCase()] = {
          id: user.id,
          name: user.name,
          description: user.description || ''
        };
      }
      if (data.errors) {
        for (const err of data.errors) {
          errors.push(`X API: User not found: ${err.value || err.detail}`);
        }
      }
    } catch (err) {
      errors.push(`X API: User lookup error: ${err.message}`);
    }
  }

  // Fetch recent tweets per user (max 3, exclude retweets/replies)
  for (const account of xAccounts) {
    const userData = userMap[account.handle.toLowerCase()];
    if (!userData) continue;

    try {
      const attempt = report.record(`@${account.handle}`, await fetchWithRetry(
        `${X_API_BASE}/users/${userData.id}/tweets?` +
        `max_results=5` +       // fetch 5, then filter to 3 new ones
        `&tweet.fields=created_at,public_metrics,referenced_tweets,note_tweet` +
        `&exclude=retweets,replies` +
        `&start_time=${cutoff.toISOString()}`,
        { headers: { 'Authorization': `Bearer ${bearerToken}` } }
      ));

      // A rate limit costs this account, not every account after it. The old code broke out
      // of the loop here, so one 429 silently dropped the rest of the run.
      if (attempt.classification !== 'ok') continue;

      const data = await attempt.response.json();
      const allTweets = data.data || [];

      // Filter out already-seen tweets, cap at 3
      const newTweets = [];
      for (const t of allTweets) {
        if (hasSeen(state, 'tweet', t.id)) continue; // dedup
        if (newTweets.length >= MAX_TWEETS_PER_USER) break;

        newTweets.push({
          id: t.id,
          // note_tweet.text has the full untruncated text for long tweets (>280 chars)
          text: t.note_tweet?.text || t.text,
          createdAt: t.created_at,
          url: `https://x.com/${account.handle}/status/${t.id}`,
          likes: t.public_metrics?.like_count || 0,
          retweets: t.public_metrics?.retweet_count || 0,
          replies: t.public_metrics?.reply_count || 0,
          isQuote: t.referenced_tweets?.some(r => r.type === 'quoted') || false,
          quotedTweetId: t.referenced_tweets?.find(r => r.type === 'quoted')?.id || null
        });

        // Earned only once the feed is published (02:publish)
        marks.push({ kind: 'tweet', id: t.id });
      }

      if (newTweets.length === 0) continue;

      results.push({
        source: 'x',
        name: account.name,
        handle: account.handle,
        bio: userData.description,
        tweets: newTweets
      });

      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      errors.push(`X API: Error fetching @${account.handle}: ${err.message}`);
    }
  }

  errors.push(...report.messages('X API: '));
  return results;
}

// -- Main --------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const tweetsOnly = args.includes('--tweets-only');
  const podcastsOnly = args.includes('--podcasts-only');

  const xBearerToken = process.env.X_BEARER_TOKEN;
  const supadataKey = process.env.SUPADATA_API_KEY;

  if (!tweetsOnly && !supadataKey) {
    console.error('SUPADATA_API_KEY not set');
    process.exit(1);
  }
  if (!podcastsOnly && !xBearerToken) {
    console.error('X_BEARER_TOKEN not set');
    process.exit(1);
  }

  const sources = await loadSources();

  // A run that cannot read its own dedup memory must not publish. The old code caught the
  // parse error and carried on with empty state, which re-features everything ever sent.
  const { state, status, error } = await loadState(STATE_PATH);
  if (status === 'unreadable') {
    console.error(`state-feed.json is unreadable, refusing to publish: ${error}`);
    console.error('Restore it from git history (it is a committed file) and re-run.');
    process.exit(1);
  }
  if (status === 'missing') {
    console.error('No state-feed.json yet — treating this as a first run.');
  }

  // Recover from a crash between publishing and committing marks, in either direction.
  const recovered = await reconcile(state, { feedDir: REPO_ROOT, statePath: STATE_PATH });
  if (recovered.checked.length) {
    console.error(`  reconciled ${recovered.checked.join(', ')}: ${recovered.promoted} promoted, ${recovered.dropped} dropped`);
  }

  const errors = [];

  // Fetch tweets (unless --podcasts-only)
  let xContent = [];
  if (!podcastsOnly) {
    console.error('Fetching X/Twitter content...');
    const xMarks = [];
    xContent = await fetchXContent(sources.x_accounts, xBearerToken, state, errors, xMarks);
    console.error(`  Found ${xContent.length} builders with new tweets`);

    const totalTweets = xContent.reduce((sum, a) => sum + a.tweets.length, 0);
    const xFeed = {
      generatedAt: new Date().toISOString(),
      lookbackHours: TWEET_LOOKBACK_HOURS,
      x: xContent,
      stats: { xBuilders: xContent.length, totalTweets },
      errors: errors.filter(e => e.startsWith('X API')).length > 0
        ? errors.filter(e => e.startsWith('X API')) : undefined
    };
    const { promoted } = await publish({
      feedPath: join(REPO_ROOT, 'feed-x.json'), feed: xFeed, marks: xMarks, statePath: STATE_PATH, state,
    });
    console.error(`  feed-x.json: ${xContent.length} builders, ${totalTweets} tweets (${promoted} marked seen)`);
  }

  // Fetch podcasts (unless --tweets-only)
  let podcasts = [];
  if (!tweetsOnly) {
    console.error('Fetching YouTube content...');
    const podMarks = [];
    podcasts = await fetchYouTubeContent(sources.podcasts, supadataKey, state, errors, podMarks);
    console.error(`  Found ${podcasts.length} new episodes`);

    const podcastFeed = {
      generatedAt: new Date().toISOString(),
      lookbackHours: PODCAST_LOOKBACK_HOURS,
      podcasts,
      stats: { podcastEpisodes: podcasts.length },
      errors: errors.filter(e => e.startsWith('YouTube')).length > 0
        ? errors.filter(e => e.startsWith('YouTube')) : undefined
    };
    const { promoted } = await publish({
      feedPath: join(REPO_ROOT, 'feed-podcasts.json'), feed: podcastFeed, marks: podMarks, statePath: STATE_PATH, state,
    });
    console.error(`  feed-podcasts.json: ${podcasts.length} episodes (${promoted} marked seen)`);
  }

  // publish() already committed each feed's marks atomically; this save only prunes.
  const { pruned } = await saveState(STATE_PATH, state);
  if (pruned > 0) console.error(`  pruned ${pruned} expired state entries`);

  if (errors.length > 0) {
    console.error(`  ${errors.length} non-fatal errors`);
  }
}

main().catch(err => {
  console.error('Feed generation failed:', err.message);
  process.exit(1);
});
