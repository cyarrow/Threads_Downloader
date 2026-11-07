import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOME_TAB, TABS, backTarget, closeAuthor, openAuthor, visitTab, wallKey } from '../src/collection/navModel.js';

const base = { tab: 'home' };

test('tabs: 翻翻 | 收藏 | 串流, 收藏 by default', () => {
  assert.deepEqual(TABS, ['deck', 'home', 'stream']);
  assert.equal(HOME_TAB, 'home');
});

test('back closes overlays first, on any tab, in the old order', () => {
  const all = { tab: 'stream', sheet: true, addOpen: true, settingsOpen: true, menuOpen: true, detailOpen: true, tagPage: 't', browsing: true };
  assert.equal(backTarget(all), 'sheet');
  assert.equal(backTarget({ ...all, sheet: false }), 'add');
  assert.equal(backTarget({ ...all, sheet: false, addOpen: false }), 'settings');
  assert.equal(backTarget({ ...all, sheet: false, addOpen: false, settingsOpen: false }), 'menu');
  assert.equal(backTarget({ ...all, sheet: false, addOpen: false, settingsOpen: false, menuOpen: false }), 'detail');
});

test('back on 翻翻 / 串流 goes to 收藏 before anything else', () => {
  assert.equal(backTarget({ tab: 'deck' }), 'home');
  assert.equal(backTarget({ tab: 'stream', tagPage: 't', browsing: true }), 'home');
  assert.equal(backTarget({ tab: 'stream', authorPage: true }), 'home');
});

test('back on 收藏 closes a tag page, then the browser, then leaves the app', () => {
  assert.equal(backTarget({ ...base, tagPage: 't', browsing: true }), 'tagPage');
  assert.equal(backTarget({ ...base, browsing: true }), 'browser');
  assert.equal(backTarget(base), null);
});

test('back ends selection mode before the page under it moves', () => {
  const s = { ...base, selecting: true, authorPage: true, tagPage: 't', browsing: true };
  assert.equal(backTarget(s), 'selection');
  assert.equal(backTarget({ ...s, selecting: false }), 'author');
  assert.equal(backTarget({ ...base, selecting: true }), 'selection', 'on the plain wall too, instead of leaving the app');
});

test('the batch sheets close before selection ends; the save sheet still comes first', () => {
  const s = { ...base, selecting: true, batchSheet: true };
  assert.equal(backTarget(s), 'batchSheet');
  assert.equal(backTarget({ ...s, sheet: true }), 'sheet');
  assert.equal(backTarget({ ...s, batchSheet: false, menuOpen: true }), 'menu');
});

test('the author page sits above a tag page and the browser', () => {
  assert.equal(backTarget({ ...base, authorPage: true, tagPage: 't', browsing: true }), 'author');
  assert.equal(backTarget({ ...base, authorPage: true, detailOpen: true }), 'detail');
});

test('visited tabs stay mounted', () => {
  assert.deepEqual(visitTab(['home'], 'deck'), ['home', 'deck']);
  const v = ['home', 'deck'];
  assert.equal(visitTab(v, 'deck'), v);
});

test('openAuthor remembers the tab and the open post detail', () => {
  assert.deepEqual(openAuthor(null, 'a', { tab: 'stream', detailId: 'p1' }), { handle: 'a', from: { tab: 'stream', detailId: 'p1' } });
  assert.deepEqual(openAuthor(null, 'a', { tab: 'deck' }), { handle: 'a', from: { tab: 'deck', detailId: null } });
  assert.equal(openAuthor(null, '', { tab: 'home' }), null, 'no handle (card still loading) → nothing');
});

test('openAuthor on the page already showing keeps its origin; another author replaces it', () => {
  const cur = { handle: 'a', from: { tab: 'stream', detailId: 'p1' } };
  assert.equal(openAuthor(cur, 'a', { tab: 'home', detailId: 'p2' }), cur);
  assert.deepEqual(openAuthor(cur, 'b', { tab: 'home', detailId: 'p2' }), { handle: 'b', from: { tab: 'home', detailId: 'p2' } });
  assert.deepEqual(openAuthor(cur, 'a', { tab: 'deck', detailId: null }), { handle: 'a', from: { tab: 'deck', detailId: null } }, 'from another tab it starts over');
});

test('closeAuthor returns to the origin, dropping a detail whose post is gone', () => {
  const page = { handle: 'a', from: { tab: 'stream', detailId: 'p1' } };
  assert.deepEqual(closeAuthor(page), { tab: 'stream', detailId: 'p1' });
  assert.deepEqual(closeAuthor(page, (id) => id !== 'p1'), { tab: 'stream', detailId: null });
  assert.deepEqual(closeAuthor(null), { tab: 'home', detailId: null });
});

test('wallKey: a selection belongs to one wall', () => {
  assert.equal(wallKey({ tab: 'home' }), 'home');
  assert.equal(wallKey({ tab: 'home', browsing: true, tagPage: 't1' }), 'tag:t1');
  assert.equal(wallKey({ tab: 'home', browsing: true, tagPage: 't1', authorPage: 'a' }), 'author:a');
  assert.equal(wallKey({ tab: 'home', browsing: true }), null);
  assert.equal(wallKey({ tab: 'stream' }), null, 'leaving the tab ends it');
});
