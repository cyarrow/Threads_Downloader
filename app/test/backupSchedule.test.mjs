import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoBackupFileName, backupFileName, backupNameKey, isBackupFileName } from '../src/collection/backup.js';
import {
  KEEP_BACKUPS,
  RETRY_AFTER_FAILURE_MS,
  backupReminder,
  collectionMarker,
  folderLabel,
  formatBackupTime,
  nameFromDocumentUri,
  planPrune,
  rememberFile,
  resolveBackupFiles,
  shouldAutoBackup,
} from '../src/collection/backupSchedule.js';

// Local-time dates so the tests pass in any time zone.
const at = (y, mo, d, h = 12, mi = 0, s = 0) => new Date(y, mo - 1, d, h, mi, s).getTime();
const DAY = 24 * 3600 * 1000;

const tags = [{ id: 't1', name: '美食', parentId: null, color: 'rose', createdAt: 1 }];
const post = (code, extra = {}) => ({ id: `p${code}`, code, url: `u${code}`, author: 'a', caption: 'c', media: [], featured: false, downloaded: false, savedAt: 1, tagIds: [], ...extra });

test('auto backup file names carry the time and match our pattern', () => {
  const now = at(2026, 11, 2, 14, 2, 9);
  assert.equal(autoBackupFileName(now), 'threads-collection-20261102-140209.json');
  assert.ok(isBackupFileName(autoBackupFileName(now)));
  assert.ok(isBackupFileName(backupFileName(now)));
  assert.ok(isBackupFileName('threads-collection-20261102-140209 (1).json'));
  for (const other of ['notes.json', 'threads-collection-2026.json', 'threads-collection-20261102.json.bak', 'my threads-collection-20261102.json']) {
    assert.equal(isBackupFileName(other), false, other);
  }
  assert.ok(backupNameKey('threads-collection-20261102-140209.json') > backupNameKey('threads-collection-20261102.json'));
  assert.ok(backupNameKey('threads-collection-20261102-140209 (1).json') > backupNameKey('threads-collection-20261102-140209.json'));
});

test('collectionMarker changes with curation, not with refreshed media links', () => {
  const base = collectionMarker([post('A'), post('B')], tags);
  assert.equal(collectionMarker([post('B'), post('A')], tags), base, 'order does not matter');
  assert.equal(collectionMarker([post('A', { media: [{ url: 'new-signed-link' }] }), post('B')], tags), base);
  assert.equal(collectionMarker([post('A'), post('B'), { id: 'x', code: null, status: 'loading' }], tags), base, 'placeholders ignored');
  assert.notEqual(collectionMarker([post('A', { tagIds: ['t1'] }), post('B')], tags), base);
  assert.notEqual(collectionMarker([post('A', { featured: true }), post('B')], tags), base);
  assert.notEqual(collectionMarker([post('A')], tags), base);
  assert.notEqual(collectionMarker([post('A'), post('B')], [{ ...tags[0], name: '吃' }]), base);
});

test('shouldAutoBackup: once per day, only after changes, not right after a failure', () => {
  const now = at(2026, 11, 2, 9);
  const ok = { folderUri: 'content://x/tree/y', lastAt: at(2026, 11, 1, 22), lastMarker: 'm1', marker: 'm2', lastFailedAt: null, now };
  assert.equal(shouldAutoBackup(ok), true);
  assert.equal(shouldAutoBackup({ ...ok, folderUri: null }), false, 'auto backup off');
  assert.equal(shouldAutoBackup({ ...ok, lastAt: at(2026, 11, 2, 0, 5) }), false, 'already backed up today');
  assert.equal(shouldAutoBackup({ ...ok, marker: 'm1' }), false, 'nothing changed');
  assert.equal(shouldAutoBackup({ ...ok, lastAt: null, lastMarker: null }), true, 'first backup');
  assert.equal(shouldAutoBackup({ ...ok, lastFailedAt: now - 60 * 1000 }), false, 'just failed');
  assert.equal(shouldAutoBackup({ ...ok, lastFailedAt: now - RETRY_AFTER_FAILURE_MS }), true);
});

test('names are read from path-like document URIs only', () => {
  const tree = 'content://com.android.externalstorage.documents/tree/primary%3ADownload%2FThreads';
  assert.equal(nameFromDocumentUri(`${tree}/document/primary%3ADownload%2FThreads%2Fthreads-collection-20261102.json`), 'threads-collection-20261102.json');
  assert.equal(nameFromDocumentUri('content://com.android.providers.downloads.documents/tree/downloads/document/raw%3A%2Fstorage%2Femulated%2F0%2FDownload%2Fa.json'), 'a.json');
  assert.equal(isBackupFileName(nameFromDocumentUri('content://com.android.providers.downloads.documents/document/msf%3A1234')), false);
  assert.equal(isBackupFileName(nameFromDocumentUri('content://com.google.android.apps.docs.storage/document/acc%3D1%3Bdoc%3Dencoded%3Dabc')), false);
});

