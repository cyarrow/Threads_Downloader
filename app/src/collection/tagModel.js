// Pure helpers for two-level tags. Tags: { id, name, parentId|null, color }.
// Posts store any tag ids (parent or child); a parent filter also matches its children.

export const UNCATEGORIZED = '__none__';

export function indexTags(tags) {
  const byId = Object.fromEntries(tags.map((t) => [t.id, t]));
  const parents = tags.filter((t) => !t.parentId);
  const children = {};
  for (const t of tags) if (t.parentId) (children[t.parentId] ||= []).push(t);
  return { byId, parents, children };
}

// "追星 › 星光少年團" for a child, "追星" for a parent.
export function tagLabel(tag, byId) {
  const parent = tag.parentId && byId[tag.parentId];
  return parent ? `${parent.name} › ${tag.name}` : tag.name;
}

// Selected filter ids → set of tag ids a post may carry to match (parents expand).
function expand(selected, index) {
  const ids = new Set();
  for (const id of selected) {
    ids.add(id);
    for (const child of index.children[id] || []) ids.add(child.id);
  }
  return ids;
}

// Union across selected tags; UNCATEGORIZED matches posts without tags.
// `query` matches author or caption, case-insensitively.
export function filterPosts(posts, selected, query, index) {
  const ids = expand(selected, index);
  const q = query.trim().toLowerCase();
  return posts.filter((p) => {
    if (selected.length) {
      const tagged = p.tagIds.some((id) => ids.has(id));
      const none = selected.includes(UNCATEGORIZED) && p.tagIds.length === 0;
      if (!tagged && !none) return false;
    }
    if (!q) return true;
    return p.author.toLowerCase().includes(q) || (p.caption || '').toLowerCase().includes(q);
  });
}

// Hue a post's tag chip should use (children inherit the parent's color).
export function tagHue(tag, byId) {
  return (tag.parentId && byId[tag.parentId]?.color) || tag.color || 'slate';
}

// Shows the first `max` chips and folds the rest into a "+N" disclosure,
// keeping every selected chip visible.
export function foldChips(items, selected, max, expanded) {
  if (expanded || items.length <= max) return { visible: items, hidden: 0 };
  const head = items.slice(0, max);
  const pinned = items.slice(max).filter((t) => selected.includes(t.id));
  return { visible: [...head, ...pinned], hidden: items.length - max - pinned.length };
}
