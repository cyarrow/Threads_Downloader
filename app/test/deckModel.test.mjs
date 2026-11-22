import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  UNDO_LIMIT,
  actionMessage,
  advance,
  deckAction,
  deckHint,
  newDeck,
  releaseDirection,
  remaining,
  syncDeck,
  topIndex,
  underIndex,
  undoDeck,
} from '../src/collection/deckModel.js';

const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
const all = () => true;

test('newDeck: shuffled once, same seed gives the same order, every id once', () => {
  const one = newDeck('all', ids, 7);
  const two = newDeck('all', ids, 7);
  assert.deepEqual(one.queue, two.queue);
  assert.deepEqual([...one.queue].sort(), ids);
  assert.equal(one.pos, 0);
  assert.deepEqual(one.undo, []);
  // A different seed (再洗一次) or filter deals a different order.
  assert.notDeepEqual(newDeck('all', ids, 8).queue, one.queue);
});

test('syncDeck: new ids join at the end; known order never changes', () => {
  const deck = { key: 'k', seed: 1, queue: ['c', 'a', 'b'], pos: 1, undo: [] };
  assert.equal(syncDeck(deck, ['a', 'b', 'c']), deck);
  assert.deepEqual(syncDeck(deck, ['x', 'a', 'y']).queue, ['c', 'a', 'b', 'x', 'y']);
  assert.equal(syncDeck(deck, ['x']).pos, 1);
});

test('topIndex / underIndex skip cards that are no longer live', () => {
  const deck = { queue: ['a', 'b', 'c', 'd'], pos: 0, undo: [] };
  const live = (id) => id !== 'a' && id !== 'c';
  assert.equal(topIndex(deck, live), 1);
  assert.equal(underIndex(deck, live), 3);
  assert.equal(remaining(deck, live), 2);
  assert.equal(topIndex({ ...deck, pos: 4 }, live), -1);
  assert.equal(underIndex({ ...deck, pos: 3 }, live), -1);
});

test('advance records the previous state; undo puts the same card back on top', () => {
  let deck = { queue: ['a', 'b', 'c'], pos: 0, undo: [] };
  deck = advance(deck, 'a', 'feature', { featured: false, tagIds: [] });
  assert.equal(deck.pos, 1);
  deck = advance(deck, 'b', 'next', { featured: false, tagIds: ['t'] });
  assert.equal(deck.queue[topIndex(deck, all)], 'c');

  const back = undoDeck(deck);
  assert.equal(back.record.id, 'b');
  assert.equal(back.record.kind, 'next');
  assert.deepEqual(back.record.before, { featured: false, tagIds: ['t'] });
  assert.equal(back.deck.queue[topIndex(back.deck, all)], 'b');
  const again = undoDeck(back.deck);
  assert.equal(again.record.id, 'a');
  assert.equal(again.record.kind, 'feature');
  assert.equal(again.deck.pos, 0);
  assert.equal(undoDeck(again.deck), null);
});

test('triage: a tagged card leaves the pile; undo makes it live again and on top', () => {
  const tagged = new Set();
  const live = (id) => !tagged.has(id);
  let deck = { queue: ['a', 'b', 'c'], pos: 0, undo: [] };
  // Right on "a" applies a suggestion: it stops being 未分類.
  deck = advance(deck, 'a', 'suggest', { featured: false, tagIds: [] });
  tagged.add('a');
  // "b" got a tag somewhere else meanwhile → skipped without a record.
  tagged.add('b');
  assert.equal(deck.queue[topIndex(deck, live)], 'c');
  const back = undoDeck(deck);
  tagged.delete(back.record.id); // the screen restores the empty tag list
  assert.equal(back.deck.queue[topIndex(back.deck, live)], 'a');
});

test('advance by id: unknown or already-passed ids are a no-op; the undo stack is bounded', () => {
  const done = { queue: ['a'], pos: 1, undo: [] };
  assert.equal(advance(done, 'a', 'next', {}), done);
  assert.equal(advance(done, 'zzz', 'next', {}), done);
  // A card that left the filter while the picker was open is still the one passed.
  const deck0 = { queue: ['a', 'b', 'c'], pos: 0, undo: [] };
  const tagged = advance(deck0, 'a', 'pick', { tagIds: [] });
  assert.equal(tagged.pos, 1);
  assert.equal(tagged.undo[0].id, 'a');
  let deck = { queue: Array.from({ length: UNDO_LIMIT + 10 }, (_, i) => `p${i}`), pos: 0, undo: [] };
  for (let i = 0; i < UNDO_LIMIT + 10; i++) deck = advance(deck, `p${i}`, 'next', {});
  assert.equal(deck.undo.length, UNDO_LIMIT);
  assert.equal(deck.undo[0].id, 'p10');
});

test('deckAction maps directions per mode', () => {
  assert.equal(deckAction('right', { triage: false }), 'feature');
  assert.equal(deckAction('left', { triage: false }), 'next');
  assert.equal(deckAction('up', { triage: false }), 'pick');
  assert.equal(deckAction('right', { triage: true, hasSuggestion: true }), 'suggest');
  assert.equal(deckAction('right', { triage: true, hasSuggestion: false }), 'pick');
  assert.equal(deckAction('left', { triage: true }), 'skip');
  assert.equal(deckAction('up', { triage: true }), 'pick');
});

test('releaseDirection: thresholds, tap, and spring back', () => {
  assert.equal(releaseDirection(120, 10), 'right');
  assert.equal(releaseDirection(-120, 30), 'left');
  assert.equal(releaseDirection(10, -150), 'up');
  assert.equal(releaseDirection(80, -150), null); // diagonal: neither
  assert.equal(releaseDirection(2, -3), 'tap');
  assert.equal(releaseDirection(40, 0), null);
});

test('hints and messages', () => {
  assert.equal(deckHint({ triage: false }), '右滑設為精選 · 左滑看下一張 · 上滑加標籤');
  assert.equal(deckHint({ triage: true, suggestion: '美食', reason: '同作者用過' }), '右滑加上「美食」（同作者用過） · 左滑跳過');
  assert.equal(deckHint({ triage: true, suggestion: '美食', reason: '' }), '右滑加上「美食」 · 左滑跳過');
  assert.match(deckHint({ triage: true }), /沒有建議/);
  assert.equal(actionMessage('suggest', { tagName: '美食' }), '已加上「美食」');
  assert.equal(actionMessage('undo'), '已復原');
});
