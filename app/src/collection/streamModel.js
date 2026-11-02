// 串流 (single-column feed) ordering. Pure: no React, no React Native, so the
// rules are unit-tested in test/streamModel.test.mjs.

import { isBrowsable } from './rediscover.js';
import { filterPosts } from './tagModel.js';

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

// 'new': newest save first. 'random': every post gets a fixed place for the
// seed (a hash of seed + id), so a post saved or edited meanwhile slots in
// without reshuffling the ones the user is looking at; 換一批 bumps the seed.
// `filter`: a tag id, UNCATEGORIZED, or null for everything.
export function streamPosts(posts, { order = 'new', seed = 0, filter = null, index }) {
  let list = posts.filter(isBrowsable);
  if (filter) list = filterPosts(list, [filter], '', index);
  if (order === 'random') {
    return list
      .map((p) => [hash(`${seed}:${p.id}`), p])
      .sort((a, b) => a[0] - b[0] || (a[1].id < b[1].id ? -1 : 1))
      .map(([, p]) => p);
  }
  return [...list].sort((a, b) => b.savedAt - a.savedAt);
}

// FlashList item type: cells only recycle into the same layout, so a pager
// never has to turn into a text page mid-scroll.
export function streamItemType(post) {
  if (post.media.length > 1) return 'carousel';
  if (post.media.length === 1) return post.media[0].type === 'video' ? 'video' : 'photo';
  return post.cover ? 'cover' : 'text';
}

// A tag chip under a post filters the feed by its 大標籤 (the broader family),
// matching the preview: tapping 「追星 › 某團」 shows all of 追星.
export function filterForTag(tagId, byId) {
  const tag = byId[tagId];
  if (!tag) return null;
  return tag.parentId && byId[tag.parentId] ? tag.parentId : tag.id;
}
