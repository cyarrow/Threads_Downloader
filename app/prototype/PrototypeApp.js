// Clickable UI prototype of the collection feature, driven by fake data.
// Build: `npm run prototype:web` (EXPO_PUBLIC_PROTOTYPE=1). Nothing here is saved.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { INCOMING, POSTS, TAGS } from '../src/collection/mock/data';
import { filterPosts, indexTags, tagLabel } from '../src/collection/tagModel';
import { TAG_COLORS, font, radius, space, useCollectionTheme } from '../src/collection/tokens';
import { buzz } from '../src/collection/ui/base';
import { CardWall } from '../src/collection/ui/CardWall';
import { CardMenu, Toast } from '../src/collection/ui/Overlays';
import { PostDetail } from '../src/collection/ui/PostDetail';
import { SaveSheet } from '../src/collection/ui/SaveSheet';

const LOAD_MS = 1400;

export default function PrototypeApp() {
  return (
    <SafeAreaProvider>
      <Prototype />
    </SafeAreaProvider>
  );
}

function Banner() {
  const t = useCollectionTheme();
  return (
    <View style={[styles.banner, { backgroundColor: t.muted, borderColor: t.border }]}>
      <Text style={[font.meta, { color: t.mutedForeground }]}>介面雛形 · 假資料，操作不會真的存檔或下載</Text>
    </View>
  );
}

function Prototype() {
  const t = useCollectionTheme();
  const [tags, setTags] = useState(TAGS);
  const [posts, setPosts] = useState(POSTS);
  const [filter, setFilter] = useState([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [menuPost, setMenuPost] = useState(null);
  const [sheet, setSheet] = useState(null); // { mode: 'new' | 'edit', postId }
  const [sheetTags, setSheetTags] = useState([]);
  const [downloadToo, setDownloadToo] = useState(false);
  const [recent, setRecent] = useState(['fan-a', 'life']);
  const [toast, setToast] = useState(null);
  const deleted = useRef(null);

  const index = useMemo(() => indexTags(tags), [tags]);
  const visible = useMemo(() => filterPosts(posts, filter, appliedQuery, index), [posts, filter, appliedQuery, index]);
  const detail = posts.find((p) => p.id === detailId);
  const sheetPost = sheet && posts.find((p) => p.id === sheet.postId);
  const hideToast = useCallback(() => setToast(null), []);

  // Search waits until typing pauses (design: 250ms debounce).
  useEffect(() => {
    const timer = setTimeout(() => setAppliedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const update = (id, patch) => setPosts((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  // Simulates a link arriving from Threads' share menu or the + button.
  const add = () => {
    const id = `new-${Date.now()}`;
    setPosts((list) => [{ id, author: '', caption: '', media: [], tagIds: [], status: 'loading', savedAt: Date.now() }, ...list]);
    setSheetTags([]);
    setSheet({ mode: 'new', postId: id });
    setTimeout(() => update(id, { ...INCOMING, status: undefined }), LOAD_MS);
  };

  const retry = (post) => {
    update(post.id, { status: 'loading' });
    setTimeout(() => update(post.id, { ...INCOMING, author: post.author, status: undefined }), LOAD_MS);
  };

  const toggleSheetTag = (id) =>
    setSheetTags((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const createTag = (name, parentId) => {
    const used = new Set(tags.filter((tg) => !tg.parentId).map((tg) => tg.color));
    const color = parentId
      ? index.byId[parentId].color
      : Object.keys(TAG_COLORS).find((c) => c !== 'slate' && !used.has(c)) || 'indigo';
    const tag = { id: `tag-${Date.now()}`, name, parentId, color };
    setTags((list) => [...list, tag]);
    return tag;
  };

  const finishSheet = () => {
    const { mode, postId } = sheet;
    update(postId, { tagIds: sheetTags, ...(mode === 'new' && downloadToo ? { downloaded: true } : {}) });
    setRecent((list) => [...new Set([...sheetTags, ...list])].slice(0, 5));
    setSheet(null);
    buzz('success');
    const names = sheetTags.map((id) => index.byId[id]).filter(Boolean).map((tg) => tagLabel(tg, index.byId));
    const where = names.length ? `已收藏到 ${names.join('、')}` : '已收藏到「未分類」';
    setToast({ message: mode === 'new' ? where + (downloadToo ? '，下載中' : '') : '標籤已更新' });
  };

  const onAction = (kind, post) => {
    setMenuPost(null);
    switch (kind) {
      case 'feature':
        update(post.id, { featured: !post.featured });
        setToast({ message: post.featured ? '已取消精選' : '已設為精選，會放大成整排' });
        break;
      case 'tags':
        setSheetTags(post.tagIds);
        setSheet({ mode: 'edit', postId: post.id });
        break;
      case 'download':
        update(post.id, { downloaded: true });
        buzz('success');
        setToast({ message: '已存到「Threads」相簿' });
        break;
      case 'open':
        setToast({ message: '（雛形）這裡會跳到 Threads App 開啟這篇' });
        break;
      case 'more':
        setMenuPost(post);
        break;
      case 'delete':
        deleted.current = { post, at: posts.findIndex((p) => p.id === post.id) };
        setPosts((list) => list.filter((p) => p.id !== post.id));
        setDetailId(null);
        setToast({ message: '已刪除收藏', undo: true });
        break;
      default:
    }
  };

  const undo = () => {
    const d = deleted.current;
    if (!d) return;
    setPosts((list) => [...list.slice(0, d.at), d.post, ...list.slice(d.at)]);
    deleted.current = null;
    setToast(null);
  };

  // Android back closes the topmost layer first; the wall stays mounted underneath
  // so its scroll position and filters survive (state-preservation).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheet) return setSheet(null), true;
      if (menuPost) return setMenuPost(null), true;
      if (detailId) return setDetailId(null), true;
      return false;
    });
    return () => sub.remove();
  }, [sheet, menuPost, detailId]);

  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <CardWall
        posts={visible}
        index={index}
        filter={filter}
        onFilter={setFilter}
        query={query}
        onQuery={setQuery}
        onOpen={(p) => setDetailId(p.id)}
        onMenu={(p) => {
          buzz('light');
          setMenuPost(p);
        }}
        onRetry={retry}
        onAdd={add}
        onSettings={() => setToast({ message: '設定頁不在這次雛形範圍' })}
        banner={<Banner />}
      />
      {detail && (
        <View style={StyleSheet.absoluteFill}>
          <PostDetail post={detail} index={index} onBack={() => setDetailId(null)} onAction={onAction} />
        </View>
      )}
      <CardMenu post={menuPost} onClose={() => setMenuPost(null)} onAction={onAction} />
      <SaveSheet
        visible={!!sheet}
        mode={sheet?.mode}
        post={sheetPost}
        loading={sheetPost?.status === 'loading'}
        index={index}
        selected={sheetTags}
        onToggle={toggleSheetTag}
        onCreateTag={createTag}
        recentIds={recent}
        downloadToo={downloadToo}
        onDownloadToo={setDownloadToo}
        onDone={finishSheet}
        onClose={() => {
          if (sheet?.mode === 'new') setToast({ message: '已收藏到「未分類」' });
          setSheet(null);
        }}
      />
      <Toast toast={toast} onUndo={undo} onHide={hideToast} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  banner: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: space.xs, alignSelf: 'flex-start' },
});
