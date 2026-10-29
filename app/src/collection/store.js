import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadHistory } from '../history';
import { parseThreadsUrl } from '../threads';
import {
  DEFAULT_TAGS,
  fetchedFields,
  mergeTags,
  needsRefresh,
  newId,
  nextTagColor,
  postFromHistory,
  pushRecent,
} from './collectionModel';
import { deleteCover, saveCover } from './covers';
import { usePostFetcher } from './fetcher';
import { openRepo } from './openRepo';

const CollectionContext = createContext(null);

// How many old/migrated cards to refresh in the background per launch.
const BACKGROUND_REFRESH_MAX = 30;
// Keep a deleted card's cover file around this long so 復原 can bring it back.
const UNDO_MS = 8000;

// Owns the saved posts and tags: persists them (SQLite on device), fetches post
// details through the hidden WebView, keeps covers on disk, and migrates the old
// download history on first launch. `onNotice({ kind, ... })` reports things the
// UI should tell the user: 'duplicate', 'login', 'failed'.
export function CollectionProvider({ children, onNotice }) {
  const fetcher = usePostFetcher();
  const repo = useRef(null);
  const postsRef = useRef([]);
  const tagsRef = useRef([]);
  const aliases = useRef({}); // placeholder id → id of the card it turned out to duplicate
  const deleted = useRef(null);
  const noticeRef = useRef(onNotice);
  const [posts, setPostsState] = useState([]);
  const [tags, setTagsState] = useState([]);
  const [recent, setRecent] = useState([]);
  const [downloadToo, setDownloadTooState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    noticeRef.current = onNotice;
  }, [onNotice]);

  const setPosts = useCallback((fn) => {
    postsRef.current = fn(postsRef.current);
    setPostsState(postsRef.current);
  }, []);
  const setTags = useCallback((fn) => {
    tagsRef.current = fn(tagsRef.current);
    setTagsState(tagsRef.current);
  }, []);

  const patch = useCallback(
    async (id, fields) => {
      setPosts((list) => list.map((p) => (p.id === id ? { ...p, ...fields } : p)));
      await repo.current.updatePost(id, fields);
    },
    [setPosts],
  );

  const runFetch = useCallback(
    async (id) => {
      const post = postsRef.current.find((p) => p.id === id);
      if (!post) return;
      const background = post.status === 'ready';
      try {
        const data = await fetcher.fetchPost(post.url);
        const fields = fetchedFields(data);
        const existing = postsRef.current.find((p) => p.code === data.code && p.id !== id);
        if (existing) {
          // A share link (code unknown until now) pointed at a post that's already saved.
          const merged = mergeTags(existing.tagIds, postsRef.current.find((p) => p.id === id)?.tagIds || []);
          aliases.current[id] = existing.id;
          setPosts((list) =>
            list.filter((p) => p.id !== id).map((p) => (p.id === existing.id ? { ...p, ...fields, tagIds: merged } : p)),
          );
          await repo.current.deletePost(id);
          await repo.current.updatePost(existing.id, fields);
          await repo.current.setPostTags(existing.id, merged);
          noticeRef.current?.({ kind: 'duplicate', id: existing.id });
          return;
        }
        await patch(id, fields);
        const cover = await saveCover(data.code, data.media[0]?.poster);
        if (cover) await patch(id, { cover });
      } catch (e) {
        if (background) return; // keep an existing card as it is if a refresh fails
        await patch(id, { status: 'failed', error: e.kind || 'network' });
        noticeRef.current?.({ kind: e.kind === 'login' ? 'login' : 'failed', id });
      }
    },
    [fetcher, patch, setPosts],
  );

  // First launch: default tags, then old download history → cards. Then load
  // everything and resume fetches that didn't finish last time.
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await openRepo();
      await r.init();
      repo.current = r;
      if (!(await r.getMeta('seeded'))) {
        let t = 0;
        for (const tag of DEFAULT_TAGS) {
          await r.insertTag({ id: newId('t'), name: tag.name, parentId: null, color: tag.color, createdAt: Date.now() + t++ });
        }
        await r.setMeta('seeded', '1');
      }
      if (!(await r.getMeta('migrated_history'))) {
        const seen = new Set();
        for (const entry of await loadHistory()) {
          if (!entry.code || seen.has(entry.code) || (await r.findByCode(entry.code))) continue;
          seen.add(entry.code);
          await r.insertPost(postFromHistory(entry));
        }
        await r.setMeta('migrated_history', '1');
      }
      const [p, t] = await Promise.all([r.listPosts(), r.listTags()]);
      const rec = JSON.parse((await r.getMeta('recent')) || '[]');
      const dl = (await r.getMeta('download_too')) === '1';
      if (!alive) return;
      postsRef.current = p;
      tagsRef.current = t;
      setPostsState(p);
      setTagsState(t);
      setRecent(rec.filter((id) => t.some((tag) => tag.id === id)));
      setDownloadTooState(dl);
      setReady(true);
      const resume = p.filter(needsRefresh);
      const loading = resume.filter((x) => x.status === 'loading');
      const stale = resume.filter((x) => x.status !== 'loading').slice(0, BACKGROUND_REFRESH_MAX);
      [...loading, ...stale].forEach((x) => runFetch(x.id));
    })();
    return () => {
      alive = false;
    };
    // runFetch is stable enough; this must run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Saves a link right away as a "loading" card and fetches its details.
  // Returns { status: 'added' | 'exists' | 'invalid', id }.
  const addFromUrl = useCallback(
    async (text) => {
      const parsed = parseThreadsUrl(text);
      if (!parsed) return { status: 'invalid' };
      const existing = parsed.code && postsRef.current.find((p) => p.code === parsed.code);
      if (existing) return { status: 'exists', id: existing.id };
      const post = {
        id: newId('p'),
        code: parsed.code,
        url: parsed.url,
        author: '',
        caption: '',
        media: [],
        cover: null,
        status: 'loading',
        featured: false,
        downloaded: false,
        savedAt: Date.now(),
        fetchedAt: null,
        tagIds: [],
      };
      setPosts((list) => [post, ...list]);
      await repo.current.insertPost(post);
      runFetch(post.id);
      return { status: 'added', id: post.id };
    },
    [runFetch, setPosts],
  );

  const resolveId = useCallback((id) => aliases.current[id] || id, []);

  const setPostTags = useCallback(
    async (id, tagIds) => {
      const target = aliases.current[id] || id;
      setPosts((list) => list.map((p) => (p.id === target ? { ...p, tagIds } : p)));
      await repo.current.setPostTags(target, tagIds);
      if (tagIds.length) {
        const next = pushRecent(recent, tagIds);
        setRecent(next);
        await repo.current.setMeta('recent', JSON.stringify(next));
      }
    },
    [recent, setPosts],
  );

  const createTag = useCallback(
    async (name, parentId) => {
      const parent = parentId && tagsRef.current.find((t) => t.id === parentId);
      const tag = {
        id: newId('t'),
        name: name.trim(),
        parentId: parentId || null,
        color: parent ? parent.color : nextTagColor(tagsRef.current),
        createdAt: Date.now(),
      };
      setTags((list) => [...list, tag]);
      await repo.current.insertTag(tag);
      return tag;
    },
    [setTags],
  );

  const setDownloadToo = useCallback(async (value) => {
    setDownloadTooState(value);
    await repo.current?.setMeta('download_too', value ? '1' : '0');
  }, []);

  const toggleFeatured = useCallback(
    (id) => {
      const post = postsRef.current.find((p) => p.id === id);
      if (post) return patch(id, { featured: !post.featured });
    },
    [patch],
  );

  const markDownloaded = useCallback(
    async (code) => {
      for (const p of postsRef.current.filter((x) => x.code === code && !x.downloaded)) {
        await patch(p.id, { downloaded: true });
      }
    },
    [patch],
  );

  const retry = useCallback(
    async (id) => {
      await patch(id, { status: 'loading', error: null });
      runFetch(id);
    },
    [patch, runFetch],
  );

  const retryLoginFailures = useCallback(() => {
    postsRef.current.filter((p) => p.status === 'failed' && p.error === 'login').forEach((p) => retry(p.id));
  }, [retry]);

  const remove = useCallback(
    async (id) => {
      const post = postsRef.current.find((p) => p.id === id);
      if (!post) return;
      if (deleted.current) {
        clearTimeout(deleted.current.timer);
        deleteCover(deleted.current.post.cover);
      }
      const timer = setTimeout(() => {
        deleteCover(post.cover);
        deleted.current = null;
      }, UNDO_MS);
      deleted.current = { post, index: postsRef.current.indexOf(post), timer };
      setPosts((list) => list.filter((p) => p.id !== id));
      await repo.current.deletePost(id);
    },
    [setPosts],
  );

  const undoRemove = useCallback(async () => {
    const d = deleted.current;
    if (!d) return;
    clearTimeout(d.timer);
    deleted.current = null;
    // The same post may have been saved again in the meantime; then there's nothing to restore.
    if (d.post.code && postsRef.current.some((p) => p.code === d.post.code)) return;
    setPosts((list) => [...list.slice(0, d.index), d.post, ...list.slice(d.index)]);
    await repo.current.insertPost(d.post);
  }, [setPosts]);

  // Re-reads a saved post (fresh media links) without turning its card into a skeleton.
  const refresh = useCallback((id) => runFetch(id), [runFetch]);

  const value = useMemo(
    () => ({
      ready,
      posts,
      tags,
      recent,
      downloadToo,
      fetcherView: fetcher.webView,
      addFromUrl,
      resolveId,
      setPostTags,
      createTag,
      setDownloadToo,
      toggleFeatured,
      markDownloaded,
      retry,
      refresh,
      retryLoginFailures,
      remove,
      undoRemove,
    }),
    [ready, posts, tags, recent, downloadToo, fetcher.webView, addFromUrl, resolveId, setPostTags, createTag,
      setDownloadToo, toggleFeatured, markDownloaded, retry, refresh, retryLoginFailures, remove, undoRemove],
  );

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error('useCollection must be used inside CollectionProvider');
  return ctx;
}
