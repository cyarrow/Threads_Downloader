import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FRESH_MS, knownPost } from '../src/knownPost.js';

const now = 1_800_000_000_000;
const card = {
  id: 'p1',
  code: 'ABC',
  url: 'https://www.threads.com/@a/post/ABC',
  author: 'a',
  caption: 'hi',
  status: 'ready',
  fetchedAt: now - 60_000,
  media: [{ type: 'image', url: 'https://cdn/x.jpg' }],
};

test('a recently read card is downloaded from its own media links', () => {
  assert.deepEqual(knownPost(card, now), { code: 'ABC', url: card.url, author: 'a', caption: 'hi', media: card.media });
});

test('old, unread, loading, text-only or local-only cards read the page again', () => {
  assert.equal(knownPost({ ...card, fetchedAt: now - FRESH_MS - 1 }, now), null);
  assert.equal(knownPost({ ...card, fetchedAt: null }, now), null);
  assert.equal(knownPost({ ...card, status: 'loading' }, now), null);
  assert.equal(knownPost({ ...card, media: [] }, now), null);
  assert.equal(knownPost({ ...card, media: [{ type: 'image', url: 'file:///c.jpg' }] }, now), null);
  assert.equal(knownPost({ ...card, code: null }, now), null);
  assert.equal(knownPost(null, now), null);
});
