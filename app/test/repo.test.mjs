import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_VERSION, createMemoryRepo, createSqlRepo } from '../src/collection/repo.js';

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

    test('tag rename/recolor cascades color to children; delete and merge update posts', async () => {
      const repo = await setup();
      await repo.insertTag({ id: 'food', name: '美食', parentId: null, color: 'orange', createdAt: 3 });
      await repo.insertPost(post({ tagIds: ['fan-a', 'food'] }));
      await repo.updateTag('fan', { name: '偶像', color: 'sky' });
      let tags = await repo.listTags();
      assert.deepEqual(tags.filter((t) => t.id.startsWith('fan')).map((t) => [t.name, t.color]), [['偶像', 'sky'], ['某團', 'sky']]);
      await repo.mergeTag('food', 'fan');
      assert.deepEqual([...(await repo.listPosts())[0].tagIds].sort(), ['fan', 'fan-a']);
      await repo.deleteTag('fan');
      tags = await repo.listTags();
      assert.equal(tags.length, 0);
      assert.deepEqual((await repo.listPosts())[0].tagIds, []);
    });

    test('notes round-trip; empty means no note', async () => {
      const repo = await setup();
      await repo.insertPost(post({ note: '想去這間' }));
      await repo.insertPost(post({ id: 'p2', code: 'DEF', savedAt: 2000 }));
      let list = await repo.listPosts();
      assert.equal(list.find((p) => p.id === 'p1').note, '想去這間');
      assert.equal(list.find((p) => p.id === 'p2').note, '');
      await repo.updatePost('p2', { note: '第二篇\n第二行' });
      await repo.updatePost('p1', { note: '' });
      list = await repo.listPosts();
      assert.equal(list.find((p) => p.id === 'p1').note, '');
      assert.equal((await repo.findByCode('DEF')).note, '第二篇\n第二行');
    });

    test('tag rules round-trip, update and delete', async () => {
      const repo = await setup();
      await repo.insertRule({ id: 'r2', kind: 'keyword', value: '巡演', tagId: 'fan', createdAt: 20 });
      await repo.insertRule({ id: 'r1', kind: 'author', value: 'starlight.daily', tagId: 'fan-a', createdAt: 10 });
      assert.deepEqual(await repo.listRules(), [
        { id: 'r1', kind: 'author', value: 'starlight.daily', tagId: 'fan-a', createdAt: 10 },
        { id: 'r2', kind: 'keyword', value: '巡演', tagId: 'fan', createdAt: 20 },
      ]);
      await assert.rejects(repo.insertRule({ id: 'r3', kind: 'keyword', value: '巡演', tagId: 'fan', createdAt: 30 }));
      await repo.updateRule('r2', { value: '演唱會', tagId: 'fan-a', bogus: 1 });
      assert.deepEqual((await repo.listRules())[1], { id: 'r2', kind: 'keyword', value: '演唱會', tagId: 'fan-a', createdAt: 20 });
      await repo.deleteRule('r1');
      assert.deepEqual((await repo.listRules()).map((r) => r.id), ['r2']);
    });

    test('deleting a tag removes its rules (a 大標籤 takes its 小標籤 rules too)', async () => {
      const repo = await setup();
      await repo.insertTag({ id: 'food', name: '美食', parentId: null, color: 'orange', createdAt: 3 });
      await repo.insertRule({ id: 'r1', kind: 'author', value: 'a', tagId: 'fan-a', createdAt: 1 });
      await repo.insertRule({ id: 'r2', kind: 'author', value: 'b', tagId: 'fan', createdAt: 2 });
      await repo.insertRule({ id: 'r3', kind: 'keyword', value: '拉麵', tagId: 'food', createdAt: 3 });
      await repo.deleteTag('fan');
      assert.deepEqual((await repo.listRules()).map((r) => r.id), ['r3']);
    });

    test('merging a tag re-points its rules and drops exact duplicates', async () => {
      const repo = await setup();
      await repo.insertTag({ id: 'idol', name: '偶像', parentId: null, color: 'sky', createdAt: 3 });
      await repo.insertRule({ id: 'r1', kind: 'author', value: 'a', tagId: 'idol', createdAt: 1 });
      await repo.insertRule({ id: 'r2', kind: 'author', value: 'b', tagId: 'idol', createdAt: 2 });
      await repo.insertRule({ id: 'r3', kind: 'author', value: 'a', tagId: 'fan', createdAt: 3 });
      await repo.mergeTag('idol', 'fan');
      assert.deepEqual((await repo.listRules()).map((r) => [r.id, r.value, r.tagId]), [['r2', 'b', 'fan'], ['r3', 'a', 'fan']]);
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

describe('sqlite migration from schema 1', () => {
  test('init adds posts.note and tag_rules to an existing database, keeping its data', async () => {
    const driver = nodeDriver();
    await driver.execAsync(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE posts (id TEXT PRIMARY KEY NOT NULL, code TEXT UNIQUE, url TEXT NOT NULL, author TEXT, caption TEXT,
        media TEXT NOT NULL DEFAULT '[]', cover TEXT, status TEXT NOT NULL DEFAULT 'loading', error TEXT,
        featured INTEGER NOT NULL DEFAULT 0, downloaded INTEGER NOT NULL DEFAULT 0, saved_at INTEGER NOT NULL, fetched_at INTEGER);
      CREATE TABLE tags (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, parent_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
        color TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE post_tags (post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY (post_id, tag_id));
      CREATE TABLE meta (key TEXT PRIMARY KEY NOT NULL, value TEXT);
      INSERT INTO meta VALUES ('schema_version', '1');
      INSERT INTO tags VALUES ('fan', '追星', NULL, 'rose', 1);
      INSERT INTO posts (id, code, url, author, caption, status, saved_at) VALUES ('old', 'OLD', 'u', 'a', '舊的', 'ready', 5);
      INSERT INTO post_tags VALUES ('old', 'fan');
    `);
    const repo = createSqlRepo(driver);
    await repo.init();
    await repo.init(); // a second launch must not try to add the column again
    const [old] = await repo.listPosts();
    assert.equal(old.note, '');
    assert.deepEqual(old.tagIds, ['fan']);
    await repo.updatePost('old', { note: '升級後的筆記' });
    assert.equal((await repo.findByCode('OLD')).note, '升級後的筆記');
    await repo.insertRule({ id: 'r', kind: 'author', value: 'a', tagId: 'fan', createdAt: 1 });
    await repo.deleteTag('fan');
    assert.deepEqual(await repo.listRules(), []);
    assert.equal(await repo.getMeta('schema_version'), String(SCHEMA_VERSION));
  });
});

test('writes that start together run one after another (expo-sqlite transactions are not exclusive)', async () => {
  const db = new DatabaseSync(':memory:');
  const tick = () => new Promise((r) => setTimeout(r, 1)); // a native call takes a moment
  const driver = {
    execAsync: async (sql) => { await tick(); return db.exec(sql); },
    runAsync: async (sql, p = []) => { await tick(); return db.prepare(sql).run(...p); },
    getAllAsync: async (sql, p = []) => { await tick(); return db.prepare(sql).all(...p); },
    getFirstAsync: async (sql, p = []) => { await tick(); return db.prepare(sql).get(...p) ?? null; },
    // As in expo-sqlite's SQLiteDatabase.withTransactionAsync.
    async withTransactionAsync(task) {
      try { await this.execAsync('BEGIN'); await task(); await this.execAsync('COMMIT'); }
      catch (e) { try { await this.execAsync('ROLLBACK'); } catch {} throw e; }
    },
  };
  const repo = createSqlRepo(driver);
  await repo.init();
  for (const id of ['t1', 't2']) await repo.insertTag({ id, name: id, parentId: null, color: 'rose', createdAt: 1 });
  await Promise.all(['A', 'B', 'C'].map((id) => repo.insertPost({ id, code: id, url: 'u', savedAt: 1, tagIds: [] })));
  await Promise.all([repo.setPostTags('A', ['t1']), repo.setPostTags('B', ['t2']), repo.updatePost('C', { note: 'n' }), repo.setPostTags('C', ['t1', 't2'])]);
  const posts = Object.fromEntries((await repo.listPosts()).map((p) => [p.id, p]));
  assert.deepEqual(posts.A.tagIds, ['t1']);
  assert.deepEqual(posts.B.tagIds, ['t2']);
  assert.deepEqual(posts.C.tagIds.sort(), ['t1', 't2']);
  assert.equal(posts.C.note, 'n');
  // A failing write doesn't block the ones after it.
  await assert.rejects(repo.insertPost({ id: 'A', code: 'Z', url: 'u', savedAt: 1 }));
  await repo.setPostTags('A', ['t2']);
  assert.deepEqual((await repo.findByCode('A')).tagIds, ['t2']);
});
