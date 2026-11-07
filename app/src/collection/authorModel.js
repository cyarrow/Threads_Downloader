// 作者頁 (author page): pure helpers, no React / React Native, so the rules are
// unit-tested in test/authorModel.test.mjs.

// Handles are compared without the leading @ and without case (Threads handles
// are lowercase, but a link typed by hand may not be).
export function normalizeHandle(handle) {
  return String(handle || '').trim().replace(/^@+/, '').toLowerCase();
}

// Every saved post by this author, in wall order. Cards still loading (no author
// yet) never match.
export function postsByAuthor(posts, handle) {
  const h = normalizeHandle(handle);
  if (!h) return [];
  return posts.filter((p) => p.author && normalizeHandle(p.author) === h);
}

// The author's most used 大標籤, most used first. A 小標籤 counts for its 大標籤
// (the page reads 「最常用標籤：追星、生活」, the families, not every child);
// a post counts once per family. Ties keep the tag order of the 所有標籤 page.
export function topTags(posts, index, limit = 2) {
  const counts = new Map();
  for (const p of posts) {
    const families = new Set();
    for (const id of p.tagIds) {
      const tag = index.byId[id];
      if (!tag) continue;
      families.add(tag.parentId && index.byId[tag.parentId] ? tag.parentId : tag.id);
    }
    for (const id of families) counts.set(id, (counts.get(id) || 0) + 1);
  }
  const order = index.parents.map((t) => t.id);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]))
    .slice(0, limit)
    .map(([id, count]) => ({ tag: index.byId[id], count }));
}

// { count, top: [{ tag, count }] } for the page's summary line.
export function authorSummary(posts, handle, index, limit = 2) {
  const own = postsByAuthor(posts, handle);
  return { count: own.length, top: topTags(own, index, limit) };
}

// 「12 篇 · 最常用標籤：追星、生活」 / 「3 篇 · 還沒有標籤」.
export function summaryText({ count, top }) {
  const tags = top.length ? `最常用標籤：${top.map((x) => x.tag.name).join('、')}` : '還沒有標籤';
  return `${count} 篇 · ${tags}`;
}
