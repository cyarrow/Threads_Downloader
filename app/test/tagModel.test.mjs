import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNCATEGORIZED, filterPosts, foldChips, indexTags, tagHue, tagLabel } from '../src/collection/tagModel.js';

const tags = [
  { id: 'fan', name: '追星', parentId: null, color: 'rose' },
  { id: 'fan-a', name: '星光少年團', parentId: 'fan', color: 'sky' },
  { id: 'food', name: '美食', parentId: null, color: 'orange' },
];
const index = indexTags(tags);
const posts = [
  { id: 1, author: 'a.one', caption: '安可舞台', tagIds: ['fan-a'] },
  { id: 2, author: 'b.two', caption: '早午餐', tagIds: ['food'] },
  { id: 3, author: 'c.three', caption: '沒標籤', tagIds: [] },
  { id: 4, author: 'd.four', caption: '只有大標籤', tagIds: ['fan'] },
];
const ids = (list) => list.map((p) => p.id);

test('indexTags groups children under parents', () => {
  assert.deepEqual(index.parents.map((t) => t.id), ['fan', 'food']);
  assert.deepEqual(index.children.fan.map((t) => t.id), ['fan-a']);
});

test('tagLabel and tagHue: children show their parent and inherit its color', () => {
  assert.equal(tagLabel(index.byId['fan-a'], index.byId), '追星 › 星光少年團');
  assert.equal(tagLabel(index.byId.food, index.byId), '美食');
  assert.equal(tagHue(index.byId['fan-a'], index.byId), 'rose');
});

test('filterPosts: a parent includes its children, selections are a union', () => {
  assert.deepEqual(ids(filterPosts(posts, ['fan'], '', index)), [1, 4]);
  assert.deepEqual(ids(filterPosts(posts, ['fan-a'], '', index)), [1]);
  assert.deepEqual(ids(filterPosts(posts, ['fan-a', 'food'], '', index)), [1, 2]);
  assert.deepEqual(ids(filterPosts(posts, [UNCATEGORIZED], '', index)), [3]);
  assert.deepEqual(ids(filterPosts(posts, [], '', index)), [1, 2, 3, 4]);
});

test('filterPosts: search matches author or caption and combines with tags', () => {
  assert.deepEqual(ids(filterPosts(posts, [], 'B.TWO', index)), [2]);
  assert.deepEqual(ids(filterPosts(posts, [], '舞台', index)), [1]);
  assert.deepEqual(ids(filterPosts(posts, ['food'], '舞台', index)), []);
  assert.deepEqual(ids(filterPosts(posts, [], '星光', index)), [1]); // tag name

});

test('foldChips folds overflow into +N but keeps selected chips visible', () => {
  const items = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
  assert.deepEqual(foldChips(items, [], 3, false), { visible: items.slice(0, 3), hidden: 2 });
  const f = foldChips(items, ['e'], 3, false);
  assert.deepEqual(f.visible.map((t) => t.id), ['a', 'b', 'c', 'e']);
  assert.equal(f.hidden, 1);
  assert.equal(foldChips(items, [], 3, true).hidden, 0);
});
