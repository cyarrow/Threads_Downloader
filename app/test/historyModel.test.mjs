import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summary } from '../src/historyModel.js';

test('summary names videos and images in Chinese', () => {
  assert.equal(summary({ videos: 1, images: 0 }), '1 部影片');
  assert.equal(summary({ videos: 2, images: 3 }), '2 部影片、3 張圖片');
  assert.equal(summary({ images: 4 }), '4 張圖片');
});
