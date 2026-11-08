import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryRepo } from '../src/collection/repo.js';
import { WRITE_METHODS, guardRepo } from '../src/collection/safeRepo.js';

const post = (id, extra = {}) => ({ id, code: id, url: `u${id}`, author: 'a', caption: 'c', media: [], featured: false, downloaded: false, savedAt: 1, tagIds: [], ...extra });

test('every repo write method is guarded', () => {
  const repo = createMemoryRepo();
  for (const name of WRITE_METHODS) assert.equal(typeof repo[name], 'function', name);
});

test('a failing write is reported once and resolves instead of throwing', async () => {
  const raw = createMemoryRepo();
  await raw.init();
  const failures = [];
  const repo = guardRepo(raw, (error, method) => failures.push([method, error.message]));
  await repo.insertPost(post('p1'));
  // A duplicate id hits the memory repo's UNIQUE check, like SQLite would.
  const result = await repo.insertPost(post('p1'));
  assert.equal(result, undefined);
  assert.deepEqual(failures, [['insertPost', 'UNIQUE constraint failed']]);
});

test('successful writes and reads pass through unchanged', async () => {
  const raw = createMemoryRepo();
  await raw.init();
  const failures = [];
  const repo = guardRepo(raw, (e, m) => failures.push(m));
  await repo.insertPost(post('p1'));
  await repo.setMeta('recent', '["t1"]');
  assert.equal((await repo.listPosts()).length, 1);
  assert.equal(await repo.getMeta('recent'), '["t1"]');
  assert.equal((await repo.findByCode('p1')).id, 'p1');
  assert.deepEqual(failures, []);
});
