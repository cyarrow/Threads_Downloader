import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTagDiff,
  cycleState,
  diffStates,
  pruneSelection,
  removePosts,
  restorePosts,
  splitDownloadable,
  tagStates,
  toggleId,
} from '../src/collection/batch.js';

const posts = [
  { id: 'a', tagIds: ['fan', 'life'], media: [{}] },
  { id: 'b', tagIds: ['fan'], media: [{}], status: 'sourceDeleted' },
  { id: 'c', tagIds: [], media: [] },
  { id: 'd', tagIds: ['food'], media: [{}] },
];

test('toggleId adds and removes; pruneSelection drops hidden ids', () => {
  assert.deepEqual(toggleId(['a'], 'b'), ['a', 'b']);
  assert.deepEqual(toggleId(['a', 'b'], 'a'), ['b']);
  const sel = ['a', 'c'];
  assert.equal(pruneSelection(sel, posts), sel, 'unchanged selection keeps identity');
  assert.deepEqual(pruneSelection(sel, [posts[0]]), ['a']);
});

test('tagStates: all / some across the selection', () => {
  assert.deepEqual(tagStates(posts, ['a', 'b']), { fan: 'all', life: 'some' });
  assert.deepEqual(tagStates(posts, ['a', 'b', 'c']), { fan: 'some', life: 'some' });
  assert.deepEqual(tagStates(posts, ['c']), {});
});

test('cycleState: mixed tags can return to "leave as is"', () => {
  assert.equal(cycleState('some', 'some'), 'all');
  assert.equal(cycleState('all', 'some'), 'none');
  assert.equal(cycleState('none', 'some'), 'some');
  assert.equal(cycleState('none', 'none'), 'all');
  assert.equal(cycleState('all', 'none'), 'none');
  assert.equal(cycleState('none', 'all'), 'all');
});

test('diffStates lists only real changes', () => {
  const initial = { fan: 'all', life: 'some' };
  assert.deepEqual(diffStates(initial, { fan: 'all', life: 'some' }), { add: [], remove: [] });
  assert.deepEqual(diffStates(initial, { fan: 'none', life: 'all', food: 'all' }), { add: ['life', 'food'], remove: ['fan'] });
  assert.deepEqual(diffStates(initial, { fan: 'all', life: 'none', food: 'none' }), { add: [], remove: ['life'] });
});

test('applyTagDiff edits only selected posts and never duplicates a tag', () => {
  const out = applyTagDiff(posts, ['a', 'c'], { add: ['fan', 'food'], remove: ['life'] });
  assert.deepEqual(out.map((p) => p.tagIds), [['fan', 'food'], ['fan'], ['fan', 'food'], ['food']]);
  assert.equal(out[1], posts[1], 'unselected posts keep identity');
});

test('removePosts + restorePosts put posts back where they were', () => {
  const { kept, removed } = removePosts(posts, ['b', 'd']);
  assert.deepEqual(kept.map((p) => p.id), ['a', 'c']);
  assert.deepEqual(restorePosts(kept, removed).map((p) => p.id), ['a', 'b', 'c', 'd']);
  const { kept: k2, removed: r2 } = removePosts(posts, ['a']);
  assert.deepEqual(restorePosts([{ id: 'new', tagIds: [] }, ...k2], r2).map((p) => p.id)[0], 'a');
});

test('splitDownloadable skips deleted sources and text-only posts', () => {
  const { ok, skipped } = splitDownloadable(posts, ['a', 'b', 'c']);
  assert.deepEqual(ok.map((p) => p.id), ['a']);
  assert.deepEqual(skipped.map((p) => p.id), ['b', 'c']);
});
