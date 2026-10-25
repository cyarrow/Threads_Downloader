// Pure helpers for the "最近下載" list. Entries look like
// { code, url, author, caption, videos, images, thumb, savedAt }.

export const MAX_HISTORY = 50;

// Newest first; downloading the same post again moves it back to the top.
export function upsertHistory(list, entry, max = MAX_HISTORY) {
  return [entry, ...list.filter((e) => e.code !== entry.code)].slice(0, max);
}

export function summary({ videos = 0, images = 0 }) {
  return [videos > 0 && `${videos} 部影片`, images > 0 && `${images} 張圖片`]
    .filter(Boolean)
    .join('、');
}

export function timeAgo(ts, now = Date.now()) {
  const s = Math.max(0, (now - ts) / 1000);
  if (s < 60) return '剛剛';
  if (s < 3600) return `${Math.floor(s / 60)} 分鐘前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小時前`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} 天前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
