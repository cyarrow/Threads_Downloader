import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summary, timeAgo, upsertHistory } from '../src/historyModel.js';

test('upsertHistory puts the newest first, dedupes by post, and caps the length', () => {
  const list = [{ code: 'A' }, { code: 'B' }, { code: 'C' }];
  assert.deepEqual(upsertHistory(list, { code: 'B', n: 2 }).map((e) => e.code), ['B', 'A', 'C']);
  assert.deepEqual(upsertHistory(list, { code: 'D' }, 3).map((e) => e.code), ['D', 'A', 'B']);
});

test('summary names videos and images in Chinese', () => {
  assert.equal(summary({ videos: 1, images: 0 }), '1 部影片');
  assert.equal(summary({ videos: 2, images: 3 }), '2 部影片、3 張圖片');
  assert.equal(summary({ images: 4 }), '4 張圖片');
});

test('timeAgo uses short relative times, then a date', () => {
  const now = new Date(2026, 9, 25, 12, 0, 0).getTime();
  assert.equal(timeAgo(now - 5000, now), '剛剛');
  assert.equal(timeAgo(now - 5 * 60000, now), '5 分鐘前');
  assert.equal(timeAgo(now - 3 * 3600000, now), '3 小時前');
  assert.equal(timeAgo(now - 2 * 86400000, now), '2 天前');
  assert.equal(timeAgo(new Date(2026, 8, 3).getTime(), now), '9月3日');
});
