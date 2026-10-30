import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageLabel, dayKey, onThisDay, pickRediscover, randomPicks, seededShuffle } from '../src/collection/rediscover.js';

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
const now = at(2026, 10, 29, 9);
const posts = [
  { id: 'today', savedAt: at(2026, 10, 29, 8) },
  { id: 'y1', savedAt: at(2025, 10, 29, 21) },
  { id: 'y1b', savedAt: at(2025, 10, 29, 10) },
  { id: 'y2', savedAt: at(2024, 10, 29) },
  { id: 'y1-failed', savedAt: at(2025, 10, 29), status: 'failed' },
  { id: 'near', savedAt: at(2025, 10, 28) },
  { id: 'old', savedAt: at(2026, 8, 1) },
  { id: 'old-opened', savedAt: at(2026, 7, 1), lastOpenedAt: at(2026, 10, 20) },
];

test('onThisDay: same calendar day in earlier years, newest first, skipping failed loads', () => {
  assert.deepEqual(onThisDay(posts, now).map((h) => [h.post.id, h.years]), [['y1', 1], ['y1b', 1], ['y2', 2]]);
});

test('onThisDay: on 2/28 of a non-leap year, 2/29 saves count too', () => {
  const leap = [{ id: 'leap', savedAt: at(2024, 2, 29) }];
  assert.deepEqual(onThisDay(leap, at(2026, 2, 28)).map((h) => h.post.id), ['leap']);
  assert.deepEqual(onThisDay(leap, at(2028, 2, 28)).map((h) => h.post.id), [], '2028 has its own 2/29');
});

test('pickRediscover prefers 「N 年前的今天」', () => {
  const pick = pickRediscover(posts, now);
  assert.equal(pick.kind, 'onThisDay');
  assert.equal(pick.title, '一年前的今天');
  assert.deepEqual(pick.posts.map((p) => p.id), ['y1', 'y1b', 'y2']);
  const twoYears = pickRediscover([{ id: 'y2', savedAt: at(2024, 10, 29) }], now);
  assert.equal(twoYears.title, '2 年前的今天');
});

test('pickRediscover falls back to unopened old saves, stable for the day', () => {
  const rest = posts.filter((p) => !['y1', 'y1b', 'y2'].includes(p.id));
  const pick = pickRediscover(rest, now);
  assert.equal(pick.kind, 'forgotten');
  assert.deepEqual(pick.posts.map((p) => p.id).sort(), ['near', 'old'], 'recently opened and failed saves are skipped');
  assert.deepEqual(pickRediscover(rest, now + 3600 * 1000).posts, pick.posts, 'same day, same picks');
  assert.equal(pickRediscover([{ id: 'today', savedAt: now }], now), null);
});

test('seededShuffle is deterministic and keeps every item', () => {
  const list = [1, 2, 3, 4, 5, 6, 7, 8];
  const a = seededShuffle(list, 'seed');
  assert.deepEqual(a, seededShuffle(list, 'seed'));
  assert.deepEqual([...a].sort((x, y) => x - y), list);
  assert.notDeepEqual(a, seededShuffle(list, 'other'));
  assert.deepEqual(list, [1, 2, 3, 4, 5, 6, 7, 8], 'input untouched');
});

test('randomPicks: n browsable posts, a new round gives a new order', () => {
  const r0 = randomPicks(posts, now, 3);
  assert.equal(r0.length, 3);
  assert.ok(r0.every((p) => p.status !== 'failed'));
  assert.deepEqual(randomPicks(posts, now, 3), r0);
  assert.notDeepEqual(randomPicks(posts, now, 7, 1), randomPicks(posts, now, 7, 0));
});

test('dayKey and ageLabel', () => {
  assert.equal(dayKey(at(2026, 3, 5)), '2026-03-05');
  assert.equal(ageLabel(at(2026, 10, 29, 1), now), '今天');
  assert.equal(ageLabel(at(2026, 10, 26), now), '2 天前');
  assert.equal(ageLabel(at(2026, 8, 1), now), '2 個月前');
  assert.equal(ageLabel(at(2025, 10, 29, 21), now), '一年前');
  assert.equal(ageLabel(at(2023, 11, 1), now), '2 年前');
});
