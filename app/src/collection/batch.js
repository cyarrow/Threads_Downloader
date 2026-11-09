// Pure helpers for selecting many cards and editing them at once.
// A tag's state across the selection: 'all' | 'some' | 'none'.
// Selections can hold thousands of ids (全選 on a big wall), so lookups go
// through a Set: `ids.includes` inside a loop over every post was O(posts × ids).

export function toggleId(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

// Keeps only selected ids that are still visible (after a filter/search change),
// so a batch action never touches a card the user can't see.
export function pruneSelection(selected, visiblePosts) {
  const visible = new Set(visiblePosts.map((p) => p.id));
  const kept = selected.filter((id) => visible.has(id));
  return kept.length === selected.length ? selected : kept;
}

// { tagId: count } over the selected posts.
export function tagCounts(posts, ids) {
  const picked = new Set(ids);
  const counts = {};
  for (const p of posts) {
    if (!picked.has(p.id)) continue;
    for (const id of p.tagIds) counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

// { tagId: 'all' | 'some' } — tags on none of the posts are simply absent.
export function tagStates(posts, ids) {
  const picked = new Set(ids);
  const n = posts.filter((p) => picked.has(p.id)).length;
  const states = {};
  for (const [id, count] of Object.entries(tagCounts(posts, ids))) states[id] = count === n ? 'all' : 'some';
  return states;
}

// One tap on a chip. Tags that started mixed cycle back to "leave as is":
// some → all → none → some. Others just flip: none ⇄ all.
export function cycleState(current, initial) {
  if (current === 'all') return 'none';
  if (current === 'none') return initial === 'some' ? 'some' : 'all';
  return 'all'; // from 'some'
}

// What the user changed: tags to add to every selected post / remove from every one.
export function diffStates(initial, current) {
  const add = [];
  const remove = [];
  for (const [id, state] of Object.entries(current)) {
    const before = initial[id] || 'none';
    if (state === before) continue;
    if (state === 'all') add.push(id);
    else if (state === 'none') remove.push(id);
  }
  return { add, remove };
}

export function applyTagDiff(posts, ids, { add, remove }) {
  const picked = new Set(ids);
  return posts.map((p) => {
    if (!picked.has(p.id)) return p;
    const kept = p.tagIds.filter((id) => !remove.includes(id));
    const tagIds = [...kept, ...add.filter((id) => !kept.includes(id))];
    return { ...p, tagIds };
  });
}

// Removes the selected posts and remembers where they were, for 復原.
export function removePosts(posts, ids) {
  const picked = new Set(ids);
  const removed = [];
  const kept = [];
  posts.forEach((p, at) => (picked.has(p.id) ? removed.push({ post: p, at }) : kept.push(p)));
  return { kept, removed };
}

// Puts removed posts back at their old positions.
export function restorePosts(posts, removed) {
  const out = [...posts];
  for (const { post, at } of [...removed].sort((a, b) => a.at - b.at)) out.splice(Math.min(at, out.length), 0, post);
  return out;
}

// Splits a selection into posts we can download and ones we can't (and why).
export function splitDownloadable(posts, ids) {
  const picked = new Set(ids);
  const ok = [];
  const skipped = [];
  for (const p of posts) {
    if (!picked.has(p.id)) continue;
    if (p.status === 'sourceDeleted' || p.status === 'failed' || p.status === 'loading' || !p.media?.length) skipped.push(p);
    else ok.push(p);
  }
  return { ok, skipped };
}

// Loading and failed cards have nothing to tag, feature or download yet.
export function isSelectable(post) {
  return post.status !== 'loading' && post.status !== 'failed';
}

// 全選: every selectable card on the wall the user is looking at.
export function selectableIds(posts) {
  return posts.filter(isSelectable).map((p) => p.id);
}

export function allSelected(posts, ids) {
  const all = selectableIds(posts);
  const picked = new Set(ids);
  return all.length > 0 && all.every((id) => picked.has(id));
}

// The 精選 button sets every selected post as featured, unless all of them
// already are; then it reads 取消精選 and clears it. Returns the value to set.
export function featureTarget(posts, ids) {
  const picked = new Set(ids);
  const sel = posts.filter((p) => picked.has(p.id));
  return !(sel.length > 0 && sel.every((p) => p.featured));
}
