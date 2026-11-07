import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorSummary, normalizeHandle, postsByAuthor, summaryText, topTags } from '../src/collection/authorModel.js';
import { indexTags } from '../src/collection/tagModel.js';

const index = indexTags([
  { id: 'fan', name: '追星', parentId: null, color: 'rose' },
  { id: 'life', name: '生活', parentId: null, color: 'green' },
  { id: 'food', name: '美食', parentId: null, color: 'orange' },
  { id: 'band', name: '星光少年團', parentId: 'fan', color: 'rose' },
]);

const posts = [
  { id: '1', author: 'star.daily', tagIds: ['band'] },
  { id: '2', author: 'Star.Daily', tagIds: ['fan', 'band'] },
  { id: '3', author: 'star.daily', tagIds: ['life'] },
  { id: '4', author: 'star.daily', tagIds: ['food', 'life'] },
  { id: '5', author: 'other', tagIds: ['food'] },
  { id: '6', author: '', tagIds: [] },
  { id: '7', author: 'star.daily', tagIds: ['gone'] },
];

test('normalizeHandle drops @ and case', () => {
  assert.equal(normalizeHandle('@Star.Daily'), 'star.daily');
  assert.equal(normalizeHandle('  @@a '), 'a');
  assert.equal(normalizeHandle(null), '');
});

test('postsByAuthor matches the handle, keeps wall order, skips loading cards', () => {
  assert.deepEqual(postsByAuthor(posts, '@star.daily').map((p) => p.id), ['1', '2', '3', '4', '7']);
  assert.deepEqual(postsByAuthor(posts, ''), []);
});

test('topTags rolls 小標籤 up to their 大標籤, counts a post once per family', () => {
  const own = postsByAuthor(posts, 'star.daily');
  const top = topTags(own, index, 3);
  assert.deepEqual(top.map((x) => [x.tag.id, x.count]), [['fan', 2], ['life', 2], ['food', 1]]);
});

test('ties keep the 所有標籤 order; unknown tags are ignored', () => {
  const top = topTags([{ tagIds: ['food'] }, { tagIds: ['life'] }, { tagIds: ['gone'] }], index);
  assert.deepEqual(top.map((x) => x.tag.id), ['life', 'food']);
});

test('summary line', () => {
  const s = authorSummary(posts, 'star.daily', index);
  assert.equal(s.count, 5);
  assert.equal(summaryText(s), '5 篇 · 最常用標籤：追星、生活');
  assert.equal(summaryText(authorSummary(posts, 'nobody', index)), '0 篇 · 還沒有標籤');
});
