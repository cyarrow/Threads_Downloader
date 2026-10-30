// Tag suggestions for the save sheet. Pure: (post, other posts, tag index) → ranked tags,
// each with the reasons we show the user ("@x 的 2 篇收藏", "內文提到「巡演」").
// Tags: { id, name, parentId|null }. Posts: { id, author, caption, tagIds }.

// Extra words for the default tags, keyed by tag name. Every tag (including
// user-created ones) also matches on its own name.
export const KEYWORDS = {
  追星: ['演唱會', '安可', '應援', '巡演', '舞台', '簽售', '開賣', '搶票', 'MV', '打歌', '生日咖啡'],
  美食: ['早午餐', '餐廳', '好吃', '拉麵', '火鍋', '小吃', '排隊名店', '必吃'],
  甜點: ['蛋糕', '聖代', '布丁', '冰淇淋', '鬆餅', '可頌'],
  咖啡廳: ['咖啡', '拿鐵', 'cafe'],
  旅遊: ['景點', '機票', '住宿', '行程', '自由行', '一日遊'],
  日本: ['東京', '京都', '大阪', '沖繩', '北海道', '富士山', '河口湖'],
  生活: ['日常', '療癒'],
  居家: ['客廳', '收納', '裝潢', '房間', '租屋'],
  穿搭: ['OOTD', '外套', '洋裝'],
  梗圖: ['笑死', '週一', '迷因'],
};

const AUTHOR_BASE = 10;
const AUTHOR_PER_POST = 2;
const KEYWORD_CHILD = 6; // a child (specific) tag named in the text
const KEYWORD_PARENT = 4;

// Returns the first word of the tag (its name, then its dictionary words)
// that appears in `text`, or null. Case-insensitive for Latin words.
export function keywordHit(tag, text) {
  if (!text) return null;
  const hay = text.toLowerCase();
  for (const word of [tag.name, ...(KEYWORDS[tag.name] || [])]) {
    if (word && hay.includes(word.toLowerCase())) return word;
  }
  return null;
}

// suggestTags(post, posts, index, { exclude, limit }) → [{ tag, score, reasons }]
// reasons: [{ kind: 'author', author, count } | { kind: 'keyword', word }]
// - Same author: every tag on that author's other saves, more saves = stronger.
// - Keywords: tag names / dictionary words found in the caption.
// - A suggested child absorbs its parent (追星 + 追星›Aurora → just Aurora, with
//   both reasons), so we never suggest the broad and the specific tag at once.
export function suggestTags(post, posts, index, { exclude = [], limit = 3 } = {}) {
  const found = new Map(); // tagId → { tag, score, reasons }
  const bump = (tag, score, reason) => {
    const entry = found.get(tag.id) || { tag, score: 0, reasons: [] };
    entry.score += score;
    entry.reasons.push(reason);
    found.set(tag.id, entry);
  };

  const author = (post.author || '').toLowerCase();
  if (author) {
    const counts = new Map();
    for (const other of posts) {
      if (other.id === post.id || (other.author || '').toLowerCase() !== author) continue;
      for (const id of other.tagIds) counts.set(id, (counts.get(id) || 0) + 1);
    }
    for (const [id, count] of counts) {
      const tag = index.byId[id];
      if (tag) bump(tag, AUTHOR_BASE + AUTHOR_PER_POST * count, { kind: 'author', author: post.author, count });
    }
  }

  for (const tag of Object.values(index.byId)) {
    const word = keywordHit(tag, post.caption);
    if (word) bump(tag, tag.parentId ? KEYWORD_CHILD : KEYWORD_PARENT, { kind: 'keyword', word });
  }

  // Fold a parent into its strongest suggested child.
  for (const entry of [...found.values()]) {
    if (entry.tag.parentId) continue;
    const kids = (index.children[entry.tag.id] || []).map((c) => found.get(c.id)).filter(Boolean);
    if (!kids.length) continue;
    const best = kids.reduce((a, b) => (b.score > a.score ? b : a));
    best.score += entry.score;
    for (const r of entry.reasons) {
      if (!best.reasons.some((x) => x.kind === r.kind && x.word === r.word && x.count === r.count)) best.reasons.push(r);
    }
    found.delete(entry.tag.id);
  }

  const order = Object.keys(index.byId);
  return [...found.values()]
    .filter((e) => !exclude.includes(e.tag.id))
    .sort((a, b) => b.score - a.score || order.indexOf(a.tag.id) - order.indexOf(b.tag.id))
    .slice(0, limit)
    .map((e) => ({
      ...e,
      reasons: [...e.reasons.filter((r) => r.kind === 'author'), ...e.reasons.filter((r) => r.kind !== 'author')],
    }));
}

// "同作者有 2 篇用過 · 內文提到「應援」" (the author is already shown in the sheet's preview).
export function reasonText(reasons) {
  return reasons.map((r) => (r.kind === 'author' ? `同作者有 ${r.count} 篇用過` : `內文提到「${r.word}」`)).join(' · ');
}
