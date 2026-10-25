// Pure helpers for finding downloadable media in a Threads post.
// No React Native imports here so the logic can be unit-tested with plain Node.

const URL_RE =
  /https?:\/\/(?:www\.)?threads\.(?:net|com)\/(?:@([\w.]+)\/post|(t|share))\/([A-Za-z0-9_-]+)/i;

const MEDIA_TYPE = { IMAGE: 1, VIDEO: 2, CAROUSEL: 8 };

// Finds the first Threads post link in arbitrary text (e.g. clipboard or share text).
// Returns { id, code, url }: `id` identifies the link; `code` is the post shortcode,
// or null for /share/ links, whose post is only known once the page redirects.
export function parseThreadsUrl(text) {
  const m = typeof text === 'string' && text.match(URL_RE);
  if (!m) return null;
  const [, user, kind, id] = m;
  if (user) return { id, code: id, url: `https://www.threads.com/@${user}/post/${id}` };
  if (kind.toLowerCase() === 'share') {
    return { id, code: null, url: `https://www.threads.com/share/${id}/` };
  }
  return { id, code: id, url: `https://www.threads.com/t/${id}` };
}

// True once the login flow (threads /login, Instagram auth pages) has landed on a
// regular threads.com page, i.e. the session is logged in.
export function isLoggedInUrl(url) {
  const m =
    typeof url === 'string' &&
    url.match(/^https:\/\/(?:www\.)?threads\.(?:com|net)(?=[/?#]|$)([^?#]*)/i);
  return !!m && !/^\/(login|accounts)\b/.test(m[1] || '/');
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

// Smallest image that still looks sharp in a list or grid cell.
function thumbnail(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return undefined;
  const sharp = candidates.filter((c) => c.url && (c.width || 0) >= 320);
  const pick = sharp.length
    ? sharp.reduce((a, b) => ((b.width || 0) < (a.width || 0) ? b : a))
    : largest(candidates);
  return pick && pick.url;
}

function itemMedia(item) {
  const candidates = item.image_versions2 && item.image_versions2.candidates;
  const thumb = thumbnail(candidates);
  const video = largest(item.video_versions);
  if (video && video.url) {
    return { type: 'video', url: video.url, width: video.width, height: video.height, thumb };
  }
  const image = largest(candidates);
  if (image && image.url) {
    return { type: 'image', url: image.url, width: image.width, height: image.height, thumb };
  }
  return null;
}

// Returns [{ type: 'video' | 'image', url, width, height, thumb }] for a post object.
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
// Returns { author, caption, media }; author/caption are null when unknown.
export function extractPost(jsonTexts, code, domVideoUrls = []) {
  for (const text of jsonTexts) {
    if (!text.includes(code)) continue;
    let root;
    try {
      root = JSON.parse(text);
    } catch {
      continue;
    }
    const post = findPost(root, code);
    const media = mediaFromPost(post);
    if (media.length) {
      return {
        author: (post.user && post.user.username) || null,
        caption: (post.caption && post.caption.text) || null,
        media,
      };
    }
  }
  const media = [...new Set(domVideoUrls)]
    .filter((u) => /^https?:/.test(u))
    .map((url) => ({ type: 'video', url }));
  return { author: null, caption: null, media };
}

export function fileName(code, index, media) {
  const ext = media.type === 'video' ? 'mp4' : /\.webp(\?|$)/.test(media.url) ? 'webp' : 'jpg';
  return `threads_${code}_${index + 1}.${ext}`;
}
