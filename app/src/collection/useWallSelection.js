import { useState } from 'react';
import { featureTarget, pruneSelection, selectableIds, splitDownloadable, toggleId } from './batch';
import { buzz } from './ui/base';

// 批次選取 state for the card walls (收藏, a tag page, an author page). A
// selection belongs to the wall it started on (`currentWall`, navModel.wallKey):
// when that changes — another page, back, another tab — it ends.
// `wallPosts`: the cards on that wall now; picked cards a filter, search or
// delete has hidden drop out, so an action never touches a card the user can't see.
// `c`: the collection (setFeaturedMany / setTagsMany / removeMany).
// `download(id)`: queue one post in the downloader. `notify(toast)`: show a toast.
export function useWallSelection({ currentWall, wallPosts, c, download, notify }) {
  const [selection, setSelection] = useState(null); // { key, ids }
  const [sheet, setSheet] = useState(null); // 'tags' | 'delete'
  if (selection && selection.key !== currentWall) {
    setSelection(null);
    setSheet(null);
  }
  const active = !!selection && selection.key === currentWall;
  const ids = active ? pruneSelection(selection.ids, wallPosts) : [];

  const act = async (kind) => {
    if (!ids.length) return;
    if (kind === 'tags' || kind === 'delete') {
      setSheet(kind);
    } else if (kind === 'feature') {
      const on = featureTarget(c.posts, ids);
      await c.setFeaturedMany(ids, on);
      notify({ message: on ? `已把 ${ids.length} 篇設為精選` : `已取消 ${ids.length} 篇的精選` });
    } else if (kind === 'download') {
      // Into the downloader's queue, one after another (carousels still ask which items).
      const { ok, skipped } = splitDownloadable(c.posts, ids);
      ok.forEach((p) => download(p.id));
      if (ok.length) setSelection(null);
      const rest = skipped.length ? `，${skipped.length} 篇沒有可下載的媒體` : '';
      notify({ message: ok.length ? `已加入下載：${ok.length} 篇${rest}` : '選的貼文都沒有可下載的媒體' });
    }
  };

  return {
    active,
    ids,
    sheet,
    closeSheet: () => setSheet(null),
    exit: () => setSelection(null),
    // Enter selection on a wall, optionally with one card already picked (long-press menu).
    start: (key, firstId) => key && setSelection({ key, ids: firstId ? [firstId] : [] }),
    // CardWall's `selection` prop for the wall `key` (null unless selecting there).
    propsFor: (key, posts) =>
      active && selection.key === key
        ? {
            ids,
            featureOn: featureTarget(c.posts, ids),
            onToggle: (id) => setSelection((s) => s && { ...s, ids: toggleId(s.ids, id) }),
            onSelectAll: () => setSelection((s) => s && { ...s, ids: selectableIds(posts) }),
            onClear: () => setSelection((s) => s && { ...s, ids: [] }),
            onExit: () => setSelection(null),
            onAction: act,
          }
        : null,
    applyTags: async (diff) => {
      setSheet(null);
      const n = await c.setTagsMany(ids, diff);
      buzz('success');
      notify({ message: n ? `已更新 ${n} 篇的標籤` : '標籤沒有變更' });
    },
    confirmDelete: async () => {
      setSheet(null);
      setSelection(null);
      const n = await c.removeMany(ids);
      notify({ message: `已刪除 ${n} 篇收藏`, undo: true });
    },
  };
}
