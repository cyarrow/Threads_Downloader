// Quick save panel (分享時用快速面板): which tags get the big one-tap buttons,
// and the rules that keep buttons and chips from moving under a finger.
// Pure: no React. Spec: design-system/threads-collection/pages/save-sheet.md.

export const QUICK_SLOTS = 3;
// A shared post is still being read when the panel opens. The tag buttons wait
// at most this long for its suggestions (skeleton rows meanwhile), then lock.
export const SETTLE_MS = 1500;

// The panel can lock its picks once the post is read (or failed / gone).
export function postSettled(post) {
  return !post || post.status !== 'loading';
}

// rankQuickTags({ suggestions, recentIds, index, limit }) → [{ tag, reason }]
// Candidates, strongest first:
// 1. suggestTags() results (same author, words in the caption), in their order;
// 2. recently used tags (store `recent`, newest first);
// 3. the 大標籤 in tag order, so a first-time user still gets buttons.
// A 大標籤 is skipped once one of its 小標籤 is offered (the specific tag wins,
// like suggestTags folding a parent into its child).
// reason: { kind: 'author', count } | { kind: 'keyword', word } | { kind: 'recent' } | { kind: 'browse' }
// `exclude`: tags already on the post (自動標籤規則 added them), so a button
// isn't spent on a tag the save gets anyway.
export function rankQuickTags({ suggestions = [], recentIds = [], index, limit = QUICK_SLOTS, exclude = [] }) {
  const out = [];
  const add = (tag, reason) => {
    if (!tag || out.length >= limit || out.some((p) => p.tag.id === tag.id) || exclude.includes(tag.id)) return;
    if (!tag.parentId && out.some((p) => p.tag.parentId === tag.id)) return;
    out.push({ tag, reason });
  };
  for (const s of suggestions) add(index.byId[s.tag.id], s.reasons[0] || { kind: 'browse' });
  for (const id of recentIds) add(index.byId[id], { kind: 'recent' });
  for (const p of index.parents) add(p, { kind: 'browse' });
  return out;
}

// The buttons lock the first time they are shown and never change after that:
// suggestions that arrive later are left to 其他標籤… instead of reordering
// or replacing a button the user may be reaching for.
// Returns the locked picks, or null while still waiting (show skeleton rows).
export function lockPicks(locked, live, ready) {
  if (locked) return locked;
  return ready ? live : null;
}

// How many skeleton rows to reserve while waiting, so the panel keeps its size.
export function slotCount(index, limit = QUICK_SLOTS) {
  return Math.min(limit, Object.keys(index.byId).length);
}

// Short reason under a quick button's tag name (font.meta).
export function quickReasonText(reason) {
  switch (reason?.kind) {
    case 'author':
      return reason.count > 1 ? '同作者常用' : '同作者用過';
    case 'keyword':
      return `內文提到「${reason.word}」`;
    case 'recent':
      return '最近用過';
    default:
      return '';
  }
}

// Full picker: suggestions shown when it opened stay pinned at the top in that
// order; ones that arrive later (the post finished loading) are listed after
// all the other tags, where adding them can't push a chip the user is about to tap.
export function lateSuggestions(pinned, live) {
  const shown = new Set(pinned.map((s) => s.tag.id));
  return live.filter((s) => !shown.has(s.tag.id));
}
