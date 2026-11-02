// Bottom tabs and the Android back button. Pure: no React, no React Native, so
// the rules are unit-tested in test/navModel.test.mjs.

export const TABS = ['deck', 'home', 'stream']; // 翻翻 | 收藏 | 串流, left to right
export const HOME_TAB = 'home';

// What the hardware back button closes, topmost layer first. Returns the layer
// name, or null to let the system handle it (leave the app).
// 1. Anything floating over the tabs: save sheet, add-link sheet, settings,
//    card menu, post detail — in that order (same as before the tabs).
// 2. On 翻翻 / 串流: go to 收藏 first.
// 3. On 收藏: a tag page, then the 所有標籤 browser.
export function backTarget(s) {
  if (s.sheet) return 'sheet';
  if (s.addOpen) return 'add';
  if (s.settingsOpen) return 'settings';
  if (s.menuOpen) return 'menu';
  if (s.detailOpen) return 'detail';
  if (s.tab !== HOME_TAB) return 'home';
  if (s.tagPage) return 'tagPage';
  if (s.browsing) return 'browser';
  return null;
}

// Tabs mount the first time they are shown and then stay mounted (hidden), so
// scroll position, filters and the deck survive switching back and forth.
export function visitTab(visited, tab) {
  return visited.includes(tab) ? visited : [...visited, tab];
}