test('pruning keeps the newest five of our files and never touches anything else', () => {
  const dir = 'content://com.android.externalstorage.documents/tree/primary%3ABk/document/primary%3ABk%2F';
  const names = [
    'threads-collection-20261020-090000.json',
    'threads-collection-20261025.json',
    'threads-collection-20261027-210000.json',
    'threads-collection-20261029-210000.json',
    'threads-collection-20261030-210000.json',
    'threads-collection-20261031-210000.json',
    'threads-collection-20261101-210000.json',
    'notes.json',
    'threads-collection-final.json',
  ];
  const uris = names.map((n) => dir + encodeURIComponent(n));
  const opaque = 'content://com.google.android.apps.docs.storage/document/acc%3D1%3Bdoc%3D99';
  const unknownOpaque = 'content://com.google.android.apps.docs.storage/document/acc%3D1%3Bdoc%3D98';
  const own = [{ uri: opaque, name: 'threads-collection-20261102-080000.json' }];
  const files = resolveBackupFiles([...uris, opaque, unknownOpaque], own);
  assert.equal(files.length, 8, 'own opaque file is known; unknown opaque one is skipped; non-matching names skipped');
  const del = planPrune(files);
  assert.deepEqual(
    del.map((f) => f.name),
    ['threads-collection-20261027-210000.json', 'threads-collection-20261025.json', 'threads-collection-20261020-090000.json'],
  );
  assert.equal(files.length - del.length, KEEP_BACKUPS);
  assert.ok(!del.some((f) => f.uri === opaque), 'newest (own) file kept');
  assert.deepEqual(planPrune(files.slice(0, 3)), []);
});

test('rememberFile keeps a bounded newest-first list without duplicates', () => {
  let list = [];
  for (let i = 0; i < 25; i++) list = rememberFile(list, { uri: `u${i}`, name: `n${i}` });
  assert.equal(list.length, 20);
  assert.equal(list[0].uri, 'u24');
  list = rememberFile(list, { uri: 'u20', name: 'n20' });
  assert.equal(list.filter((f) => f.uri === 'u20').length, 1);
  assert.equal(list[0].uri, 'u20');
});

test('folderLabel names common folders in a short readable way', () => {
  assert.equal(folderLabel('content://com.android.externalstorage.documents/tree/primary%3ADownload%2FThreads%E5%82%99%E4%BB%BD'), 'Download/Threads備份');
  assert.equal(folderLabel('content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FBackup%2FThreads/'), 'Backup/Threads');
  assert.equal(folderLabel('content://com.android.externalstorage.documents/tree/primary%3A'), '內部儲存空間');
  assert.equal(folderLabel('content://com.android.externalstorage.documents/tree/1A2B-3C4D%3ABackups'), 'SD 卡/Backups');
  assert.equal(folderLabel('content://com.android.providers.downloads.documents/tree/downloads'), '下載/downloads');
  assert.equal(folderLabel('content://com.android.providers.downloads.documents/tree/msf%3A33'), '下載');
  assert.equal(folderLabel('content://com.google.android.apps.docs.storage/tree/acc%3D1%3Bdoc%3Dencoded%3Dxyz'), '雲端硬碟');
  assert.equal(folderLabel('content://com.google.android.apps.docs.storage/tree/Threads%E5%82%99%E4%BB%BD'), '雲端硬碟/Threads備份');
  assert.equal(folderLabel(null), '');
});

test('formatBackupTime reads like 今天 14:02', () => {
  const now = at(2026, 11, 2, 18);
  assert.equal(formatBackupTime(null, now), '還沒有');
  assert.equal(formatBackupTime(at(2026, 11, 2, 14, 2), now), '今天 14:02');
  assert.equal(formatBackupTime(at(2026, 11, 1, 9, 5), now), '昨天 09:05');
  assert.equal(formatBackupTime(at(2026, 3, 7, 21, 30), now), '3/7 21:30');
  assert.equal(formatBackupTime(at(2025, 12, 31, 21, 30), now), '2025/12/31');
});

test('backupReminder: off, ≥20 posts, 30 days without a backup; wall note once per 30 days', () => {
  const now = at(2026, 11, 2);
  const many = Array.from({ length: 20 }, (_, i) => post(`P${i}`, { savedAt: now - 90 * DAY }));
  const base = { autoOn: false, lastBackupAt: now - 31 * DAY, posts: many, noteShownAt: null, now };
  assert.deepEqual(
    [backupReminder(base).settings, backupReminder(base).wall],
    [true, true],
  );
  assert.equal(backupReminder({ ...base, autoOn: true }).settings, false, 'auto backup on');
  assert.equal(backupReminder({ ...base, posts: many.slice(1) }).settings, false, 'fewer than 20 posts');
  assert.equal(backupReminder({ ...base, posts: [...many.slice(1), { id: 'x', code: null }] }).settings, false, 'placeholders do not count');
  assert.equal(backupReminder({ ...base, lastBackupAt: now - 29 * DAY }).settings, false, 'recent backup');
  const shown = backupReminder({ ...base, noteShownAt: now - 10 * DAY });
  assert.deepEqual([shown.settings, shown.wall], [true, false], 'wall note already shown this month');
  assert.equal(backupReminder({ ...base, noteShownAt: now - 30 * DAY }).wall, true);
  // Never backed up: counted from the first save, so a brand-new collection isn't nagged.
  const fresh = Array.from({ length: 25 }, (_, i) => post(`F${i}`, { savedAt: now - 5 * DAY }));
  assert.equal(backupReminder({ ...base, lastBackupAt: null, posts: fresh }).settings, false);
  const never = backupReminder({ ...base, lastBackupAt: null });
  assert.equal(never.settings, true);
  assert.equal(never.never, true);
  assert.equal(never.count, 20);
});
