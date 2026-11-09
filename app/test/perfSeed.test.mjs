import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedCollection, seedCount } from '../src/collection/perfSeed.js';
import { parseThreadsUrl } from '../src/threads.js';

const samples = {
  IMG: { media: [{ type: 'image', url: 'a', poster: 'a', ratio: 1 }] },
  IDOL: { media: [{ type: 'image', url: 'b', poster: 'b', ratio: 1 }] },
  MEME: { media: [{ type: 'image', url: 'c', poster: 'c', ratio: 1 }] },
  CAR: { media: [1, 2, 3].map((i) => ({ type: 'image', url: `car${i}`, poster: `car${i}`, ratio: 1 })) },
  VID: { media: [{ type: 'video', url: 'v', poster: 'v', ratio: 1.3 }] },
  SEA: { media: [{ type: 'video', url: 's', poster: 's', ratio: 0.56 }] },
  TXT: { media: [] },
};

test('seedCount reads ?seed=N and caps it', () => {
  assert.equal(seedCount(''), 0);
  assert.equal(seedCount('?share=x'), 0);
  assert.equal(seedCount('?seed=3000'), 3000);
  assert.equal(seedCount('?a=1&seed=12'), 12);
  assert.equal(seedCount('?seed=999999'), 20000);
});

test('seedCollection is deterministic and realistic', () => {
  const now = Date.UTC(2026, 10, 9);
  const a = seedCollection(1000, { samples, now });
  const b = seedCollection(1000, { samples, now });
  assert.deepEqual(a, b);
  const { tags, posts } = a;
  assert.equal(posts.length, 1000);
  assert.equal(new Set(posts.map((p) => p.id)).size, 1000);
  assert.equal(new Set(posts.map((p) => p.code)).size, 1000);
  // Two-level tags, children share the parent's colour.
  const byId = Object.fromEntries(tags.map((t) => [t.id, t]));
  assert.ok(tags.some((t) => t.parentId));
  for (const t of tags.filter((x) => x.parentId)) assert.equal(t.color, byId[t.parentId].color);
  // Newest first, every post links to a parsable Threads URL with its own code.
  for (let i = 1; i < posts.length; i++) assert.ok(posts[i - 1].savedAt > posts[i].savedAt);
  for (const p of posts.slice(0, 50)) assert.equal(parseThreadsUrl(p.url).code, p.code);
  // 0–3 known tags each, a mix of kinds, some notes and 精選.
  for (const p of posts) {
    assert.ok(p.tagIds.length <= 3);
    assert.ok(p.tagIds.every((id) => byId[id]));
  }
  const count = (fn) => posts.filter(fn).length;
  assert.ok(count((p) => !p.tagIds.length) > 50);
  assert.ok(count((p) => p.media.length === 0) > 100);
  assert.ok(count((p) => p.media.length > 1) > 100);
  assert.ok(count((p) => p.media[0]?.type === 'video') > 50);
  assert.ok(count((p) => p.note) > 50);
  assert.ok(count((p) => p.featured) > 10);
  assert.ok(count((p) => p.status === 'ready') > 950);
  // Media objects are copies, not the shared samples.
  assert.notEqual(posts.find((p) => p.code.startsWith('CAR')).media, samples.CAR.media);
});
