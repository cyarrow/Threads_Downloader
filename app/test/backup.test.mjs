import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupFileName, makeBackup, parseBackup, planImport } from '../src/collection/backup.js';

let n = 0;
const newId = (prefix) => `${prefix}${++n}`;

const tags = [
  { id: 'a', name: '追星', parentId: null, color: 'rose', createdAt: 1 },
  { id: 'b', name: '某團', parentId: 'a', color: 'rose', createdAt: 2 },
];
const posts = [
  { id: 'p1', code: 'C1', url: 'u1', author: 'x', caption: 'hi', media: [{ type: 'image', url: 'm', poster: 'm', ratio: 1 }], cover: 'file:///c.jpg', featured: true, downloaded: false, savedAt: 5, tagIds: ['b'] },
  { id: 'p2', code: null, url: 'u2', status: 'loading', media: [], tagIds: [] },
];

test('makeBackup drops local cover paths and unfinished placeholders', () => {
  const b = makeBackup(posts, tags, [], 9);
  assert.equal(b.exportedAt, 9);
  assert.equal(b.posts.length, 1);
  assert.equal('cover' in b.posts[0], false);
  assert.deepEqual(b.posts[0].tagIds, ['b']);
});

test('parseBackup round-trips and rejects other files with a readable message', () => {
  const text = JSON.stringify(makeBackup(posts, tags));
  assert.equal(parseBackup(text).posts.length, 1);
  assert.throws(() => parseBackup('nope'), /不是收藏備份檔/);
  assert.throws(() => parseBackup('{"app":"other"}'), /不是 Threads 下載/);
  assert.throws(() => parseBackup(JSON.stringify({ ...makeBackup([], []), version: 99 })), /較新的版本/);
});

test('planImport reuses tags by name, creates missing ones, and skips saved posts', () => {
  const backup = makeBackup(posts, tags);
  // The target phone already has 追星 (different id) and post C1? No — only 追星.
  const existing = { tags: [{ id: 'X', name: '追星', parentId: null, color: 'sky' }], posts: [] };
  const plan = planImport(backup, existing, newId);
  assert.equal(plan.tagsToCreate.length, 1); // only 某團, under the existing 追星
  assert.equal(plan.tagsToCreate[0].parentId, 'X');
  assert.equal(plan.postsToInsert.length, 1);
  assert.deepEqual(plan.postsToInsert[0].tagIds, [plan.tagsToCreate[0].id]);
  assert.equal(plan.postsToInsert[0].fetchedAt, null);

  const again = planImport(backup, { tags: [...existing.tags, plan.tagsToCreate[0]], posts: plan.postsToInsert }, newId);
  assert.equal(again.tagsToCreate.length, 0);
  assert.equal(again.postsToInsert.length, 0);
  assert.equal(again.skipped, 1);
});

test('backupFileName is dated', () => {
  assert.equal(backupFileName(new Date(2026, 9, 30).getTime()), 'threads-collection-20261030.json');
});

test('version 2 carries notes and rules; planImport maps rules to the new tag ids and skips known ones', () => {
  const withNote = [{ ...posts[0], note: '為什麼收藏：燈光' }, { ...posts[0], id: 'p3', code: 'C3', note: '' }];
  const rules = [
    { id: 'r1', kind: 'author', value: 'x', tagId: 'b', createdAt: 3 },
    { id: 'r2', kind: 'keyword', value: '巡演', tagId: 'a', createdAt: 4 },
    { id: 'r3', kind: 'keyword', value: '舊', tagId: 'gone', createdAt: 5 },
  ];
  const b = makeBackup(withNote, tags, rules, 9);
  assert.equal(b.version, 2);
  assert.equal(b.posts[0].note, '為什麼收藏：燈光');
  assert.equal('note' in b.posts[1], false, 'no empty notes in the file');
  assert.deepEqual(b.rules[0], { kind: 'author', value: 'x', tagId: 'b', createdAt: 3 });

  const existing = {
    tags: [{ id: 'X', name: '追星', parentId: null, color: 'sky' }],
    posts: [],
    rules: [{ id: 'mine', kind: 'keyword', value: '巡演', tagId: 'X', createdAt: 1 }],
  };
  const plan = planImport(parseBackup(JSON.stringify(b)), existing, newId);
  const child = plan.tagsToCreate[0].id;
  assert.equal(plan.postsToInsert[0].note, '為什麼收藏：燈光');
  assert.equal(plan.postsToInsert[1].note, '');
  assert.deepEqual(plan.rulesToCreate.map((r) => [r.kind, r.value, r.tagId]), [['author', 'x', child]]);
  assert.match(plan.rulesToCreate[0].id, /^r/);
});

test('an existing post without a note gets the note from the backup; one with a note keeps it', () => {
  const b = makeBackup([{ ...posts[0], note: '備份裡的筆記' }], tags, []);
  const plan = planImport(b, { tags, posts: [{ id: 'mine', code: 'C1', note: '' }] }, newId);
  assert.equal(plan.skipped, 1);
  assert.deepEqual(plan.notesToFill, [{ id: 'mine', note: '備份裡的筆記' }]);
  const kept = planImport(b, { tags, posts: [{ id: 'mine', code: 'C1', note: '我的' }] }, newId);
  assert.deepEqual(kept.notesToFill, []);
});

test('version 1 backups (no notes, no rules) still import', () => {
  const v1 = {
    app: 'threads-downloader',
    version: 1,
    exportedAt: 1,
    tags: [{ id: 'a', name: '追星', parentId: null, color: 'rose', createdAt: 1 }],
    posts: [{ code: 'OLD', url: 'u', author: 'x', caption: 'hi', media: [], featured: false, downloaded: true, savedAt: 2, tagIds: ['a'] }],
  };
  const plan = planImport(parseBackup(JSON.stringify(v1)), { tags: [], posts: [] }, newId);
  assert.equal(plan.postsToInsert.length, 1);
  assert.equal(plan.postsToInsert[0].note, '');
  assert.deepEqual(plan.rulesToCreate, []);
  assert.deepEqual(plan.notesToFill, []);
});
