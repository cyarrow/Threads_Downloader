// Pure helpers for finding downloadable media in a Threads post.
// No React Native imports here so the logic can be unit-tested with plain Node.

const URL_RE =
  /https?:\/\/(?:www\.)?threads\.(?:net|com)\/(?:@([\w.]+)\/post|t)\/([A-Za-z0-9_-]+)/i;

const MEDIA_TYPE = { IMAGE: 1, VIDEO: 2, CAROUSEL: 8 };

// Finds the first Threads post link in arbitrary text (e.g. clipboard or share text).
export function parseThreadsUrl(text) {
  const m = typeof text === 'string' && text.match(URL_RE);
  if (!m) return null;
  const [, user, code] = m;
  const url = user
    ? `https://www.threads.com/@${user}/post/${code}`
    : `https://www.threads.com/t/${code}`;
  return { code, url };
}

function largest(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list.reduce((best, v) =>
    (v.width || 0) * (v.height || 0) > (best.width || 0) * (best.height || 0) ? v : best,
  );
}

function hasMedia(o) {
  return (
    (Array.isArray(o.video_versions) && o.video_versions.length > 0) ||
    (o.image_versions2 && Array.isArray(o.image_versions2.candidates)) ||
    (Array.isArray(o.carousel_media) && o.carousel_media.length > 0)
  );
}

// Depth-first search for the post object whose shortcode matches `code`.
export function findPost(root, code) {
  const stack = [root];
  while (stack.length) {
    const o = stack.pop();
    if (!o || typeof o !== 'object') continue;
    if (!Array.isArray(o) && o.code === code && 'media_type' in o && hasMedia(o)) return o;
    for (const v of Object.values(o)) if (v && typeof v === 'object') stack.push(v);
  }
  return null;
}

function itemMedia(item) {
  const video = largest(item.video_versions);
  if (video && video.url) {
    return { type: 'video', url: video.url, width: video.width, height: video.height };
  }
  const image = largest(item.image_versions2 && item.image_versions2.candidates);
  if (image && image.url) {
    return { type: 'image', url: image.url, width: image.width, height: image.height };
  }
  return null;
}

// Returns [{ type: 'video' | 'image', url, width, height }] for a post object.
export function mediaFromPost(post) {
  if (!post) return [];
  const items =
    post.media_type === MEDIA_TYPE.CAROUSEL && Array.isArray(post.carousel_media)
      ? post.carousel_media
      : [post];
  return items.map(itemMedia).filter(Boolean);
}

// `jsonTexts`: contents of the page's <script type="application/json"> tags.
// `domVideoUrls`: <video> sources seen in the rendered page, used as a fallback.
export function extractMedia(jsonTexts, code, domVideoUrls = []) {
  for (const text of jsonTexts) {
    if (!text.includes(code)) continue;
    let root;
    try {
      root = JSON.parse(text);
    } catch {
      continue;
    }
    const media = mediaFromPost(findPost(root, code));
    if (media.length) return media;
  }
  return [...new Set(domVideoUrls)]
    .filter((u) => /^https?:/.test(u))
    .map((url) => ({ type: 'video', url }));
}

export function fileName(code, index, media) {
  const ext = media.type === 'video' ? 'mp4' : /\.webp(\?|$)/.test(media.url) ? 'webp' : 'jpg';
  return `threads_${code}_${index + 1}.${ext}`;
}
