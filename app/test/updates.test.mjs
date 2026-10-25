import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkForUpdate, parseRelease } from '../src/updates.js';

const release = {
  tag_name: 'build-42',
  name: 'Threads 下載 1.1.0 (build 42)',
  body: ' Fix things \n',
  html_url: 'https://github.com/o/r/releases/tag/build-42',
  assets: [
    { name: 'notes.txt', browser_download_url: 'https://x/notes.txt' },
    { name: 'threads-downloader-1.1.0-42.apk', browser_download_url: 'https://x/app.apk' },
  ],
};

const fakeFetch = (status, body) => async () => ({ ok: status === 200, json: async () => body });

test('parseRelease reads the build number and APK asset', () => {
  assert.deepEqual(parseRelease(release), {
    build: 42,
    name: 'Threads 下載 1.1.0 (build 42)',
    notes: 'Fix things',
    apkUrl: 'https://x/app.apk',
    pageUrl: 'https://github.com/o/r/releases/tag/build-42',
  });
});

test('parseRelease ignores drafts, prereleases, other tags, and releases without an APK', () => {
  assert.equal(parseRelease({ ...release, draft: true }), null);
  assert.equal(parseRelease({ ...release, prerelease: true }), null);
  assert.equal(parseRelease({ ...release, tag_name: 'v1.0' }), null);
  assert.equal(parseRelease({ ...release, assets: [] }), null);
  assert.equal(parseRelease(null), null);
});

test('checkForUpdate only reports strictly newer builds', async () => {
  assert.equal((await checkForUpdate('o/r', 41, fakeFetch(200, release))).build, 42);
  assert.equal(await checkForUpdate('o/r', 42, fakeFetch(200, release)), null);
  assert.equal(await checkForUpdate('o/r', 50, fakeFetch(200, release)), null);
});

test('checkForUpdate swallows HTTP and network failures', async () => {
  assert.equal(await checkForUpdate('o/r', 1, fakeFetch(404, {})), null);
  assert.equal(await checkForUpdate('o/r', 1, async () => { throw new Error('offline'); }), null);
});
