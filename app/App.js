import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Linking, Platform, StyleSheet, ToastAndroid, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useShareIntent } from 'expo-share-intent';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useDownloader } from './src/useDownloader';
import { summary } from './src/historyModel';
import { parseThreadsUrl } from './src/threads';
import { checkForUpdate } from './src/updates';
import { CollectionProvider, useCollection } from './src/collection/store';
import { useBrandFont } from './src/collection/fonts';
import { filterPosts, indexTags, tagLabel } from './src/collection/tagModel';
import { useCollectionTheme } from './src/collection/tokens';
import { pickBackup, shareBackup } from './src/collection/backupIO';
import { pickRediscover, randomPicks } from './src/collection/rediscover';
import { suggestTags } from './src/collection/suggest';
import { RediscoverCard, TagManager, Triage } from './src/collection/ui/Phase2';
import { SecondaryButton } from './src/collection/ui/base';
import { buzz } from './src/collection/ui/base';
import { CardWall } from './src/collection/ui/CardWall';
import { CardMenu, Toast } from './src/collection/ui/Overlays';
import { PostDetail } from './src/collection/ui/PostDetail';
import { SaveSheet } from './src/collection/ui/SaveSheet';
import {
  AddLinkSheet,
  DownloadPickerSheet,
  DownloadPill,
  LoginSheet,
  SettingsSheet,
  UpdateBanner,
} from './src/collection/ui/AppSheets';

// How long a confirmation stays visible before handing the user back to Threads.
const RETURN_DELAY_MS = 700;
const SEARCH_DEBOUNCE_MS = 250;

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const [notice, setNotice] = useState(null);
  const onNotice = useCallback((n) => setNotice({ ...n, at: Date.now() }), []);
  useBrandFont();
  return (
    <CollectionProvider onNotice={onNotice}>
      <Home notice={notice} />
    </CollectionProvider>
  );
}

// Toast that survives leaving the app (shown over Threads); in-app toast otherwise.
function systemToast(message) {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
}

function leaveToThreads() {
  if (Platform.OS === 'android') setTimeout(() => BackHandler.exitApp(), RETURN_DELAY_MS);
}

