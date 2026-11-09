// Inputs from outside the app that must not be trusted: imported backup files,
// the update feed, page URLs in the hidden WebViews, and shortcodes that end up
// in file names. Found in the security review (graphify + code reading).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planImport } from '../src/collection/backup.js';
import { parseRelease } from '../src/updates.js';
import { fileName, isThreadsPage } from '../src/threads.js';

let n = 0;
const newId = (prefix) => `${prefix}${++n}`;
const backupWith = (posts) => ({ app: 'threads-downloader', version: 2, tags: [], posts });
const ok = { code: 'GOOD1', url: 'https://www.threads.net/@a/post/GOOD1', author: 'a', caption: 'c', media: [], tagIds: [] };

test('a hostile backup cannot point 開啟 at another app or site', () => {
  const plan = planImport(
    backupWith([
      ok,
      { ...ok, code: 'JS1', url: 'javascript:alert(1)' },
      { ...ok, code: 'INT1', url: 'intent://scan/#Intent;scheme=zxing;end' },
      { ...ok, code: 'WEB1', url: 'https://evil.example/@a/post/WEB1' },
      { ...ok, code: '../../files/SQLite/x', url: 'https://www.threads.com/@a/post/X1' },
      { ...ok, code: { not: 'a string' } },
    ]),
    { tags: [], posts: [] },
    newId,
  );
  assert.equal(plan.postsToInsert.length, 1);
  assert.equal(plan.postsToInsert[0].url, 'https://www.threads.com/@a/post/GOOD1');
  assert.equal(plan.skipped, 5);
});

test('imported media keeps only https links and plain values', () => {
  const plan = planImport(
    backupWith([
      {
        ...ok,
        author: { x: 1 },
        media: [
          { type: 'image', url: 'file:///data/user/0/app/databases/collection.db' },
          { type: 'video', url: 'https://cdn/v.mp4', poster: 'content://x', width: '9', ratio: 1.2 },
          null,
        ],
      },
    ]),
    { tags: [], posts: [] },
    newId,
  );
  const p = plan.postsToInsert[0];
  assert.equal(p.author, '');
  assert.deepEqual(p.media, [{ type: 'video', url: 'https://cdn/v.mp4', width: undefined, height: undefined, thumb: undefined, poster: undefined, ratio: 1.2 }]);
});

test('updates are only offered from a GitHub release download link', () => {
  const rel = (url) => ({ tag_name: 'build-99', name: 'x', assets: [{ name: 'a.apk', browser_download_url: url, size: 1 }] });
  assert.ok(parseRelease(rel('https://github.com/cyarrow/Threads_Downloader/releases/download/build-99/a.apk')));
  assert.equal(parseRelease(rel('https://evil.example/a.apk')), null);
  assert.equal(parseRelease(rel('http://github.com/o/r/releases/download/b/a.apk')), null);
  assert.equal(parseRelease(rel('https://github.com.evil.example/o/r/releases/download/b/a.apk')), null);
});

test('only Threads pages are trusted in the hidden WebViews', () => {
  assert.equal(isThreadsPage('https://www.threads.com/@a/post/X'), true);
  assert.equal(isThreadsPage('https://threads.net/'), true);
  assert.equal(isThreadsPage('https://www.instagram.com/accounts/login/'), false);
  assert.equal(isThreadsPage('https://threads.com.evil.example/'), false);
  assert.equal(isThreadsPage('http://www.threads.com/'), false);
  assert.equal(isThreadsPage(undefined), false);
});

test('a shortcode never adds path segments to a saved file name', () => {
  const name = fileName('../../evil', 0, { type: 'image', url: 'https://x/a.jpg' });
  assert.equal(name.includes('/'), false);
  assert.equal(name, 'threads_______evil_1.jpg');
});
