import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOME_TAB, TABS, backTarget, visitTab } from '../src/collection/navModel.js';

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
});

test('back on 收藏 closes a tag page, then the browser, then leaves the app', () => {
  assert.equal(backTarget({ ...base, tagPage: 't', browsing: true }), 'tagPage');
  assert.equal(backTarget({ ...base, browsing: true }), 'browser');
  assert.equal(backTarget(base), null);
});

test('visited tabs stay mounted', () => {
  assert.deepEqual(visitTab(['home'], 'deck'), ['home', 'deck']);
  const v = ['home', 'deck'];
  assert.equal(visitTab(v, 'deck'), v);
});
