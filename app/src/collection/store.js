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
import { makeBackup, parseBackup, planImport } from './backup';
import { applyTagDiff, removePosts, restorePosts } from './batch';
import { mergeNote, normalizeNote } from './noteModel';
import { autoTags, dropRules, normalizeRuleValue, postsToTag, repointRules } from './tagRules';
import { useAutoBackup } from './autoBackup';
import { deleteCover, saveCover } from './covers';
import { usePostFetcher } from './fetcher';
import { openRepo } from './openRepo';
import { DEFAULT_THEME, normalizeThemeId } from './themes';
import { ThemeProvider } from './tokens';

const CollectionContext = createContext(null);

const sameTags = (a, b) => a.length === b.length && a.every((id) => b.includes(id));

// How many old/migrated cards to refresh in the background per launch.
const BACKGROUND_REFRESH_MAX = 30;
// Keep a deleted card's cover file around this long so 復原 can bring it back.
const UNDO_MS = 8000;

// Owns the saved posts and tags: persists them (SQLite on device), fetches post
// details through the hidden WebView, keeps covers on disk, and migrates the old
// download history on first launch. `onNotice({ kind, ... })` reports things the
// UI should tell the user: 'duplicate', 'login', 'failed'.
// Also 自動標籤規則 (tagRules.js) and 個人筆記 (noteModel.js); their actions are in
// their own block below.
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
  const [quickSave, setQuickSaveState] = useState(true); // 分享時用快速面板 (default on)
  const [theme, setThemeState] = useState(DEFAULT_THEME); // 設定 › 主題
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

  // --- 自動標籤規則: state (actions are further down) ---
  const rulesRef = useRef([]);
  const [rules, setRulesState] = useState([]);
  // postId → [{ tagId, rule }]: the rules that matched a newly saved post when it
  // finished loading, so the save sheet can show those tags as picked and why.
  const [ruleHits, setRuleHits] = useState({});
  const setRules = useCallback((fn) => {
    rulesRef.current = fn(rulesRef.current);
    setRulesState(rulesRef.current);
  }, []);
  // The tags a newly saved post gets from the rules, on top of the tags it has
  // right now (the user may have picked some while it loaded). Null = no change.
  const ruleTagsOnLoad = useCallback((id, fields) => {
    const current = postsRef.current.find((p) => p.id === id);
    if (!current || !rulesRef.current.length) return null;
    const { hits, tagIds } = autoTags({ ...current, ...fields }, rulesRef.current, tagsRef.current);
    if (hits.length) setRuleHits((m) => ({ ...m, [id]: hits }));
    return tagIds;
  }, []);

  // --- Fetch health (see fetchHealth.js) ---
  // Earlier failures that a later fetch showed were the reader breaking, not
  // deleted posts or a logged-out page.
  const relabelAsParse = useCallback(
    async (urls = []) => {
      for (const url of urls) {
        const p = postsRef.current.find((x) => x.url === url && x.status === 'failed' && x.error !== 'parse');
        if (p) await patch(p.id, { error: 'parse' });
      }
    },
    [patch],
  );

  const runFetch = useCallback(
    async (id) => {
      const post = postsRef.current.find((p) => p.id === id);
      if (!post) return;
      const background = post.status === 'ready';
      const fresh = !background && !post.fetchedAt; // newly saved (or its first try failed)
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
        // Rule tags land in the same update as the post's details, so the save
        // sheet never draws the post as ready without them.
        const ruleTags = fresh ? ruleTagsOnLoad(id, fields) : null;
        await patch(id, ruleTags ? { ...fields, tagIds: ruleTags } : fields);
        if (ruleTags) await repo.current.setPostTags(id, postsRef.current.find((p) => p.id === id)?.tagIds || ruleTags);
        const cover = await saveCover(data.code, data.media[0]?.poster);
        if (cover) await patch(id, { cover });
      } catch (e) {
        await relabelAsParse(e.reclassify);
        if (background) return; // keep an existing card as it is if a refresh fails
        await patch(id, { status: 'failed', error: e.kind || 'network' });
        noticeRef.current?.({ kind: e.kind === 'login' ? 'login' : 'failed', id });
      }
    },
    [fetcher, patch, setPosts, relabelAsParse, ruleTagsOnLoad],
  );

  // First launch: default tags, then old download history → cards. Then load
  // everything and resume fetches that didn't finish last time.
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await openRepo();
      await r.init();
      repo.current = r;
      // The theme first, before seeding and migration, so the first screen is drawn in it.
      const th = normalizeThemeId(await r.getMeta('theme'));
      if (alive) setThemeState(th);
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
      const [p, t, rl] = await Promise.all([r.listPosts(), r.listTags(), r.listRules()]);
      const rec = JSON.parse((await r.getMeta('recent')) || '[]');
      const dl = (await r.getMeta('download_too')) === '1';
      const qs = (await r.getMeta('quick_save')) !== '0';
      if (!alive) return;
      postsRef.current = p;
      tagsRef.current = t;
      rulesRef.current = rl;
      setPostsState(p);
      setTagsState(t);
      setRulesState(rl);
      setRecent(rec.filter((id) => t.some((tag) => tag.id === id)));
      setDownloadTooState(dl);
      setQuickSaveState(qs);
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
        note: '',
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

  const setQuickSave = useCallback(async (value) => {
    setQuickSaveState(value);
    await repo.current?.setMeta('quick_save', value ? '1' : '0');
  }, []);

  const setTheme = useCallback(async (id) => {
    const value = normalizeThemeId(id);
    setThemeState(value);
    await repo.current?.setMeta('theme', value);
  }, []);

  const toggleFeatured = useCallback(
    (id) => {
      const post = postsRef.current.find((p) => p.id === id);
      if (post) return patch(id, { featured: !post.featured });
    },
    [patch],
  );

  // Explicit value (the 翻翻 deck sets 精選 and its undo puts the old value back).
  const setFeatured = useCallback(
    (id, featured) => {
      const post = postsRef.current.find((p) => p.id === id);
      if (post && !!post.featured !== !!featured) return patch(id, { featured: !!featured });
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

  // Called once the login sheet reports a working session.
  const { noteLogin } = fetcher;
  const retryLoginFailures = useCallback(() => {
    noteLogin();
    postsRef.current.filter((p) => p.status === 'failed' && p.error === 'login').forEach((p) => retry(p.id));
  }, [retry, noteLogin]);

  // Retries every failed card. Each retry goes into the fetcher's one-at-a-time
  // queue in wall order, so this never opens a burst of pages at once.
  // Returns how many were queued.
  const retryAllFailed = useCallback(async () => {
    const ids = postsRef.current.filter((p) => p.status === 'failed').map((p) => p.id);
    for (const id of ids) await retry(id);
    return ids.length;
  }, [retry]);

  // Deletes one or many cards. The last delete (all its cards) can be undone
  // with undoRemove until the next delete or UNDO_MS; covers stay on disk until then.
  // Returns how many cards were removed.
  const removeMany = useCallback(
    async (ids) => {
      const { kept, removed } = removePosts(postsRef.current, ids);
      if (!removed.length) return 0;
      if (deleted.current) {
        clearTimeout(deleted.current.timer);
        deleted.current.removed.forEach((r) => deleteCover(r.post.cover));
      }
      const timer = setTimeout(() => {
        removed.forEach((r) => deleteCover(r.post.cover));
        deleted.current = null;
      }, UNDO_MS);
      deleted.current = { removed, timer };
      setPosts(() => kept);
      for (const { post } of removed) await repo.current.deletePost(post.id);
      return removed.length;
    },
    [setPosts],
  );

  const remove = useCallback((id) => removeMany([id]), [removeMany]);

  const undoRemove = useCallback(async () => {
    const d = deleted.current;
    if (!d) return;
    clearTimeout(d.timer);
    deleted.current = null;
    // A post may have been saved again in the meantime; then there's nothing to restore for it.
    const back = d.removed.filter((r) => !(r.post.code && postsRef.current.some((p) => p.code === r.post.code)));
    setPosts((list) => restorePosts(list, back));
    for (const { post } of back) await repo.current.insertPost(post);
  }, [setPosts]);

  // --- 批次選取: edit many cards at once ---
  // `diff`: { add, remove } tag ids from the tri-state picker (batch.js); posts
  // whose tags don't actually change aren't written. Returns how many changed.
  const setTagsMany = useCallback(
    async (ids, diff) => {
      const before = postsRef.current;
      const after = applyTagDiff(before, ids, diff).map((p, i) => (sameTags(p.tagIds, before[i].tagIds) ? before[i] : p));
      const changed = after.filter((p, i) => p !== before[i]);
      setPosts(() => after);
      for (const p of changed) await repo.current.setPostTags(p.id, p.tagIds);
      if (diff.add.length) {
        const next = pushRecent(recent, diff.add);
        setRecent(next);
        await repo.current.setMeta('recent', JSON.stringify(next));
      }
      return changed.length;
    },
    [recent, setPosts],
  );

  const setFeaturedMany = useCallback(
    async (ids, featured) => {
      for (const id of ids) await setFeatured(id, featured);
    },
    [setFeatured],
  );

  // Re-reads a saved post (fresh media links) without turning its card into a skeleton.
  const refresh = useCallback((id) => runFetch(id), [runFetch]);

  // --- Tag management (phase 2) ---
  const renameTag = useCallback(
    async (id, name) => {
      setTags((list) => list.map((t) => (t.id === id ? { ...t, name: name.trim() } : t)));
      await repo.current.updateTag(id, { name: name.trim() });
    },
    [setTags],
  );

  const recolorTag = useCallback(
    async (id, color) => {
      setTags((list) => list.map((t) => (t.id === id || t.parentId === id ? { ...t, color } : t)));
      await repo.current.updateTag(id, { color });
    },
    [setTags],
  );

  const deleteTag = useCallback(
    async (id) => {
      const gone = new Set(tagsRef.current.filter((t) => t.id === id || t.parentId === id).map((t) => t.id));
      setTags((list) => list.filter((t) => !gone.has(t.id)));
      setPosts((list) => list.map((p) => ({ ...p, tagIds: p.tagIds.filter((x) => !gone.has(x)) })));
      setRecent((list) => list.filter((x) => !gone.has(x)));
      setRules((list) => dropRules(list, gone)); // the repo drops them by ON DELETE CASCADE
      await repo.current.deleteTag(id);
    },
    [setPosts, setTags, setRules],
  );

  const mergeTag = useCallback(
    async (fromId, toId) => {
      setPosts((list) =>
        list.map((p) =>
          p.tagIds.includes(fromId) ? { ...p, tagIds: [...new Set(p.tagIds.filter((x) => x !== fromId).concat(toId))] } : p,
        ),
      );
      setTags((list) => list.filter((t) => t.id !== fromId).map((t) => (t.parentId === fromId ? { ...t, parentId: toId } : t)));
      setRecent((list) => list.filter((x) => x !== fromId));
      setRules((list) => repointRules(list, fromId, toId));
      await repo.current.mergeTag(fromId, toId);
    },
    [setPosts, setTags, setRules],
  );

  // --- Backup (phase 3) ---
  // Auto backup to a picked folder + the backup reminder (see autoBackup.js).
  const autoBackup = useAutoBackup({ repo, ready, posts, postsRef, tagsRef, rulesRef });
  const { noteManualExport } = autoBackup;
  const exportBackup = useCallback(() => {
    noteManualExport();
    return JSON.stringify(makeBackup(postsRef.current, tagsRef.current, rulesRef.current), null, 1);
  }, [noteManualExport]);

  // Returns { added, skipped }; throws with a readable message for bad files.
  const importBackup = useCallback(
    async (text) => {
      const plan = planImport(parseBackup(text), { posts: postsRef.current, tags: tagsRef.current, rules: rulesRef.current }, newId);
      for (const tag of plan.tagsToCreate) await repo.current.insertTag(tag);
      for (const post of plan.postsToInsert) await repo.current.insertPost(post);
      for (const rule of plan.rulesToCreate) await repo.current.insertRule(rule);
      for (const { id, note } of plan.notesToFill) await repo.current.updatePost(id, { note });
      const filled = Object.fromEntries(plan.notesToFill.map((n) => [n.id, n.note]));
      setTags((list) => [...list, ...plan.tagsToCreate]);
      setRules((list) => [...list, ...plan.rulesToCreate]);
      setPosts((list) =>
        [...list.map((p) => (filled[p.id] ? { ...p, note: filled[p.id] } : p)), ...plan.postsToInsert].sort((a, b) => b.savedAt - a.savedAt),
      );
      // Bring covers and fresh links back in the background.
      plan.postsToInsert.slice(0, BACKGROUND_REFRESH_MAX).forEach((p) => runFetch(p.id));
      return { added: plan.postsToInsert.length, skipped: plan.skipped };
    },
    [runFetch, setPosts, setTags, setRules],
  );

  // --- 自動標籤規則: actions ------------------------------------------------------
  // createRule / updateRule take { kind, value, tagId } (validate with ruleError
  // first) and return the stored rule.
  const createRule = useCallback(
    async ({ kind, value, tagId }) => {
      const rule = { id: newId('r'), kind, value: normalizeRuleValue(kind, value), tagId, createdAt: Date.now() };
      setRules((list) => [...list, rule]);
      await repo.current.insertRule(rule);
      return rule;
    },
    [setRules],
  );

  const updateRule = useCallback(
    async (id, { kind, value, tagId }) => {
      const fields = { kind, value: normalizeRuleValue(kind, value), tagId };
      setRules((list) => list.map((r) => (r.id === id ? { ...r, ...fields } : r)));
      await repo.current.updateRule(id, fields);
      return rulesRef.current.find((r) => r.id === id);
    },
    [setRules],
  );

  const deleteRule = useCallback(
    async (id) => {
      setRules((list) => list.filter((r) => r.id !== id));
      await repo.current.deleteRule(id);
    },
    [setRules],
  );

  // 套用到現有收藏: adds the rule's tag to every saved post it matches.
  // Returns the ids of the posts that changed (for 復原 → unapplyRule).
  const applyRule = useCallback(
    async (rule) => {
      const ids = postsToTag(rule, postsRef.current, tagsRef.current).map((p) => p.id);
      const changed = new Set(ids);
      setPosts((list) => list.map((p) => (changed.has(p.id) ? { ...p, tagIds: [...p.tagIds, rule.tagId] } : p)));
      for (const id of ids) await repo.current.setPostTags(id, postsRef.current.find((p) => p.id === id).tagIds);
      return ids;
    },
    [setPosts],
  );

  const unapplyRule = useCallback(
    async (tagId, ids) => {
      const changed = new Set(ids);
      setPosts((list) => list.map((p) => (changed.has(p.id) ? { ...p, tagIds: p.tagIds.filter((x) => x !== tagId) } : p)));
      for (const id of ids) {
        const p = postsRef.current.find((x) => x.id === id);
        if (p) await repo.current.setPostTags(id, p.tagIds);
      }
    },
    [setPosts],
  );

  // --- 個人筆記 ---------------------------------------------------------------------
  // `merge`: add to an existing note instead of replacing it (the save sheet's
  // 「加一句筆記…」 for a link that turned out to be saved already).
  const setNote = useCallback(
    async (id, text, { merge = false } = {}) => {
      const target = aliases.current[id] || id;
      const post = postsRef.current.find((p) => p.id === target);
      if (!post) return;
      const note = merge ? mergeNote(post.note, text) : normalizeNote(text);
      if (note !== (post.note || '')) await patch(target, { note });
    },
    [patch],
  );

  const value = useMemo(
    () => ({
      ready,
      posts,
      tags,
      recent,
      downloadToo,
      quickSave,
      fetcherView: fetcher.webView,
      addFromUrl,
      resolveId,
      setPostTags,
      createTag,
      setDownloadToo,
      setQuickSave,
      toggleFeatured,
      setFeatured,
      markDownloaded,
      retry,
      refresh,
      retryLoginFailures,
      retryAllFailed,
      remove,
      removeMany,
      undoRemove,
      setTagsMany,
      setFeaturedMany,
      renameTag,
      recolorTag,
      deleteTag,
      mergeTag,
      exportBackup,
      importBackup,
      autoBackup,
      // 自動標籤規則 + 個人筆記
      rules,
      ruleHits,
      createRule,
      updateRule,
      deleteRule,
      applyRule,
      unapplyRule,
      setNote,
    }),
    [ready, posts, tags, recent, downloadToo, fetcher.webView, addFromUrl, resolveId, setPostTags, createTag,
      setDownloadToo, toggleFeatured, setFeatured, quickSave, setQuickSave, markDownloaded, retry, refresh, retryLoginFailures, retryAllFailed, remove, removeMany, undoRemove, setTagsMany, setFeaturedMany, renameTag, recolorTag, deleteTag, mergeTag,
      exportBackup, importBackup,
      autoBackup,
      rules, ruleHits, createRule, updateRule, deleteRule, applyRule, unapplyRule, setNote],
  );

  return (
    <CollectionContext.Provider value={value}>
      <ThemeProvider id={theme} onChange={setTheme}>
        {children}
      </ThemeProvider>
    </CollectionContext.Provider>
  );
}

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error('useCollection must be used inside CollectionProvider');
  return ctx;
}
