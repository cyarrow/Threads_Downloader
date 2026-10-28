import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAdvance, enqueue } from '../src/queueModel.js';

test('enqueue appends in order and skips posts already running or waiting', () => {
  const a = { url: 'https://www.threads.com/t/A', fromShare: true };
  const b = { url: 'https://www.threads.com/t/B', fromShare: false };
  let q = enqueue([], a, null);
  q = enqueue(q, b, null);
  assert.deepEqual(q, [a, b]);
  assert.equal(enqueue(q, { ...a }, null), q);
  assert.equal(enqueue([], a, a.url).length, 0);
});

test('canAdvance waits for the current post and pauses on errors', () => {
  assert.equal(canAdvance('idle', false), true);
  assert.equal(canAdvance('done', false), true);
  assert.equal(canAdvance('loading', true), false);
  assert.equal(canAdvance('choosing', false), false);
  assert.equal(canAdvance('saving', false), false);
  assert.equal(canAdvance('error', false), false);
});
