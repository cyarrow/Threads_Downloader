import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterForTag, streamItemType, streamPosts } from '../src/collection/streamModel.js';
import { UNCATEGORIZED, indexTags } from '../src/collection/tagModel.js';

const tags = [
  { id: 'fan', name: '追星', parentId: null },
  { id: 'fan-a', name: '某團', parentId: 'fan' },
  { id: 'food', name: '美食', parentId: null },
];
const index = indexTags(tags);
const post = (id, savedAt, extra = {}) => ({ id, savedAt, author: id, caption: '', media: [], tagIds: [], status: 'ready', ...extra });
const posts = [
  post('old', 1, { tagIds: ['food'] }),
  post('new', 9, { tagIds: ['fan-a'] }),
  post('mid', 5),
  post('loading', 10, { status: 'loading' }),
  post('failed', 11, { status: 'failed' }),
  post('gone', 3, { status: 'sourceDeleted', tagIds: ['fan'] }),
];

test('newest first, only readable posts (a deleted source keeps its saved text)', () => {
  assert.deepEqual(streamPosts(posts, { index }).map((p) => p.id), ['new', 'mid', 'gone', 'old']);
});

test('filter: a 大標籤 includes its 小標籤; 未分類 matches untagged posts', () => {
  assert.deepEqual(streamPosts(posts, { filter: 'fan', index }).map((p) => p.id), ['new', 'gone']);
  assert.deepEqual(streamPosts(posts, { filter: UNCATEGORIZED, index }).map((p) => p.id), ['mid']);
});

test('random: stable for a seed, changes with 換一批, and a new post does not reshuffle the rest', () => {
  const a = streamPosts(posts, { order: 'random', seed: 1, index }).map((p) => p.id);
  assert.deepEqual(streamPosts(posts, { order: 'random', seed: 1, index }).map((p) => p.id), a);
  assert.deepEqual([...a].sort(), ['gone', 'mid', 'new', 'old']);
  const seeds = [2, 3, 4, 5].map((seed) => streamPosts(posts, { order: 'random', seed, index }).map((p) => p.id).join());
  assert.ok(seeds.some((s) => s !== a.join()), 'some other seed deals another order');
  const more = streamPosts([...posts, post('fresh', 20)], { order: 'random', seed: 1, index }).map((p) => p.id);
  assert.deepEqual(more.filter((id) => id !== 'fresh'), a);
});

test('item types keep layouts apart', () => {
  assert.equal(streamItemType(post('x', 1, { media: [{ type: 'image' }, { type: 'image' }] })), 'carousel');
  assert.equal(streamItemType(post('x', 1, { media: [{ type: 'video' }] })), 'video');
  assert.equal(streamItemType(post('x', 1, { media: [{ type: 'image' }] })), 'photo');
  assert.equal(streamItemType(post('x', 1, { cover: 'file://c.jpg' })), 'cover');
  assert.equal(streamItemType(post('x', 1)), 'text');
});

test('tapping a tag filters by its 大標籤', () => {
  assert.equal(filterForTag('fan-a', index.byId), 'fan');
  assert.equal(filterForTag('food', index.byId), 'food');
  assert.equal(filterForTag('missing', index.byId), null);
});

test('author: only that author, combined with the tag filter', () => {
  const mine = [...posts, post('x', 7, { author: 'new', tagIds: ['food'] })];
  assert.deepEqual(streamPosts(mine, { author: '@new', index }).map((p) => p.id), ['new', 'x']);
  assert.deepEqual(streamPosts(mine, { author: 'new', filter: 'food', index }).map((p) => p.id), ['x']);
  assert.deepEqual(streamPosts(mine, { author: 'loading', index }), [], 'unreadable posts stay out');
});
