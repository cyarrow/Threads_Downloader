import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexTags } from '../src/collection/tagModel.js';
import { suggestTags } from '../src/collection/suggest.js';
import {
  QUICK_SLOTS,
  lateSuggestions,
  lockPicks,
  postSettled,
  quickReasonText,
  rankQuickTags,
  slotCount,
} from '../src/collection/quickSave.js';

const index = indexTags([
  { id: 'fan', name: '追星', parentId: null },
  { id: 'fan-a', name: '星光少年團', parentId: 'fan' },
  { id: 'fan-b', name: 'Aurora 樂團', parentId: 'fan' },
  { id: 'life', name: '生活', parentId: null },
  { id: 'food', name: '美食', parentId: null },
  { id: 'food-cafe', name: '咖啡廳', parentId: 'food' },
  { id: 'trip', name: '旅遊', parentId: null },
  { id: 'meme', name: '梗圖', parentId: null },
]);
const ids = (list) => list.map((p) => p.tag.id);
const sug = (id, reasons) => ({ tag: index.byId[id], score: 1, reasons });

test('suggestions come first, then recent tags, then 大標籤 in order; at most 3', () => {
  const picks = rankQuickTags({
    suggestions: [sug('fan-a', [{ kind: 'author', count: 2 }])],
    recentIds: ['trip', 'life', 'meme'],
    index,
  });
  assert.deepEqual(ids(picks), ['fan-a', 'trip', 'life']);
  assert.equal(picks.length, QUICK_SLOTS);
  assert.deepEqual(picks[0].reason, { kind: 'author', count: 2 });
  assert.deepEqual(picks[1].reason, { kind: 'recent' });
});

test('a first-time user (no history, no suggestions) still gets the first 大標籤', () => {
  const picks = rankQuickTags({ index });
  assert.deepEqual(ids(picks), ['fan', 'life', 'food']);
  assert.ok(picks.every((p) => p.reason.kind === 'browse'));
});

test('no duplicates, unknown ids are ignored, and a parent is skipped once its child is offered', () => {
  const picks = rankQuickTags({
    suggestions: [sug('food-cafe', [{ kind: 'keyword', word: '咖啡' }])],
    recentIds: ['gone', 'food-cafe', 'food', 'fan'],
    index,
  });
  assert.deepEqual(ids(picks), ['food-cafe', 'fan', 'life']);
});

test('a child may follow its parent (both are real choices)', () => {
  const picks = rankQuickTags({ recentIds: ['fan', 'fan-b'], index });
  assert.deepEqual(ids(picks), ['fan', 'fan-b', 'life']);
});

test('works with real suggestTags output (author reasons lead)', () => {
  const posts = [
    { id: 1, author: 'starlight.daily', caption: '', tagIds: ['fan-a'] },
    { id: 2, author: 'starlight.daily', caption: '', tagIds: ['fan-a'] },
  ];
  const post = { id: 9, author: 'starlight.daily', caption: '週末去咖啡廳', tagIds: [] };
  const picks = rankQuickTags({ suggestions: suggestTags(post, posts, index), recentIds: ['meme'], index });
  assert.deepEqual(ids(picks), ['fan-a', 'food-cafe', 'meme']);
  assert.equal(quickReasonText(picks[0].reason), '同作者常用');
  assert.equal(quickReasonText(picks[1].reason), '內文提到「咖啡廳」');
  assert.equal(quickReasonText(picks[2].reason), '最近用過');
});

test('picks lock once shown: later suggestions never reorder or replace a button', () => {
  // Opened while loading: nothing shown yet (skeleton).
  assert.equal(lockPicks(null, rankQuickTags({ recentIds: ['trip'], index }), false), null);
  // Settle timeout passes before the post is read: recent tags get locked in.
  const early = rankQuickTags({ recentIds: ['trip', 'life'], index });
  const locked = lockPicks(null, early, true);
  assert.deepEqual(ids(locked), ['trip', 'life', 'fan']);
  // The post loads and a strong suggestion arrives: buttons stay exactly as they were.
  const late = rankQuickTags({ suggestions: [sug('fan-a', [{ kind: 'author', count: 3 }])], recentIds: ['trip', 'life'], index });
  assert.deepEqual(ids(late), ['fan-a', 'trip', 'life']);
  assert.equal(lockPicks(locked, late, true), locked);
});

test('postSettled: only a loading post keeps the panel waiting', () => {
  assert.equal(postSettled({ status: 'loading' }), false);
  assert.equal(postSettled({ status: 'ready' }), true);
  assert.equal(postSettled({ status: 'failed' }), true);
  assert.equal(postSettled(undefined), true);
});

test('slotCount reserves as many skeleton rows as there can be buttons', () => {
  assert.equal(slotCount(index), 3);
  assert.equal(slotCount(indexTags([{ id: 'a', name: 'A', parentId: null }])), 1);
  assert.equal(slotCount(indexTags([])), 0);
});

test('quickReasonText', () => {
  assert.equal(quickReasonText({ kind: 'author', count: 1 }), '同作者用過');
  assert.equal(quickReasonText({ kind: 'author', count: 4 }), '同作者常用');
  assert.equal(quickReasonText({ kind: 'browse' }), '');
  assert.equal(quickReasonText(undefined), '');
});

test('lateSuggestions: only suggestions that were not on screen when the picker opened', () => {
  const pinned = [sug('trip', [])];
  const live = [sug('fan-a', []), sug('trip', []), sug('meme', [])];
  assert.deepEqual(ids(lateSuggestions(pinned, live)), ['fan-a', 'meme']);
  assert.deepEqual(ids(lateSuggestions([], live)), ['fan-a', 'trip', 'meme']);
  assert.deepEqual(lateSuggestions(live, live), []);
});

test('tags a rule already added are not offered as buttons', () => {
  const picks = rankQuickTags({ recentIds: ['fan-a', 'trip'], index, exclude: ['fan-a', 'fan'] });
  assert.deepEqual(ids(picks), ['trip', 'life', 'food']);
});
