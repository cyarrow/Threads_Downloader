// A saved card's media can be downloaded straight away when it was read
// recently: Threads' media links are signed and expire, but within a few hours
// of the card being read they still work, so the downloader can skip loading
// the post's page a second time. Older cards (or cards without media links)
// return null and the downloader reads the page as before; a known post whose
// links fail anyway is read again too (useDownloader). Pure: Node-testable.

export const FRESH_MS = 3 * 60 * 60 * 1000;

export function knownPost(post, now = Date.now()) {
  if (!post || post.status !== 'ready' || !post.code || !post.fetchedAt) return null;
  if (now - post.fetchedAt > FRESH_MS) return null;
  const media = Array.isArray(post.media) ? post.media : [];
  if (!media.length || !media.every((m) => /^https?:\/\//.test(m?.url || ''))) return null;
  return { code: post.code, url: post.url, author: post.author || null, caption: post.caption || null, media };
}
