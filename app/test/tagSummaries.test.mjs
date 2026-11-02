import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexTags, tagSummaries, untaggedCount } from '../src/collection/tagModel.js';

const index = indexTags([
  { id: 'fan', name: '追星', parentId: null },
  { id: 'fan-a', name: '某團', parentId: 'fan' },
  { id: 'life', name: '生活', parentId: null },
  { id: 'meme', name: '梗圖', parentId: null },
]);
const post = (id, savedAt, tagIds, extra = {}) => ({ id, savedAt, tagIds, media: [], status: 'ready', ...extra });

test('one cover per 大標籤: count includes 小標籤, newest picture as art, text family falls back to latest', () => {
  const posts = [
    post('p1', 1, ['fan'], { media: [{ type: 'image' }] }),
    post('p2', 5, ['fan-a']), // newest, but text only
    post('p3', 3, ['fan-a'], { cover: 'file://c.jpg' }),
    post('p4', 2, ['life']),
    post('p5', 9, ['life'], { status: 'loading' }),
    post('p6', 4, []),
    post('p7', 6, [], { status: 'failed' }),
  ];
  const [fan, life, meme] = tagSummaries(posts, index);
  assert.equal(fan.tag.id, 'fan');
  assert.equal(fan.count, 3);
  assert.equal(fan.cover.id, 'p3');
  assert.equal(fan.latest.id, 'p2');
  assert.deepEqual(fan.kids.map((k) => k.name), ['某團']);
  assert.equal(life.count, 1);
  assert.equal(life.cover, null);
  assert.equal(life.latest.id, 'p4');
  assert.equal(meme.count, 0);
  assert.equal(meme.latest, null);
  assert.equal(untaggedCount(posts), 1);
});
