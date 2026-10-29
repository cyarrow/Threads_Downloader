// Pure rules for the collection store (no React / native imports; tested in Node).
import { TAG_HUES } from './palette.js';

export const DEFAULT_TAGS = [
  { name: '追星', color: 'rose' },
  { name: '生活', color: 'green' },
  { name: '美食', color: 'orange' },
  { name: '旅遊', color: 'sky' },
  { name: '梗圖', color: 'violet' },
];

export const RECENT_MAX = 5;

export function newId(prefix = 'p') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Next top-level tag color nobody uses yet (slate is reserved for 未分類);
// once all are taken, cycle through them in order.
export function nextTagColor(tags) {
  const hues = TAG_HUES.filter((h) => h !== 'slate');
  const used = tags.filter((t) => !t.parentId).map((t) => t.color);
  return hues.find((h) => !used.includes(h)) || hues[used.length % hues.length];
}

// Validates a new tag name among its siblings. Returns an error message or null.
export function tagNameError(name, parentId, tags) {
  const trimmed = name.trim();
  if (!trimmed) return '請輸入標籤名稱';
  if (trimmed.length > 20) return '名稱最多 20 個字';
  const siblings = tags.filter((t) => (t.parentId || null) === (parentId || null));
  if (siblings.some((t) => t.name === trimmed)) return '這個名稱已經有了';
  return null;
}

export function pushRecent(recent, tagIds, max = RECENT_MAX) {
  return [...new Set([...tagIds, ...recent])].slice(0, max);
}

// A saved post whose details we never fetched (e.g. migrated from the old
// download history) or whose fetch failed should be refreshed in the background.
export function needsRefresh(post) {
  return post.status === 'loading' || (post.status === 'ready' && (!post.media.length || !post.fetchedAt));
}

// When a shared link turns out to be a post that's already saved, keep the
// existing card and fold in the tags picked for the placeholder.
export function mergeTags(existing, incoming) {
  return [...new Set([...existing, ...incoming])];
}

// Converts an entry of the old download history (history.json) into a post.
export function postFromHistory(entry) {
  return {
    id: newId('h'),
    code: entry.code,
    url: entry.url,
    author: entry.author || '',
    caption: entry.caption || '',
    media: [],
    cover: entry.thumb || null,
    status: 'ready',
    featured: false,
    downloaded: true,
    savedAt: entry.savedAt || Date.now(),
    fetchedAt: null,
    tagIds: [],
  };
}

// Fields a successful fetch writes onto a post.
export function fetchedFields(data, now = Date.now()) {
  return {
    code: data.code,
    url: data.author ? `https://www.threads.com/@${data.author}/post/${data.code}` : data.url,
    author: data.author || '',
    caption: data.caption || '',
    media: data.media.map((m) => ({ type: m.type, url: m.url, poster: m.poster || null, ratio: m.ratio || null })),
    status: 'ready',
    error: null,
    fetchedAt: now,
  };
}
