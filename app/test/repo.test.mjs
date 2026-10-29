import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createMemoryRepo, createSqlRepo } from '../src/collection/repo.js';

// Same async surface as expo-sqlite, backed by Node's built-in SQLite.
function nodeDriver() {
  const db = new DatabaseSync(':memory:');
  return {
    execAsync: async (sql) => db.exec(sql),
    runAsync: async (sql, params = []) => db.prepare(sql).run(...params),
    getAllAsync: async (sql, params = []) => db.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => db.prepare(sql).get(...params) ?? null,
    withTransactionAsync: async (task) => {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

const post = (over = {}) => ({
  id: 'p1',
  code: 'ABC',
  url: 'https://www.threads.com/@a/post/ABC',
  author: 'a',
  caption: 'hello',
  media: [{ type: 'image', url: 'https://cdn/x.jpg', poster: 'https://cdn/x.jpg', ratio: 1.25 }],
  status: 'ready',
  savedAt: 1000,
  tagIds: [],
  ...over,
});

for (const [name, make] of [
  ['sqlite', () => createSqlRepo(nodeDriver())],
  ['memory', () => createMemoryRepo()],
]) {
  describe(`repo contract: ${name}`, () => {
    const setup = async () => {
      const repo = make();
      await repo.init();
      await repo.init(); // idempotent
      await repo.insertTag({ id: 'fan', name: '追星', parentId: null, color: 'rose', createdAt: 1 });
      await repo.insertTag({ id: 'fan-a', name: '某團', parentId: 'fan', color: 'rose', createdAt: 2 });
      return repo;
    };

    test('posts round-trip with media, flags and tags, newest first', async () => {
      const repo = await setup();
      await repo.insertPost(post({ tagIds: ['fan-a'] }));
      await repo.insertPost(post({ id: 'p2', code: 'DEF', savedAt: 2000, featured: true }));
      const list = await repo.listPosts();
      assert.deepEqual(list.map((p) => p.id), ['p2', 'p1']);
      assert.equal(list[0].featured, true);
      assert.equal(list[1].featured, false);
      assert.deepEqual(list[1].tagIds, ['fan-a']);
      assert.deepEqual(list[1].media[0], { type: 'image', url: 'https://cdn/x.jpg', poster: 'https://cdn/x.jpg', ratio: 1.25 });
      assert.deepEqual((await repo.listTags()).map((t) => [t.id, t.parentId]), [['fan', null], ['fan-a', 'fan']]);
    });

    test('loading placeholders may share a null code; real codes stay unique', async () => {
      const repo = await setup();
      await repo.insertPost(post({ id: 'x1', code: null, status: 'loading', media: [] }));
      await repo.insertPost(post({ id: 'x2', code: null, status: 'loading', media: [] }));
      await repo.insertPost(post());
      await assert.rejects(repo.insertPost(post({ id: 'dup' })));
      assert.equal((await repo.listPosts()).length, 3);
    });

    test('updatePost patches only known fields; findByCode returns tags', async () => {
      const repo = await setup();
      await repo.insertPost(post({ id: 'x', code: null, status: 'loading', media: [] }));
      await repo.updatePost('x', { code: 'NEW', status: 'ready', downloaded: true, caption: '更新', bogus: 1 });
      await repo.setPostTags('x', ['fan', 'fan-a']);
      const found = await repo.findByCode('NEW');
      assert.equal(found.status, 'ready');
      assert.equal(found.downloaded, true);
      assert.equal(found.caption, '更新');
      assert.deepEqual([...found.tagIds].sort(), ['fan', 'fan-a']);
      assert.equal(await repo.findByCode('MISSING'), null);
    });

    test('setPostTags replaces; deletePost removes the post and its tag links', async () => {
      const repo = await setup();
      await repo.insertPost(post({ tagIds: ['fan'] }));
      await repo.setPostTags('p1', ['fan-a']);
      assert.deepEqual((await repo.listPosts())[0].tagIds, ['fan-a']);
      await repo.deletePost('p1');
      assert.equal((await repo.listPosts()).length, 0);
      await repo.insertPost(post()); // same id/code can be saved again after delete (undo)
      assert.deepEqual((await repo.listPosts())[0].tagIds, []);
    });

    test('meta values upsert', async () => {
      const repo = await setup();
      assert.equal(await repo.getMeta('k'), null);
      await repo.setMeta('k', '1');
      await repo.setMeta('k', '2');
      assert.equal(await repo.getMeta('k'), '2');
    });
  });
}
