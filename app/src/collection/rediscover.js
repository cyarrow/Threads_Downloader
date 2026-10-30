// Pure helpers for resurfacing old saves: 「N 年前的今天」, then 「好久沒看」,
// plus a day-stable shuffle for 「隨機翻翻」. Dates use the device's local time.

const DAY = 24 * 3600 * 1000;

// Posts that are worth resurfacing: fully loaded (a deleted source is fine, its text is kept).
export function isBrowsable(post) {
  return post.status !== 'loading' && post.status !== 'failed';
}

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// Saves from this calendar day in earlier years, newest first: [{ post, years }].
// On 2/28 of a non-leap year, 2/29 saves count too (otherwise they'd never show).
export function onThisDay(posts, now) {
  const today = new Date(now);
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  const alsoLeapDay = m === 1 && d === 28 && !isLeap(y);
  return posts
    .filter(isBrowsable)
    .map((post) => ({ post, at: new Date(post.savedAt) }))
    .filter(({ at }) => at.getFullYear() < y && at.getMonth() === m && (at.getDate() === d || (alsoLeapDay && at.getDate() === 29)))
    .sort((a, b) => b.post.savedAt - a.post.savedAt)
    .map(({ post, at }) => ({ post, years: y - at.getFullYear() }));
}

// 'YYYY-MM-DD' in local time; seeds anything that should stay put for the day.
export function dayKey(now) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

// mulberry32: tiny deterministic PRNG so the same seed gives the same order.
function rng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hash(String(seed));
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(list, seed) {
  const out = [...list];
  const rand = rng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// What the wall's 回顧 card shows today, or null when there's nothing old enough.
// 1. 「一年前的今天」(or N 年前) — saves from this day in earlier years.
// 2. 「好久沒看」 — saves older than `minDays` the user hasn't opened since, picked per day.
export function pickRediscover(posts, now, { max = 3, minDays = 30 } = {}) {
  const hits = onThisDay(posts, now);
  if (hits.length) {
    const years = hits[0].years;
    return {
      kind: 'onThisDay',
      title: years === 1 ? '一年前的今天' : `${years} 年前的今天`,
      subtitle: `還記得這 ${hits.length} 篇嗎？`,
      posts: hits.map((h) => h.post),
    };
  }
  const old = posts.filter((p) => isBrowsable(p) && now - (p.lastOpenedAt || p.savedAt) >= minDays * DAY);
  if (!old.length) return null;
  const picks = seededShuffle(old, dayKey(now)).slice(0, max);
  return {
    kind: 'forgotten',
    title: '好久沒看',
    subtitle: `${picks.length} 篇超過 ${minDays} 天沒打開`,
    posts: picks,
  };
}

// 「隨機翻翻」: `n` browsable posts, stable for the day; bump `round` for another batch.
export function randomPicks(posts, now, n = 5, round = 0) {
  return seededShuffle(posts.filter(isBrowsable), `${dayKey(now)}#${round}`).slice(0, n);
}

// Friendly age for a save: 今天 / 3 天前 / 2 個月前 / 一年前 / 3 年前.
export function ageLabel(savedAt, now) {
  const a = new Date(savedAt);
  const b = new Date(now);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  if (months >= 12) {
    const years = Math.floor(months / 12);
    return years === 1 ? '一年前' : `${years} 年前`;
  }
  if (months >= 1) return `${months} 個月前`;
  const days = Math.floor((now - savedAt) / DAY);
  return days <= 0 ? '今天' : `${days} 天前`;
}
