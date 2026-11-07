// 自動標籤規則: "posts by @author" or "posts whose text mentions a word" get a tag.
// Pure (no React / native imports; tested in Node).
// Rule: { id, kind: 'author' | 'keyword', value, tagId, createdAt }
// - author: stored without "@", lowercased; matches the post's author exactly
//   (case-insensitive).
// - keyword: stored as typed (trimmed); matches when the caption contains it
//   (case-insensitive for Latin letters).
// Rules only ever add tags; they never take one away.

export const RULE_KINDS = ['author', 'keyword'];
export const KEYWORD_MAX = 30;

// What the user typed → the stored value. Accepts "@name", "name" or a profile link.
export function normalizeRuleValue(kind, raw) {
  const text = String(raw || '').trim();
  if (kind === 'author') {
    const link = text.match(/threads\.(?:net|com)\/@([\w.]+)/i);
    return (link ? link[1] : text.replace(/^@+/, '')).trim().toLowerCase();
  }
  return text.replace(/\s+/g, ' ');
}

const sameRule = (a, b) => a.kind === b.kind && a.tagId === b.tagId && a.value.toLowerCase() === b.value.toLowerCase();

// Validates a rule before saving. Returns a user-facing message or null.
// `editingId` skips the rule being edited in the duplicate check.
export function ruleError({ kind, value, tagId }, rules = [], tags = [], editingId = null) {
  const v = normalizeRuleValue(kind, value);
  if (kind === 'author') {
    if (!v) return '請輸入作者帳號';
    if (!/^[\w.]+$/.test(v)) return '帳號只能有英文、數字、底線和句點';
  } else if (kind === 'keyword') {
    if (!v) return '請輸入關鍵字';
    if (v.length > KEYWORD_MAX) return `關鍵字最多 ${KEYWORD_MAX} 個字`;
  } else {
    return '請選擇條件';
  }
  if (!tagId || !tags.some((t) => t.id === tagId)) return '請選一個標籤';
  if (rules.some((r) => r.id !== editingId && sameRule(r, { kind, value: v, tagId }))) return '已經有一樣的規則了';
  return null;
}

export function ruleMatches(rule, post) {
  if (!post) return false;
  if (rule.kind === 'author') return !!post.author && post.author.toLowerCase() === rule.value.toLowerCase();
  if (rule.kind === 'keyword') return !!rule.value && (post.caption || '').toLowerCase().includes(rule.value.toLowerCase());
  return false;
}

// The post is already filed under the tag: it has the tag, or one of its 小標籤.
export function hasTagOrChild(tagIds, tagId, tags) {
  return tagIds.includes(tagId) || tags.some((t) => t.parentId === tagId && tagIds.includes(t.id));
}

// Rules that match `post`, one per tag (the oldest rule is the reason shown), in
// rule order. Rules whose tag is gone are ignored.
// → [{ tagId, rule }]
export function matchRules(post, rules, tags) {
  const known = new Set(tags.map((t) => t.id));
  const out = [];
  for (const rule of [...rules].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))) {
    if (!known.has(rule.tagId) || out.some((h) => h.tagId === rule.tagId)) continue;
    if (ruleMatches(rule, post)) out.push({ tagId: rule.tagId, rule });
  }
  return out;
}

// A newly saved post just finished loading: the tags its rules add on top of
// the ones it already has (`post.tagIds` may hold what the user picked meanwhile).
// → { hits, tagIds } — tagIds is null when nothing changes.
export function autoTags(post, rules, tags) {
  const hits = matchRules(post, rules, tags);
  const add = hits.map((h) => h.tagId).filter((id) => !hasTagOrChild(post.tagIds, id, tags));
  return { hits, tagIds: add.length ? [...post.tagIds, ...add] : null };
}

// 套用到現有收藏: readable posts the rule matches that don't carry its tag yet.
export function postsToTag(rule, posts, tags) {
  return posts.filter(
    (p) => p.status !== 'loading' && p.status !== 'failed' && ruleMatches(rule, p) && !hasTagOrChild(p.tagIds, rule.tagId, tags),
  );
}

// The save sheet's picks once rule tags arrive: adds each hit's tag unless the
// user already toggled that tag by hand in this sheet (`touched`).
export function withRuleTags(selected, hits, touched = new Set()) {
  const add = hits.map((h) => h.tagId).filter((id) => !selected.includes(id) && !touched.has(id));
  return add.length ? [...selected, ...add] : selected;
}

// After a tag merge: rules point at the target tag; exact duplicates collapse.
export function repointRules(rules, fromId, toId) {
  const out = [];
  for (const r of rules.map((x) => (x.tagId === fromId ? { ...x, tagId: toId } : x))) {
    if (!out.some((o) => sameRule(o, r))) out.push(r);
  }
  return out;
}

// After deleting tags (a 大標籤 takes its 小標籤 along): their rules go too.
export function dropRules(rules, goneTagIds) {
  const gone = new Set(goneTagIds);
  return rules.filter((r) => !gone.has(r.tagId));
}

// 「作者 @starlight.daily」 / 「內文提到「巡演」」
export function ruleText(rule) {
  return rule.kind === 'author' ? `作者 @${rule.value}` : `內文提到「${rule.value}」`;
}

// Short reason next to a tag the rule picked: 「規則：@starlight.daily」.
export function ruleReason(rule) {
  return rule.kind === 'author' ? `規則：@${rule.value}` : `規則：「${rule.value}」`;
}
