import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRIORITY, enqueue, requeueFront, shouldPreempt } from '../src/collection/fetchQueue.js';
import { fetchedFields, needsRefresh } from '../src/collection/collectionModel.js';

const it = (id, priority) => ({ id, priority });
const ids = (q) => q.map((x) => x.id);

test('a new save goes ahead of resumed and background reads, in order within a level', () => {
  let q = [];
  for (const x of [it('bg1', PRIORITY.low), it('bg2', PRIORITY.low), it('old', PRIORITY.normal), it('new1', PRIORITY.high), it('bg3'), it('new2', PRIORITY.high)]) q = enqueue(q, x);
  assert.deepEqual(ids(q), ['new1', 'new2', 'old', 'bg1', 'bg2', 'bg3']);
});

test('an interrupted job goes back to the front of its level', () => {
  const q = [it('new', PRIORITY.high), it('bg2', PRIORITY.low)];
  assert.deepEqual(ids(requeueFront(q, it('bg1', PRIORITY.low))), ['new', 'bg1', 'bg2']);
  assert.deepEqual(ids(requeueFront([], it('bg1', PRIORITY.low))), ['bg1']);
});

test('only a more urgent item interrupts the running job', () => {
  assert.equal(shouldPreempt(it('bg', PRIORITY.low), it('new', PRIORITY.high)), true);
  assert.equal(shouldPreempt(it('a', PRIORITY.high), it('b', PRIORITY.high)), false);
  assert.equal(shouldPreempt(null, it('b', PRIORITY.high)), false);
});

test('a text-only post that was read is not read again on every launch', () => {
  const text = { status: 'ready', ...fetchedFields({ code: 'T', author: 'a', caption: 'words', media: [] }) };
  assert.equal(needsRefresh(text), false);
  assert.equal(needsRefresh({ status: 'ready', media: [], fetchedAt: null }), true); // migrated / imported
  assert.equal(needsRefresh({ status: 'loading', media: [], fetchedAt: null }), true);
  assert.equal(needsRefresh({ status: 'failed', media: [], fetchedAt: null }), false);
});
