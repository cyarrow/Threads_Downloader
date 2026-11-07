// Bottom tabs and the Android back button. Pure: no React, no React Native, so
// the rules are unit-tested in test/navModel.test.mjs.

export const TABS = ['deck', 'home', 'stream']; // 翻翻 | 收藏 | 串流, left to right
export const HOME_TAB = 'home';

// What the hardware back button closes, topmost layer first. Returns the layer
// name, or null to let the system handle it (leave the app).
// 1. Anything floating over the tabs: save sheet, the batch sheets (標籤 for
//    many posts, 刪除 N 篇 confirmation), add-link sheet, settings, card menu,
//    post detail — in that order.
// 2. Selection mode (批次選取) ends before anything under it moves.
// 3. On 翻翻 / 串流: go to 收藏 first.
// 4. On 收藏: the author page, a tag page, then the 所有標籤 browser.
export function backTarget(s) {
  if (s.sheet) return 'sheet';
  if (s.batchSheet) return 'batchSheet';
  if (s.addOpen) return 'add';
  if (s.settingsOpen) return 'settings';
  if (s.menuOpen) return 'menu';
  if (s.detailOpen) return 'detail';
  if (s.selecting) return 'selection';
  if (s.tab !== HOME_TAB) return 'home';
  if (s.authorPage) return 'author';
  if (s.tagPage) return 'tagPage';
  if (s.browsing) return 'browser';
  return null;
}

// Tabs mount the first time they are shown and then stay mounted (hidden), so
// scroll position, filters and the deck survive switching back and forth.
export function visitTab(visited, tab) {
  return visited.includes(tab) ? visited : [...visited, tab];
}

// 作者頁 lives in the 收藏 tab but opens from anywhere a handle shows (post
// detail on any tab, 串流, 翻翻). It remembers where the user was — the tab and
// the post detail that was open — so back returns exactly there.
// `current`: the open author page ({ handle, from }) or null.
// Tapping the handle of the author whose page is already showing underneath
// keeps that page (and its origin); the caller just closes what covers it.
export function openAuthor(current, handle, { tab, detailId }) {
  if (!handle) return current;
  if (current && current.handle === handle && tab === HOME_TAB) return current;
  return { handle, from: { tab, detailId: detailId || null } };
}

// Back from the author page: the tab to show and the post detail to reopen
// (only if that post still exists).
export function closeAuthor(author, exists = () => true) {
  const from = author?.from || { tab: HOME_TAB, detailId: null };
  return { tab: from.tab || HOME_TAB, detailId: from.detailId && exists(from.detailId) ? from.detailId : null };
}

// Which wall a selection belongs to. A selection only lives on the wall it was
// started on: opening a tag / author page, going back, or leaving the 收藏 tab
// ends it.
export function wallKey({ tab, authorPage, tagPage, browsing }) {
  if (tab !== HOME_TAB) return null;
  if (authorPage) return `author:${authorPage}`;
  if (tagPage) return `tag:${tagPage}`;
  if (browsing) return null; // 所有標籤 covers can't be selected
  return 'home';
}
