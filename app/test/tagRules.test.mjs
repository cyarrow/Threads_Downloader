import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  autoTags,
  dropRules,
  hasTagOrChild,
  matchRules,
  normalizeRuleValue,
  postsToTag,
  repointRules,
  ruleError,
  ruleMatches,
  ruleReason,
  ruleText,
  withRuleTags,
} from '../src/collection/tagRules.js';

const tags = [
  { id: 'fan', name: '追星', parentId: null },
  { id: 'fan-a', name: '星光少年團', parentId: 'fan' },
  { id: 'food', name: '美食', parentId: null },
  { id: 'trip', name: '旅遊', parentId: null },
];
const author = (value, tagId, createdAt = 1, id = `a-${value}-${tagId}`) => ({ id, kind: 'author', value, tagId, createdAt });
const keyword = (value, tagId, createdAt = 1, id = `k-${value}-${tagId}`) => ({ id, kind: 'keyword', value, tagId, createdAt });
const post = (over = {}) => ({ id: 'p', author: 'Starlight.Daily', caption: '今晚的 MV 首播，巡演也要開始了', status: 'ready', tagIds: [], ...over });

test('normalizeRuleValue: "@Name", a profile link and spaces', () => {
  assert.equal(normalizeRuleValue('author', '  @Starlight.Daily '), 'starlight.daily');
  assert.equal(normalizeRuleValue('author', 'https://www.threads.com/@Tainan.Eats/post/ABC'), 'tainan.eats');
  assert.equal(normalizeRuleValue('keyword', '  巡演   台北 '), '巡演 台北');
});

test('author rules match case-insensitively and exactly; keyword rules match inside the caption', () => {
  assert.equal(ruleMatches(author('starlight.daily', 'fan'), post()), true);
  assert.equal(ruleMatches(author('starlight', 'fan'), post()), false);
  assert.equal(ruleMatches(author('x', 'fan'), post({ author: '' })), false);
  assert.equal(ruleMatches(keyword('mv', 'fan'), post()), true);
  assert.equal(ruleMatches(keyword('巡演', 'fan'), post()), true);
  assert.equal(ruleMatches(keyword('拉麵', 'food'), post()), false);
  assert.equal(ruleMatches(keyword('拉麵', 'food'), post({ caption: undefined })), false);
});

test('matchRules: one hit per tag, the oldest rule is the reason, rules of deleted tags are ignored', () => {
  const rules = [keyword('巡演', 'fan-a', 5), author('starlight.daily', 'fan-a', 2), keyword('MV', 'trip', 3), author('starlight.daily', 'gone', 1)];
  const hits = matchRules(post(), rules, tags);
  assert.deepEqual(hits.map((h) => [h.tagId, h.rule.kind]), [['fan-a', 'author'], ['trip', 'keyword']]);
});

test('autoTags only adds: keeps picked tags, skips tags (or families) the post already has', () => {
  const rules = [author('starlight.daily', 'fan'), keyword('巡演', 'food')];
  assert.deepEqual(autoTags(post({ tagIds: ['trip'] }), rules, tags).tagIds, ['trip', 'fan', 'food']);
  // 追星 › 星光少年團 picked by hand already files it under 追星.
  const r = autoTags(post({ tagIds: ['fan-a', 'food'] }), rules, tags);
  assert.equal(r.tagIds, null);
  assert.equal(r.hits.length, 2); // still reported, so the sheet can say why
  assert.deepEqual(autoTags(post({ author: 'other', caption: '' }), rules, tags), { hits: [], tagIds: null });
});

test('hasTagOrChild', () => {
  assert.equal(hasTagOrChild(['fan-a'], 'fan', tags), true);
  assert.equal(hasTagOrChild(['fan'], 'fan-a', tags), false);
  assert.equal(hasTagOrChild([], 'fan', tags), false);
});

test('postsToTag (套用到現有收藏): readable matches without the tag', () => {
  const posts = [
    post({ id: 1 }),
    post({ id: 2, tagIds: ['fan'] }),
    post({ id: 3, author: 'other' }),
    post({ id: 4, status: 'loading' }),
    post({ id: 5, status: 'failed' }),
    post({ id: 6, status: 'sourceDeleted' }),
  ];
  assert.deepEqual(postsToTag(author('starlight.daily', 'fan'), posts, tags).map((p) => p.id), [1, 6]);
});

test('withRuleTags adds rule tags to the sheet picks, but not ones the user toggled by hand', () => {
  const hits = [{ tagId: 'fan' }, { tagId: 'food' }];
  assert.deepEqual(withRuleTags(['trip'], hits), ['trip', 'fan', 'food']);
  assert.deepEqual(withRuleTags(['fan'], hits, new Set(['food'])), ['fan']);
  const same = ['fan', 'food'];
  assert.equal(withRuleTags(same, hits), same); // unchanged list keeps its identity
});

test('ruleError: empty, bad handle, long keyword, no tag, duplicates (ignoring case and the rule being edited)', () => {
  const rules = [keyword('MV', 'fan', 1, 'r1')];
  assert.equal(ruleError({ kind: 'author', value: ' @ ', tagId: 'fan' }, rules, tags), '請輸入作者帳號');
  assert.equal(ruleError({ kind: 'author', value: '星光', tagId: 'fan' }, rules, tags), '帳號只能有英文、數字、底線和句點');
  assert.equal(ruleError({ kind: 'keyword', value: '', tagId: 'fan' }, rules, tags), '請輸入關鍵字');
  assert.equal(ruleError({ kind: 'keyword', value: '字'.repeat(31), tagId: 'fan' }, rules, tags), '關鍵字最多 30 個字');
  assert.equal(ruleError({ kind: 'keyword', value: '巡演', tagId: null }, rules, tags), '請選一個標籤');
  assert.equal(ruleError({ kind: 'keyword', value: '巡演', tagId: 'gone' }, rules, tags), '請選一個標籤');
  assert.equal(ruleError({ kind: 'keyword', value: 'mv', tagId: 'fan' }, rules, tags), '已經有一樣的規則了');
  assert.equal(ruleError({ kind: 'keyword', value: 'mv', tagId: 'fan' }, rules, tags, 'r1'), null);
  assert.equal(ruleError({ kind: 'keyword', value: 'mv', tagId: 'food' }, rules, tags), null);
  assert.equal(ruleError({ kind: 'author', value: '@Starlight.Daily', tagId: 'fan' }, rules, tags), null);
});

test('repointRules (tag merge) and dropRules (tag delete)', () => {
  const rules = [author('a', 'fan-a', 1, 'r1'), author('a', 'fan', 2, 'r2'), keyword('拉麵', 'fan-a', 3, 'r3')];
  assert.deepEqual(repointRules(rules, 'fan-a', 'fan').map((r) => [r.id, r.tagId]), [['r1', 'fan'], ['r3', 'fan']]);
  assert.deepEqual(dropRules(rules, ['fan', 'fan-a']), []);
  assert.deepEqual(dropRules(rules, ['food']), rules);
});

test('ruleText and ruleReason', () => {
  assert.equal(ruleText(author('starlight.daily', 'fan')), '作者 @starlight.daily');
  assert.equal(ruleText(keyword('巡演', 'fan')), '內文提到「巡演」');
  assert.equal(ruleReason(author('starlight.daily', 'fan')), '規則：@starlight.daily');
  assert.equal(ruleReason(keyword('巡演', 'fan')), '規則：「巡演」');
});
