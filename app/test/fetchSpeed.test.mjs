import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSpeedTracker, speedLabel } from '../src/collection/fetchSpeed.js';

test('median of recent reads, keeping the last 20', () => {
  const s = createSpeedTracker();
  assert.equal(s.summary(), null);
  assert.equal(speedLabel(s.summary()), null);
  [3000, 1000, 2000].forEach((ms) => s.record(ms));
  assert.deepEqual(s.summary(), { count: 3, median: 2000 });
  s.record(4000);
  assert.equal(s.summary().median, 2500);
  for (let i = 0; i < 30; i++) s.record(500);
  assert.deepEqual(s.summary(), { count: 20, median: 500 });
  s.record(-1);
  s.record(NaN);
  assert.equal(s.summary().count, 20);
  assert.equal(speedLabel({ count: 8, median: 2420 }), '約 2.4 秒（最近 8 篇）');
});