function Home({ notice }) {
  const t = useCollectionTheme();
  const c = useCollection();
  const index = useMemo(() => indexTags(c.tags), [c.tags]);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const { markDownloaded } = c;
  const onSaved = useCallback((entry) => markDownloaded(entry.code), [markDownloaded]);
  const dl = useDownloader({ onSaved });

  const [filter, setFilter] = useState([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [menuPost, setMenuPost] = useState(null);
  const [sheet, setSheet] = useState(null); // { mode: 'new' | 'edit', postId, fromShare }
  const [sheetTags, setSheetTags] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [update, setUpdate] = useState(null);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [triageOpen, setTriageOpen] = useState(false);
  const [rediscoverRound, setRediscoverRound] = useState(0);
  const [rediscoverHidden, setRediscoverHidden] = useState(false);
  const afterSheet = useRef(null); // e.g. triage moving to the next post
  const pendingDownloads = useRef(new Map()); // postId → { fromShare }
  const downloadAfterLogin = useRef(false);
  const hideToast = useCallback(() => setToast(null), []);

  const visible = useMemo(() => filterPosts(c.posts, filter, appliedQuery, index), [c.posts, filter, appliedQuery, index]);
  const detail = detailId && c.posts.find((p) => p.id === c.resolveId(detailId));
  const sheetPost = sheet && c.posts.find((p) => p.id === c.resolveId(sheet.postId));
  const suggestions = useMemo(
    () => (sheetPost?.status === 'ready' ? suggestTags(sheetPost, c.posts, index) : []),
    [sheetPost, c.posts, index],
  );
  const untagged = c.posts.filter((p) => !p.tagIds.length && p.status === 'ready').length;
  const rediscover = useMemo(() => {
    if (rediscoverHidden || filter.length || appliedQuery.trim()) return null;
    const now = Date.now();
    if (rediscoverRound === 0) return pickRediscover(c.posts, now);
    const posts = randomPicks(c.posts, now, 3, rediscoverRound);
    return posts.length ? { title: '隨機翻翻', subtitle: '換一批舊收藏看看', posts } : null;
  }, [c.posts, filter, appliedQuery, rediscoverRound, rediscoverHidden]);
  const { buildNumber, releasesRepo } = Constants.expoConfig?.extra ?? {};
  const version = `${Constants.expoConfig?.version ?? ''} (build ${buildNumber ?? '-'})`;

  useEffect(() => {
    const timer = setTimeout(() => setAppliedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (releasesRepo && buildNumber) checkForUpdate(releasesRepo, buildNumber).then(setUpdate);
  }, [releasesRepo, buildNumber]);

  // Saves a link as a card and opens the save sheet (or the edit sheet if it's
  // already saved). Returns 'added' | 'exists' | 'invalid'.
  const collect = async (text, { fromShare = false } = {}) => {
    const res = await c.addFromUrl(text);
    if (res.status === 'invalid') {
      setToast({ message: '這不是 Threads 貼文連結' });
      return 'invalid';
    }
    const existing = res.status === 'exists' && c.posts.find((p) => p.id === res.id);
    setSheetTags(existing ? existing.tagIds : []);
    setSheet({ mode: existing ? 'edit' : 'new', postId: res.id, fromShare });
    if (existing) setToast({ message: '這篇已經收藏過，可以直接改標籤' });
    return res.status;
  };

  // "Share → Threads 下載" from the Threads app. Waits until the collection has loaded.
  useEffect(() => {
    if (!hasShareIntent || !c.ready) return;
    const text = shareIntent.webUrl || shareIntent.text || '';
    resetShareIntent();
    collect(text, { fromShare: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent, c.ready]);

  // Downloads start once the card's details are in (share links only resolve then).
  const requestDownload = (id, fromShare = false) => {
    const post = c.posts.find((p) => p.id === c.resolveId(id));
    if (post?.status === 'ready' && post.code) dl.start(post.url, { fromShare });
    else pendingDownloads.current.set(c.resolveId(id), { fromShare });
  };

  useEffect(() => {
    for (const [id, opts] of [...pendingDownloads.current]) {
      const post = c.posts.find((p) => p.id === c.resolveId(id));
      if (post?.status === 'ready' && post.code) {
        pendingDownloads.current.delete(id);
        dl.start(post.url, opts);
      } else if (!post || post.status === 'failed') {
        pendingDownloads.current.delete(id);
        setToast({ message: '貼文讀取失敗，無法下載' });
      }
    }
  }, [c.posts, c, dl]);

  // After a share-started download finishes (and nothing else is queued), go back to Threads.
  useEffect(() => {
    const s = dl.state;
    if (s.phase !== 'done') return;
    const message = `已存到相簿：${summary(s)}`;
    if (s.fromShare) {
      systemToast(message);
      if (dl.queued === 0) leaveToThreads();
    } else {
      setToast({ message });
    }
    // Only react to a new result, not to the queue shrinking as the next item starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dl.state]);

  useEffect(() => {
    if (!notice) return;
    if (notice.kind === 'duplicate') setToast({ message: '這篇之前收藏過了，標籤已合併到原本的卡片' });
    else if (notice.kind === 'login') setLoginOpen(true);
    else if (notice.kind === 'failed') setToast({ message: '有一篇貼文讀取失敗，可以在卡片上重試' });
  }, [notice]);

  // Applies the picked tags. Closing the sheet keeps them too, so nothing is lost.
  const finishSheet = async ({ closed = false } = {}) => {
    if (!sheet) return;
    const { postId, mode, fromShare } = sheet;
    const id = c.resolveId(postId);
    setSheet(null);
    await c.setPostTags(id, sheetTags);
    const willDownload = !closed && mode === 'new' && c.downloadToo;
    if (willDownload) requestDownload(id, fromShare);
    const names = sheetTags.map((tid) => index.byId[tid]).filter(Boolean).map((tg) => tagLabel(tg, index.byId));
    const message =
      mode === 'edit'
        ? '標籤已更新'
        : (names.length ? `已收藏到 ${names.join('、')}` : '已收藏到「未分類」') + (willDownload ? '，下載中' : '');
    if (!closed) buzz('success');
    if (afterSheet.current) {
      afterSheet.current();
      afterSheet.current = null;
    }
    if (fromShare) {
      systemToast(message);
      if (!willDownload) leaveToThreads();
    } else {
      setToast({ message });
    }
  };

  const onAction = (kind, post) => {
    setMenuPost(null);
    switch (kind) {
      case 'feature':
        c.toggleFeatured(post.id);
        setToast({ message: post.featured ? '已取消精選' : '已設為精選，會放大成整排' });
        break;
      case 'tags':
        setSheetTags(post.tagIds);
        setSheet({ mode: 'edit', postId: post.id, fromShare: false });
        break;
      case 'download':
        requestDownload(post.id);
        break;
      case 'open':
        Linking.openURL(post.url).catch(() => setToast({ message: '無法開啟 Threads' }));
        break;
      case 'more':
        setMenuPost(post);
        break;
      case 'delete':
        c.remove(post.id);
        setDetailId(null);
        setToast({ message: '已刪除收藏', undo: true });
        break;
      default:
    }
  };

  const add = async () => {
    let clip = '';
    try {
      clip = await Clipboard.getStringAsync();
    } catch {
      // No clipboard access; fall back to typing the link.
    }
    if (parseThreadsUrl(clip)) collect(clip);
    else setAddOpen(true);
  };

  const onLoggedIn = () => {
    setLoginOpen(false);
    c.retryLoginFailures();
    if (downloadAfterLogin.current) {
      downloadAfterLogin.current = false;
      dl.retry();
    }
  };

  const checkNow = async () => {
    if (!releasesRepo) return;
    setUpdateStatus('檢查中…');
    const found = await checkForUpdate(releasesRepo, buildNumber || 0);
    setUpdate(found);
    setUpdateStatus(found ? `${found.name} 可以下載` : '已是最新版本');
  };

  const pullRefresh = async () => {
    setRefreshing(true);
    c.posts.filter((p) => p.status === 'failed').forEach((p) => c.retry(p.id));
    setTimeout(() => setRefreshing(false), 600);
  };

  // Android back closes the topmost layer first; the wall stays mounted underneath
  // so its scroll position and filters survive.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheet) return finishSheet({ closed: true }), true;
      if (addOpen) return setAddOpen(false), true;
      if (settingsOpen) return setSettingsOpen(false), true;
      if (menuPost) return setMenuPost(null), true;
      if (detailId) return setDetailId(null), true;
      return false;
    });
    return () => sub.remove();
  });

  const exportNow = async () => {
    setSettingsOpen(false);
    try {
      await shareBackup(c.exportBackup());
      setToast({ message: `已匯出 ${c.posts.length} 篇收藏` });
    } catch {
      setToast({ message: '匯出失敗，請再試一次' });
    }
  };

  const importNow = async () => {
    setSettingsOpen(false);
    try {
      const text = await pickBackup();
      if (!text) return;
      const { added, skipped } = await c.importBackup(text);
      setToast({ message: `匯入 ${added} 篇${skipped ? `，${skipped} 篇已經有了` : ''}` });
    } catch (e) {
      setToast({ message: e.message || '匯入失敗' });
    }
  };

  const tagCount = c.tags.length;
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
        onRetry={(p) => c.retry(p.id)}
        onAdd={add}
        onSettings={() => setSettingsOpen(true)}
        onRefresh={pullRefresh}
        refreshing={refreshing}
        banner={
          <View style={styles.banners}>
            <UpdateBanner
              release={update}
              onDownload={() => Linking.openURL(update.apkUrl)}
              onDismiss={() => setUpdate(null)}
            />
            <RediscoverCard
              pick={rediscover}
              onOpen={(p) => setDetailId(p.id)}
              onShuffle={() => setRediscoverRound((r) => r + 1)}
              onDismiss={() => setRediscoverHidden(true)}
            />
            {untagged > 0 && !filter.length && (
              <View style={styles.triageEntry}>
                <SecondaryButton
                  title={`整理未分類（${untagged} 篇）`}
                  iconName="albums-outline"
                  onPress={() => setTriageOpen(true)}
                />
              </View>
            )}
          </View>
        }
        overlay={
          <DownloadPill
            state={dl.state}
            queued={dl.queued}
            onAction={(kind) => {
              if (kind === 'login') {
                downloadAfterLogin.current = true;
                setLoginOpen(true);
              } else dl.retry();
            }}
            onSkip={dl.skip}
          />
        }
      />
      {detail && (
        <View style={StyleSheet.absoluteFill}>
          <PostDetail
            post={detail}
            index={index}
            onBack={() => setDetailId(null)}
            onAction={onAction}
            onStale={(p) => c.refresh(p.id)}
          />
        </View>
      )}

      {/* Hidden WebViews that read posts with the user's Threads session. */}
      {c.fetcherView}
      {dl.webViewProps && (
        <WebView key={dl.webViewKey} {...dl.webViewProps} sharedCookiesEnabled style={styles.hiddenWeb} />
      )}

      <CardMenu post={menuPost} onClose={() => setMenuPost(null)} onAction={onAction} />
      <SaveSheet
        visible={!!sheet}
        mode={sheet?.mode}
        post={sheetPost}
        loading={sheetPost?.status === 'loading'}
        index={index}
        selected={sheetTags}
        onToggle={(id) => setSheetTags((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))}
        onCreateTag={c.createTag}
        recentIds={c.recent}
        suggestions={suggestions}
        downloadToo={c.downloadToo}
        onDownloadToo={c.setDownloadToo}
        onDone={() => finishSheet()}
        onClose={() => finishSheet({ closed: true })}
      />
      <AddLinkSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={async (text) => {
          if (!parseThreadsUrl(text)) return 'invalid';
          setAddOpen(false);
          return collect(text);
        }}
      />
      <DownloadPickerSheet
        key={dl.state.phase === 'choosing' ? dl.state.post.code : 'none'}
        post={dl.state.phase === 'choosing' ? dl.state.post : null}
        onConfirm={dl.choose}
        onCancel={dl.cancelChoice}
      />
      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogin={() => {
          setSettingsOpen(false);
          setLoginOpen(true);
        }}
        onTags={() => {
          setSettingsOpen(false);
          setTagsOpen(true);
        }}
        onExport={exportNow}
        onImport={importNow}
        onCheckUpdate={checkNow}
        updateStatus={updateStatus}
        version={version}
        stats={`${c.posts.length} 篇 · ${tagCount} 個標籤`}
      />
      {tagsOpen && (
        <TagManager
          posts={c.posts}
          index={index}
          onClose={() => setTagsOpen(false)}
          onRename={c.renameTag}
          onRecolor={c.recolorTag}
          onMerge={c.mergeTag}
          onDelete={c.deleteTag}
        />
      )}
      {triageOpen && (
        <Triage
          posts={c.posts}
          index={index}
          onClose={() => setTriageOpen(false)}
          onTag={(id, tagIds) => c.setPostTags(id, tagIds)}
          onMoreTags={(post, advance) => {
            afterSheet.current = advance;
            setSheetTags(post.tagIds);
            setSheet({ mode: 'edit', postId: post.id, fromShare: false });
          }}
        />
      )}
      <LoginSheet visible={loginOpen} onClose={() => setLoginOpen(false)} onLoggedIn={onLoggedIn} />
      <Toast toast={toast} onUndo={() => { c.undoRemove(); setToast(null); }} onHide={hideToast} />
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hiddenWeb: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  banners: { gap: 12 },
  triageEntry: { flexDirection: 'row' },
});
