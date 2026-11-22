// 翻翻 (swipe deck) rules. Pure: no React, no React Native, so they are
// unit-tested in test/deckModel.test.mjs.
//
// A deck is a fixed, shuffled queue of post ids for one tag filter, a position
// in it, and an undo stack:
//   { key, seed, queue: [id], pos, undo: [{ id, pos, kind, before }] }
// - The order is shuffled once and then stays put for the session, so cards
//   never jump while the user is swiping. Posts saved later join at the end.
// - The card on top is the first queue entry at or after `pos` that is still
//   "live" (exists, readable, still matches the filter). A post that was
//   deleted, or tagged elsewhere while in 未分類 mode, is skipped silently.
// - Every action pushes a record; undo restores `pos` and hands the record back
//   so the screen can put the post's 精選 / tags back the way they were.

import { seededShuffle } from './rediscover.js';

export const UNDO_LIMIT = 50;
export const ALL = '__all__';

// How far the finger has to travel before a release counts as a swipe.
export const SWIPE_X = 90;
export const SWIPE_UP = 110;
// Movement under this is a tap (opens the post), not a drag.
export const TAP_SLOP = 6;

export function newDeck(key, ids, seed) {
  return { key, seed, queue: seededShuffle(ids, `${key}#${seed}`), pos: 0, undo: [] };
}

// Posts that start matching after the deck was dealt (a new save, an undo
// elsewhere) join at the end, in the order given.
export function syncDeck(deck, ids) {
  const known = new Set(deck.queue);
  const extra = ids.filter((id) => !known.has(id));
  return extra.length ? { ...deck, queue: [...deck.queue, ...extra] } : deck;
}

// Index of the top card (-1 when the deck is finished).
export function topIndex(deck, isLive, from = deck.pos) {
  for (let i = from; i < deck.queue.length; i++) if (isLive(deck.queue[i])) return i;
  return -1;
}

// The card under the top one (shown peeking out behind it), or -1.
export function underIndex(deck, isLive) {
  const top = topIndex(deck, isLive);
  return top < 0 ? -1 : topIndex(deck, isLive, top + 1);
}

// Cards left, counting the top one.
export function remaining(deck, isLive) {
  let n = 0;
  for (let i = deck.pos; i < deck.queue.length; i++) if (isLive(deck.queue[i])) n++;
  return n;
}

// Moves past card `id` (normally the top one), remembering how to undo it.
// By id, not "whatever is on top now": after the tag picker closes, the card
// may already have left the filter (tagged in 未分類 mode).
// `kind`: what was done ('feature' | 'next' | 'suggest' | 'skip' | 'pick');
// `before`: the post's state before ({ featured, tagIds }) for undo.
export function advance(deck, id, kind, before) {
  const i = deck.queue.indexOf(id, deck.pos);
  if (i < 0) return deck;
  const record = { id, pos: deck.pos, kind, before };
  return { ...deck, pos: i + 1, undo: [...deck.undo, record].slice(-UNDO_LIMIT) };
}

// → { deck, record } with the last action taken back, or null when there is nothing to undo.
export function undoDeck(deck) {
  if (!deck.undo.length) return null;
  const record = deck.undo[deck.undo.length - 1];
  return { deck: { ...deck, pos: record.pos, undo: deck.undo.slice(0, -1) }, record };
}

// What a swipe direction (or the matching button) does in each mode.
// Triage (the 未分類 filter): right applies the top suggestion — or opens the
// picker when there is none — left skips. Otherwise right sets 精選, left moves on.
// Up always opens the tag picker.
export function deckAction(direction, { triage, hasSuggestion }) {
  if (direction === 'up') return 'pick';
  if (direction === 'left') return triage ? 'skip' : 'next';
  if (direction === 'right') return triage ? (hasSuggestion ? 'suggest' : 'pick') : 'feature';
  return null;
}

// Where a released drag goes: 'right' | 'left' | 'up' | 'tap' | null (spring back).
export function releaseDirection(dx, dy) {
  if (dx > SWIPE_X) return 'right';
  if (dx < -SWIPE_X) return 'left';
  if (dy < -SWIPE_UP && Math.abs(dx) < 60) return 'up';
  if (Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) return 'tap';
  return null;
}

// Hint line above the deck.
export function deckHint({ triage, suggestion, reason }) {
  if (!triage) return '右滑設為精選 · 左滑看下一張 · 上滑加標籤';
  if (!suggestion) return '沒有建議的標籤 · 上滑或按「加標籤」自己選 · 左滑跳過';
  return `右滑加上「${suggestion}」${reason ? `（${reason}）` : ''} · 左滑跳過`;
}

// What the screen reader hears (and the status line says) after an action.
export function actionMessage(kind, { tagName } = {}) {
  switch (kind) {
    case 'feature':
      return '已設為精選';
    case 'suggest':
      return `已加上「${tagName}」`;
    case 'skip':
      return '已跳過';
    case 'next':
      return '下一張';
    case 'pick':
      return '標籤已更新';
    case 'undo':
      return '已復原';
    default:
      return '';
  }
}
