import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  apkFileName,
  checkDownload,
  downloadFailure,
  lacksSpace,
  progressChanged,
  progressFraction,
  progressLabel,
  staleApkNames,
} from '../src/updateInstall.js';

const MB = 1024 * 1024;

test('update files are named per build and older ones are cleared', () => {
  assert.equal(apkFileName(32), 'update-32.apk');
  assert.deepEqual(staleApkNames(['update-27.apk', 'update-32.apk', 'cover.jpg', 'update-x.apk'], 'update-32.apk'), ['update-27.apk']);
});

test('a download must match the release size, else the Content-Length', () => {
  assert.equal(checkDownload({ size: 47 * MB, expected: 47 * MB, total: 47 * MB }), null);
  assert.equal(checkDownload({ size: 20 * MB, expected: 47 * MB, total: -1 }), 'incomplete');
  assert.equal(checkDownload({ size: 0, expected: 0, total: -1 }), 'incomplete');
  assert.equal(checkDownload({ size: 10, expected: 0, total: 12 }), 'incomplete');
  assert.equal(checkDownload({ size: 10, expected: 0, total: -1 }), null);
});

test('free space blocks only when clearly too little', () => {
  assert.equal(lacksSpace(120 * MB, 47 * MB), true);
  assert.equal(lacksSpace(2000 * MB, 47 * MB), false);
  assert.equal(lacksSpace(0, 47 * MB), false);
  assert.equal(lacksSpace(10 * MB, 0), false);
});

test('download errors map to a reason', () => {
  assert.equal(downloadFailure(new Error('write failed: ENOSPC (No space left on device)')), 'space');
  assert.equal(downloadFailure(new Error('HTTP 404')), 'network');
  assert.equal(downloadFailure(new Error('Download was cancelled')), 'cancelled');
  assert.equal(downloadFailure(undefined), 'network');
});

test('progress label, fraction and change detection', () => {
  assert.equal(progressLabel(17.4 * MB, 47.2 * MB), '36%・17.4 / 47.2 MB');
  assert.equal(progressLabel(3 * MB, -1), '3.0 MB');
  assert.equal(progressFraction(5, 10), 0.5);
  assert.equal(progressFraction(5, -1), null);
  assert.equal(progressChanged(null, 0, 10), true);
  assert.equal(progressChanged({ written: 1000, total: 47 * MB }, 2000, 47 * MB), false);
  assert.equal(progressChanged({ written: 0, total: 47 * MB }, 5 * MB, 47 * MB), true);
});
