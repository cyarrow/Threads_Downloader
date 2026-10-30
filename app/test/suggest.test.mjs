import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexTags } from '../src/collection/tagModel.js';
import { keywordHit, reasonText, suggestTags } from '../src/collection/suggest.js';

const index = indexTags([
  { id: 'fan', name: '追星', parentId: null },
  { id: 'fan-a', name: '星光少年團', parentId: 'fan' },
  { id: 'fan-b', name: 'Aurora 樂團', parentId: 'fan' },
  { id: 'life', name: '生活', parentId: null },
  { id: 'food', name: '美食', parentId: null },
  { id: 'food-dessert', name: '甜點', parentId: 'food' },
  { id: 'food-cafe', name: '咖啡廳', parentId: 'food' },
  { id: 'trip', name: '旅遊', parentId: null },
  { id: 'trip-jp', name: '日本', parentId: 'trip' },
]);
const posts = [
  { id: 1, author: 'starlight.daily', caption: '安可', tagIds: ['fan-a'] },
  { id: 2, author: 'starlight.daily', caption: '手幅', tagIds: ['fan-a', 'life'] },
  { id: 3, author: 'aurora.band.fan', caption: 'MV', tagIds: ['fan-b'] },
  { id: 4, author: 'someone.else', caption: '早午餐', tagIds: ['food'] },
];
const ids = (list) => list.map((s) => s.tag.id);

test('keywordHit matches the tag name or its dictionary words, ignoring Latin case', () => {
  assert.equal(keywordHit(index.byId['trip-jp'], '京都的抹茶'), '京都');
  assert.equal(keywordHit(index.byId['food-cafe'], '新開的 CAFE'), 'cafe');
  assert.equal(keywordHit(index.byId['fan-b'], '今天 aurora 樂團上節目'), 'Aurora 樂團');
  assert.equal(keywordHit(index.byId.life, ''), null);
});

test('same author: tags used on their other saves rank first, more saves rank higher', () => {
  const s = suggestTags({ id: 'new', author: 'Starlight.Daily', caption: '' }, posts, index);
  assert.deepEqual(ids(s), ['fan-a', 'life']);
  assert.deepEqual(s[0].reasons, [{ kind: 'author', author: 'Starlight.Daily', count: 2 }]);
});

test('keywords suggest specific tags from the caption', () => {
  const s = suggestTags({ id: 'new', author: 'kyoto.sweets', caption: '京都清水寺旁的抹茶聖代' }, posts, index);
  assert.deepEqual(ids(s), ['food-dessert', 'trip-jp']);
  assert.deepEqual(s[1].reasons, [{ kind: 'keyword', word: '京都' }]);
});

test('a suggested child absorbs its parent, keeping both reasons', () => {
  const s = suggestTags({ id: 'new', author: 'aurora.band.fan', caption: '巡演台北場加開' }, posts, index);
  assert.deepEqual(ids(s), ['fan-b']);
  assert.deepEqual(s[0].reasons, [
    { kind: 'author', author: 'aurora.band.fan', count: 1 },
    { kind: 'keyword', word: '巡演' },
  ]);
});

test('a parent with no suggested child is suggested on its own', () => {
  const s = suggestTags({ id: 'new', author: 'x', caption: '週末的演唱會' }, posts, index);
  assert.deepEqual(ids(s), ['fan']);
});

test('excludes tags already on the post, ignores the post itself, and caps the list', () => {
  const self = { id: 2, author: 'starlight.daily', caption: '應援咖啡廳的甜點', tagIds: ['fan-a', 'life'] };
  const s = suggestTags(self, posts, index, { exclude: self.tagIds });
  assert.deepEqual(ids(s), ['food-dessert', 'food-cafe'], 'ties keep tag order');
  assert.equal(suggestTags({ id: 'n', author: 'starlight.daily', caption: '咖啡廳甜點日本' }, posts, index, { limit: 2 }).length, 2);
});

test('no author history and no keywords → no suggestions', () => {
  assert.deepEqual(suggestTags({ id: 'n', author: 'nobody', caption: '今天天氣很好' }, posts, index), []);
});

test('reasonText reads like a sentence', () => {
  assert.equal(
    reasonText([{ kind: 'author', author: 'a', count: 2 }, { kind: 'keyword', word: '巡演' }]),
    '同作者有 2 篇用過 · 內文提到「巡演」',
  );
});
