import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { leaveToThreads, systemToast } from '../appExit';
import { mergeTags } from './collectionModel';
import { suggestTags } from './suggest';
import { tagLabel } from './tagModel';
import { withRuleTags } from './tagRules';
import { buzz } from './ui/base';

// Longest a finished share waits for its post to be read before going back to Threads.
const LEAVE_WAIT_MS = 5000;

// The save / edit-tags sheet (ui/SaveSheet.js): which post it is for, the tags
// picked so far, the 「加一句筆記…」 draft, and what happens when it closes.
// `requestDownload(id, fromShare)`: queue a download (useDownloads). `notify(toast)`.
// Returns `props` to spread on <SaveSheet>, `open` and `close()` for the back
// button, and the ways to open it: `openCollected` (a link just saved),
// `editTags(post)` and `pickDeckTags(post, done)` (翻翻, which moves past the
// card once its tags are set and reports the result itself).
export function useSaveSheet({ c, index, notify, requestDownload }) {
  const [sheet, setSheet] = useState(null); // { mode: 'new' | 'edit', postId, fromShare, quick, quiet }
  const [tags, setTags] = useState([]);
  const [note, setNote] = useState('');
  const touched = useRef(new Set()); // tags toggled by hand in the open sheet
  const afterSheet = useRef(null); // the deck moving past a card once its tags are set
  // A share that is done: go back to Threads once its post has been read. Leaving
  // closes the app's screen and with it the hidden page reading the post, which
  // then stayed 「讀取中」 until the next launch. `leaveWhenRead` holds the post id.
  const leaveWhenRead = useRef(null);
  const leaveNow = () => {
    if (!leaveWhenRead.current) return;
    leaveWhenRead.current = null;
    leaveToThreads();
  };
  useEffect(() => {
    const id = leaveWhenRead.current;
    if (!id) return;
    const p = c.posts.find((x) => x.id === c.resolveId(id));
    if (!p || p.status !== 'loading') leaveNow();
  });

  const post = sheet && c.posts.find((p) => p.id === c.resolveId(sheet.postId));
  const suggestions = useMemo(() => (post?.status === 'ready' ? suggestTags(post, c.posts, index) : []), [post, c.posts, index]);
  // Rules run when a newly saved post finishes loading (store.js). If its save
  // sheet is still open, the tags they added show there as picked, with the
  // reason, unless the user already toggled that tag by hand. The row is drawn
  // from the start (when the user has rules) so nothing moves when they arrive.
  const hits = sheet?.mode === 'new' && post ? c.ruleHits[post.id] : undefined;
  useEffect(() => {
    if (hits) setTags((list) => withRuleTags(list, hits, touched.current));
  }, [hits]);
  const ruleSlot =
    sheet?.mode === 'new' && c.rules.length
      ? { status: post?.status === 'loading' ? 'loading' : post?.status === 'failed' ? 'failed' : 'ready', hits: hits || [] }
      : null;

  // Opens the save sheet for a just-collected link (or the edit sheet if it was
  // already saved). Returns the status.
  const openCollected = (res, fromShare) => {
    if (res.status === 'invalid') {
      notify({ message: '這不是 Threads 貼文連結' });
      return 'invalid';
    }
    const existing = res.status === 'exists' && c.posts.find((p) => p.id === res.id);
    // This sheet replaces any open one (e.g. a share arriving while the deck's
    // tag sheet is up): the deck must not treat this post's tags as its card's.
    afterSheet.current = null;
    setTags(existing ? existing.tagIds : []);
    setNote('');
    touched.current = new Set();
    // Shares open the compact 快速面板 unless the user turned it off in settings.
    setSheet({ mode: existing ? 'edit' : 'new', postId: res.id, fromShare, quick: fromShare && !existing && c.quickSave });
    if (existing) notify({ message: '這篇已經收藏過，可以直接改標籤' });
    return res.status;
  };

  const editTags = (p) => {
    setTags(p.tagIds);
    setSheet({ mode: 'edit', postId: p.id, fromShare: false });
  };
  const pickDeckTags = useCallback((p, done) => {
    afterSheet.current = done;
    setTags(p.tagIds);
    setSheet({ mode: 'edit', postId: p.id, fromShare: false, quiet: true });
  }, []);

  // Applies the picked tags. Closing the sheet keeps them too, so nothing is lost.
  // `picked`: a quick-panel tap passes its one tag instead of the picker's selection.
  const finish = async ({ closed = false, picked = tags } = {}) => {
    if (!sheet) return;
    const { postId, mode, fromShare, quiet } = sheet;
    const id = c.resolveId(postId);
    setSheet(null);
    // A shared link that turned out to be an already-saved card: add to its tags, don't replace them.
    const prior = mode === 'new' && id !== postId ? c.posts.find((p) => p.id === id)?.tagIds || [] : [];
    await c.setPostTags(id, mergeTags(prior, picked));
    if (mode === 'new' && note.trim()) await c.setNote(id, note, { merge: true });
    const willDownload = !closed && mode === 'new' && c.downloadToo;
    if (willDownload) requestDownload(id, fromShare);
    const names = picked.map((tid) => index.byId[tid]).filter(Boolean).map((tg) => tagLabel(tg, index.byId));
    const message =
      mode === 'edit'
        ? '標籤已更新'
        : (names.length ? `已收藏到 ${names.join('、')}` : '已收藏到「未分類」') + (willDownload ? '，下載中' : '');
    if (!closed) buzz('success');
    if (afterSheet.current) {
      afterSheet.current(picked);
      afterSheet.current = null;
    }
    if (fromShare) {
      systemToast(message);
      if (!willDownload) {
        const saved = c.posts.find((p) => p.id === id);
        if (!saved || saved.status !== 'loading') leaveToThreads();
        else {
          leaveWhenRead.current = id;
          setTimeout(leaveNow, LEAVE_WAIT_MS); // don't keep the user here for a slow page
        }
      }
    } else if (!quiet) {
      // The deck reports its own result in its status line, where the toast
      // would cover its buttons.
      notify({ message });
    }
  };
  const close = () => finish({ closed: true });

  const props = {
    visible: !!sheet,
    mode: sheet?.mode,
    quick: sheet?.quick,
    post,
    loading: post?.status === 'loading',
    index,
    selected: tags,
    onToggle: (id) => {
      touched.current.add(id);
      setTags((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
    },
    onCreateTag: c.createTag,
    recentIds: c.recent,
    suggestions,
    downloadToo: c.downloadToo,
    onDownloadToo: c.setDownloadToo,
    onDone: () => finish(),
    onClose: close,
    onQuickPick: (id) => finish({ picked: mergeTags([id], tags) }),
    onExpand: () => setSheet((s) => s && { ...s, quick: false }),
    ruleSlot,
    note,
    onNote: setNote,
  };

  return { props, open: !!sheet, close, openCollected, editTags, pickDeckTags };
}
