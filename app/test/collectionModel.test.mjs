import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TAGS,
  fetchedFields,
  mergeTags,
  needsRefresh,
  nextTagColor,
  postFromHistory,
  pushRecent,
  tagNameError,
} from '../src/collection/collectionModel.js';

const tags = [
  { id: 'a', name: '追星', parentId: null, color: 'rose' },
  { id: 'b', name: '生活', parentId: null, color: 'orange' },
  { id: 'c', name: '某團', parentId: 'a', color: 'rose' },
];

test('nextTagColor skips colors used by top-level tags and never picks slate', () => {
  assert.equal(nextTagColor(tags), 'green');
  assert.equal(nextTagColor([]), 'rose');
  const allUsed = ['rose', 'orange', 'green', 'teal', 'sky', 'indigo', 'violet', 'pink'].map((color, i) => ({ id: i, color, parentId: null }));
  assert.notEqual(nextTagColor(allUsed), 'slate');
});

test('default tags use distinct colors', () => {
  assert.equal(new Set(DEFAULT_TAGS.map((t) => t.color)).size, DEFAULT_TAGS.length);
});

test('tagNameError checks empty, length, and duplicates among siblings only', () => {
  assert.equal(tagNameError('  ', null, tags), '請輸入標籤名稱');
  assert.equal(tagNameError('追星', null, tags), '這個名稱已經有了');
  assert.equal(tagNameError('某團', 'a', tags), '這個名稱已經有了');
  assert.equal(tagNameError('某團', null, tags), null); // same name elsewhere is fine
  assert.equal(tagNameError('x'.repeat(21), null, tags), '名稱最多 20 個字');
});

test('pushRecent puts the newest first, dedupes and caps', () => {
  assert.deepEqual(pushRecent(['a', 'b'], ['c', 'a']), ['c', 'a', 'b']);
  assert.deepEqual(pushRecent(['1', '2', '3', '4', '5'], ['6']), ['6', '1', '2', '3', '4']);
});

test('needsRefresh: loading posts and ones with no fetched details', () => {
  assert.equal(needsRefresh({ status: 'loading', media: [] }), true);
  assert.equal(needsRefresh({ status: 'ready', media: [], fetchedAt: null }), true);
  assert.equal(needsRefresh({ status: 'ready', media: [{}], fetchedAt: 1 }), false);
  assert.equal(needsRefresh({ status: 'failed', media: [] }), false);
});

test('mergeTags unions without duplicates', () => {
  assert.deepEqual(mergeTags(['a', 'b'], ['b', 'c']), ['a', 'b', 'c']);
});

test('postFromHistory keeps the old entry as a downloaded card that needs a refresh', () => {
  const p = postFromHistory({ code: 'X', url: 'u', author: 'au', caption: 'c', thumb: 'file:///t.jpg', savedAt: 5 });
  assert.equal(p.downloaded, true);
  assert.equal(p.cover, 'file:///t.jpg');
  assert.equal(p.savedAt, 5);
  assert.equal(needsRefresh(p), true);
});

test('fetchedFields builds the canonical URL and keeps only what the card needs', () => {
  const f = fetchedFields({ code: 'C', url: 'https://www.threads.com/t/C', author: 'me', caption: 'hi',
    media: [{ type: 'image', url: 'u', poster: 'p', ratio: 1.2, thumb: 't', width: 1 }] }, 9);
  assert.equal(f.url, 'https://www.threads.com/@me/post/C');
  assert.deepEqual(f.media, [{ type: 'image', url: 'u', poster: 'p', ratio: 1.2 }]);
  assert.equal(f.status, 'ready');
  assert.equal(f.fetchedAt, 9);
});
