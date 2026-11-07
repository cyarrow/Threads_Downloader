import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Linking, Platform, StyleSheet, ToastAndroid, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { SafeAreaInsetsContext, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useDownloader } from './src/useDownloader';
import { useShareIntent } from './src/shareIntent';
import { summary } from './src/historyModel';
import { parseThreadsUrl } from './src/threads';
import { checkForUpdate } from './src/updates';
import { CollectionProvider, useCollection } from './src/collection/store';
import { mergeTags } from './src/collection/collectionModel';
import { useBrandFont } from './src/collection/fonts';
import { UNCATEGORIZED, filterPosts, indexTags, tagLabel, tagSummaries, untaggedCount } from './src/collection/tagModel';
import { backTarget, visitTab } from './src/collection/navModel';
import { useCollectionTheme } from './src/collection/tokens';
import { pickBackup, shareBackup } from './src/collection/backupIO';
import { pickRediscover } from './src/collection/rediscover';
import { suggestTags } from './src/collection/suggest';
import { withRuleTags } from './src/collection/tagRules';
import { NoteSheet } from './src/collection/ui/Notes';
import { RuleEditSheet, RulesPage, ruleResultToast } from './src/collection/ui/TagRules';
import { RediscoverCard, TagManager } from './src/collection/ui/Phase2';
import { SecondaryButton } from './src/collection/ui/base';
import { buzz } from './src/collection/ui/base';
import { CardWall } from './src/collection/ui/CardWall';
import { DeckScreen } from './src/collection/ui/DeckScreen';
import { StreamScreen } from './src/collection/ui/StreamScreen';
import { TAB_BAR_HEIGHT, TabBar } from './src/collection/ui/TabBar';
import { TagBrowser, TagPageBar } from './src/collection/ui/TagBrowser';
import { FetchHealth } from './src/collection/ui/FetchHealth';
import { CardMenu, Toast } from './src/collection/ui/Overlays';
import { PostDetail } from './src/collection/ui/PostDetail';
import { SaveSheet } from './src/collection/ui/SaveSheet';
import { BackupNote } from './src/collection/ui/BackupNote';
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
  const [sheet, setSheet] = useState(null); // { mode: 'new' | 'edit', postId, fromShare, quick }
  const [sheetTags, setSheetTags] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [update, setUpdate] = useState(null);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [rediscoverHidden, setRediscoverHidden] = useState(false);
  // Tabs: 翻翻 | 收藏 | 串流. A tab mounts on first visit and then stays mounted
  // (hidden) so its scroll position, filter and deck survive switching.
  const [tab, setTab] = useState('home');
  const [visited, setVisited] = useState(['home']);
  const [searching, setSearching] = useState(false);
  const [browsing, setBrowsing] = useState(false); // 所有標籤 on the 收藏 tab
  const [tagPage, setTagPage] = useState(null); // a 大標籤's page inside 所有標籤
  const [tagChild, setTagChild] = useState(null); // 小標籤 chip on that page
  const [deckFilter, setDeckFilter] = useState(null);
  const [streamFilter, setStreamFilter] = useState(null);
  const insets = useSafeAreaInsets();
  const afterSheet = useRef(null); // the deck moving past a card once its tags are set
  const pendingDownloads = useRef(new Map()); // postId → { fromShare }
  const downloadAfterLogin = useRef(false);
  const hideToast = useCallback(() => setToast(null), []);

  // --- 自動標籤規則 + 個人筆記 (ui/TagRules.js, ui/Notes.js) ---
  const [sheetNote, setSheetNote] = useState(''); // 「加一句筆記…」 in the save sheet
  const touchedTags = useRef(new Set()); // tags toggled by hand in the open save sheet
  const [rulesOpen, setRulesOpen] = useState(false); // 設定 › 自動標籤規則
  const [ruleDraft, setRuleDraft] = useState(null); // 「為 @author 建立規則」 from a post
  const [noteFor, setNoteFor] = useState(null); // post whose note sheet is open

  const visible = useMemo(() => filterPosts(c.posts, filter, appliedQuery, index), [c.posts, filter, appliedQuery, index]);
  const detail = detailId && c.posts.find((p) => p.id === c.resolveId(detailId));
  const sheetPost = sheet && c.posts.find((p) => p.id === c.resolveId(sheet.postId));
  const suggestions = useMemo(
    () => (sheetPost?.status === 'ready' ? suggestTags(sheetPost, c.posts, index) : []),
    [sheetPost, c.posts, index],
  );
  // Rules run when a newly saved post finishes loading (store.js). If its save
  // sheet is still open, the tags they added show there as picked, with the
  // reason, unless the user already toggled that tag by hand. The row is drawn
  // from the start (when the user has rules) so nothing moves when they arrive.
  const sheetHits = sheet?.mode === 'new' && sheetPost ? c.ruleHits[sheetPost.id] : undefined;
  useEffect(() => {
    if (sheetHits) setSheetTags((list) => withRuleTags(list, sheetHits, touchedTags.current));
  }, [sheetHits]);
  const ruleSlot =
    sheet?.mode === 'new' && c.rules.length
      ? { status: sheetPost?.status === 'loading' ? 'loading' : sheetPost?.status === 'failed' ? 'failed' : 'ready', hits: sheetHits || [] }
      : null;
  const untagged = untaggedCount(c.posts);
  // 「N 年前的今天」/「好久沒看」 stay on the wall; its 隨機翻翻 now opens the 翻翻 tab.
  const rediscover = useMemo(() => {
    if (rediscoverHidden || filter.length || appliedQuery.trim()) return null;
    return pickRediscover(c.posts, Date.now());
  }, [c.posts, filter, appliedQuery, rediscoverHidden]);
  const pageTag = browsing && tagPage ? index.byId[tagPage] : null;
  const pagePosts = useMemo(
    () => (pageTag ? filterPosts(c.posts, [tagChild || pageTag.id], appliedQuery, index) : []),
    [pageTag, tagChild, c.posts, appliedQuery, index],
  );
  const summaries = useMemo(() => (browsing ? tagSummaries(c.posts, index) : []), [browsing, c.posts, index]);

  const goTab = useCallback((next) => {
    setTab(next);
    setVisited((v) => visitTab(v, next));
  }, []);
  // 整理未分類 (wall banner, 所有標籤): the 翻翻 deck in its sorting mode.
  const startTriage = () => {
    setDeckFilter(UNCATEGORIZED);
    goTab('deck');
  };
  // 搜尋 on 翻翻 / 串流 searches the whole collection on the 收藏 wall.
  const searchFromTab = () => {
    setBrowsing(false);
    setTagPage(null);
    setSearching(true);
    goTab('home');
  };
  const setSearchOpen = (on) => {
    if (!on) setQuery('');
    setSearching(on);
  };
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
    // This sheet replaces any open one (e.g. a share arriving while the deck's
    // tag sheet is up): the deck must not treat this post's tags as its card's.
    afterSheet.current = null;
    setSheetTags(existing ? existing.tagIds : []);
    setSheetNote('');
    touchedTags.current = new Set();
    // Shares open the compact 快速面板 unless the user turned it off in settings.
    setSheet({ mode: existing ? 'edit' : 'new', postId: res.id, fromShare, quick: fromShare && !existing && c.quickSave });
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
  // `tags`: a quick-panel tap passes its one tag instead of the picker's selection.
  const finishSheet = async ({ closed = false, tags = sheetTags } = {}) => {
    if (!sheet) return;
    const { postId, mode, fromShare, quiet } = sheet;
    const id = c.resolveId(postId);
    setSheet(null);
    // A shared link that turned out to be an already-saved card: add to its tags, don't replace them.
    const prior = mode === 'new' && id !== postId ? c.posts.find((p) => p.id === id)?.tagIds || [] : [];
    await c.setPostTags(id, mergeTags(prior, tags));
    if (mode === 'new' && sheetNote.trim()) await c.setNote(id, sheetNote, { merge: true });
    const willDownload = !closed && mode === 'new' && c.downloadToo;
    if (willDownload) requestDownload(id, fromShare);
    const names = tags.map((tid) => index.byId[tid]).filter(Boolean).map((tg) => tagLabel(tg, index.byId));
    const message =
      mode === 'edit'
        ? '標籤已更新'
        : (names.length ? `已收藏到 ${names.join('、')}` : '已收藏到「未分類」') + (willDownload ? '，下載中' : '');
    if (!closed) buzz('success');
    if (afterSheet.current) {
      afterSheet.current(tags);
      afterSheet.current = null;
    }
    if (fromShare) {
      systemToast(message);
      if (!willDownload) leaveToThreads();
    } else if (!quiet) {
      // The deck reports its own result in its status line, where the toast
      // would cover its buttons.
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
      case 'note':
        setNoteFor(post.id);
        break;
      case 'rule':
        setRuleDraft({ kind: 'author', value: post.author, tagId: post.tagIds[0] || null });
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
      const target = backTarget({
        sheet: !!sheet,
        addOpen,
        settingsOpen,
        menuOpen: !!menuPost,
        detailOpen: !!detailId,
        tab,
        tagPage: !!pageTag,
        browsing,
      });
      if (target === 'sheet') finishSheet({ closed: true });
      else if (target === 'add') setAddOpen(false);
      else if (target === 'settings') setSettingsOpen(false);
      else if (target === 'menu') setMenuPost(null);
      else if (target === 'detail') setDetailId(null);
      else if (target === 'home') goTab('home');
      else if (target === 'tagPage') setTagPage(null);
      else if (target === 'browser') setBrowsing(false);
      return target !== null;
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
  const headerActions = { onAdd: add, onSearch: searchFromTab, searching: false, onSettings: () => setSettingsOpen(true) };
  const openPost = (p) => setDetailId(p.id);
  const openMenu = (p) => {
    buzz('light');
    setMenuPost(p);
  };
  // Screens above the tab bar get no bottom inset (the bar takes it), so lists
  // and the download pill end above the bar; the toast is lifted over it unless
  // the detail page (which covers the bar) is open.
  const contentInsets = { ...insets, bottom: 0 };
  const toastInsets = { ...insets, bottom: insets.bottom + (detail ? 0 : TAB_BAR_HEIGHT) };
  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <SafeAreaInsetsContext.Provider value={contentInsets}>
        <View style={styles.content}>
          <Pane hidden={tab !== 'home'}>
            <Pane hidden={browsing}>
              <CardWall
                posts={visible}
                total={c.posts.length}
                index={index}
                filter={filter}
                onFilter={setFilter}
                query={query}
                onQuery={setQuery}
                searching={searching}
                onSearching={setSearchOpen}
                onOpen={openPost}
                onMenu={openMenu}
                onRetry={(p) => c.retry(p.id)}
                onAdd={add}
                onSettings={() => setSettingsOpen(true)}
                onAllTags={() => setBrowsing(true)}
                onRefresh={pullRefresh}
                refreshing={refreshing}
                banner={
                  <View style={styles.banners}>
                    <FetchHealth posts={c.posts} onRetryAll={c.retryAllFailed} onLogin={() => setLoginOpen(true)} />
                    <BackupNote onSetup={() => setSettingsOpen(true)} />
                    <UpdateBanner
                      release={update}
                      onDownload={() => Linking.openURL(update.apkUrl)}
                      onDismiss={() => setUpdate(null)}
                    />
                    <RediscoverCard
                      pick={rediscover}
                      onOpen={openPost}
                      onShuffle={() => {
                        setDeckFilter(null);
                        goTab('deck');
                      }}
                      onDismiss={() => setRediscoverHidden(true)}
                    />
                    {untagged > 0 && !filter.length && (
                      <View style={styles.triageEntry}>
                        <SecondaryButton title={`整理未分類（${untagged} 篇）`} iconName="albums-outline" onPress={startTriage} />
                      </View>
                    )}
                  </View>
                }
              />
            </Pane>
            {browsing &&
              (pageTag ? (
                <CardWall
                  key={pageTag.id}
                  posts={pagePosts}
                  index={index}
                  title={pageTag.name}
                  kicker={null}
                  onBack={() => setTagPage(null)}
                  filter={[pageTag.id]}
                  onFilter={(ids) => !ids.length && setTagChild(null)}
                  query={query}
                  onQuery={setQuery}
                  searching={searching}
                  onSearching={setSearchOpen}
                  onOpen={openPost}
                  onMenu={openMenu}
                  onRetry={(p) => c.retry(p.id)}
                  onAdd={add}
                  onSettings={() => setSettingsOpen(true)}
                  filterBar={
                    <TagPageBar
                      tag={pageTag}
                      kids={index.children[pageTag.id] || []}
                      count={pagePosts.length}
                      child={tagChild}
                      onChild={setTagChild}
                      onStream={() => {
                        setStreamFilter(pageTag.id);
                        goTab('stream');
                      }}
                    />
                  }
                />
              ) : (
                <TagBrowser
                  summaries={summaries}
                  untagged={untagged}
                  onBack={() => setBrowsing(false)}
                  onOpenTag={(id) => {
                    setTagChild(null);
                    setTagPage(id);
                  }}
                  onTriage={startTriage}
                  onEdit={() => setTagsOpen(true)}
                />
              ))}
          </Pane>
          {visited.includes('deck') && (
            <Pane hidden={tab !== 'deck'}>
              <DeckScreen
                posts={c.posts}
                index={index}
                filter={deckFilter}
                onFilter={setDeckFilter}
                onOpen={openPost}
                onPick={(post, done) => {
                  afterSheet.current = done;
                  setSheetTags(post.tagIds);
                  setSheet({ mode: 'edit', postId: post.id, fromShare: false, quiet: true });
                }}
                onFeature={c.setFeatured}
                onSetTags={c.setPostTags}
                actions={headerActions}
              />
            </Pane>
          )}
          {visited.includes('stream') && (
            <Pane hidden={tab !== 'stream'}>
              <StreamScreen
                posts={c.posts}
                index={index}
                filter={streamFilter}
                onFilter={setStreamFilter}
                active={tab === 'stream' && !detail}
                actions={headerActions}
                onAction={onAction}
                onStale={(p) => c.refresh(p.id)}
              />
            </Pane>
          )}
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
        </View>
      </SafeAreaInsetsContext.Provider>
      <TabBar tab={tab} onChange={goTab} />
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
        // react-native-webview wraps the page in a container with flex: 1; hide that
        // container too, or it takes half the screen while a download is read.
        <WebView key={dl.webViewKey} {...dl.webViewProps} sharedCookiesEnabled style={styles.hiddenWeb} containerStyle={styles.hiddenWeb} />
      )}

      <CardMenu post={menuPost} onClose={() => setMenuPost(null)} onAction={onAction} />
      <SaveSheet
        visible={!!sheet}
        mode={sheet?.mode}
        quick={sheet?.quick}
        post={sheetPost}
        loading={sheetPost?.status === 'loading'}
        index={index}
        selected={sheetTags}
        onToggle={(id) => {
          touchedTags.current.add(id);
          setSheetTags((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
        }}
        onCreateTag={c.createTag}
        recentIds={c.recent}
        suggestions={suggestions}
        downloadToo={c.downloadToo}
        onDownloadToo={c.setDownloadToo}
        onDone={() => finishSheet()}
        onClose={() => finishSheet({ closed: true })}
        onQuickPick={(id) => finishSheet({ tags: mergeTags([id], sheetTags) })}
        onExpand={() => setSheet((s) => s && { ...s, quick: false })}
        ruleSlot={ruleSlot}
        note={sheetNote}
        onNote={setSheetNote}
      />
      {rulesOpen && <RulesPage index={index} onClose={() => setRulesOpen(false)} />}
      {ruleDraft && (
        <RuleEditSheet
          draft={ruleDraft}
          index={index}
          onDone={(result) => {
            setRuleDraft(null);
            const next = ruleResultToast(result, index, c.unapplyRule);
            if (next) setToast(next);
          }}
        />
      )}
      {noteFor && (
        <NoteSheet
          key={noteFor}
          note={c.posts.find((p) => p.id === noteFor)?.note}
          onDone={(text) => {
            const p = c.posts.find((x) => x.id === noteFor);
            setNoteFor(null);
            if (!p || text === (p.note || '')) return;
            c.setNote(p.id, text);
            setToast({ message: text ? '筆記已儲存' : '已清除筆記' });
          }}
        />
      )}
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
        onRules={() => {
          setSettingsOpen(false);
          setRulesOpen(true);
        }}
        rulesCount={c.rules.length}
        onExport={exportNow}
        onImport={importNow}
        onCheckUpdate={checkNow}
        updateStatus={updateStatus}
        version={version}
        stats={`${c.posts.length} 篇 · ${tagCount} 個標籤`}
        quickSave={c.quickSave}
        onQuickSave={c.setQuickSave}
      />
      {tagsOpen && (
        <TagManager
          posts={c.posts}
          index={index}
          rules={c.rules}
          onClose={() => setTagsOpen(false)}
          onRename={c.renameTag}
          onRecolor={c.recolorTag}
          onMerge={c.mergeTag}
          onDelete={c.deleteTag}
        />
      )}
      <LoginSheet visible={loginOpen} onClose={() => setLoginOpen(false)} onLoggedIn={onLoggedIn} />
      <SafeAreaInsetsContext.Provider value={toastInsets}>
        <Toast toast={toast} onUndo={() => { if (toast?.onUndo) toast.onUndo(); else c.undoRemove(); setToast(null); }} onHide={hideToast} />
      </SafeAreaInsetsContext.Provider>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

// A tab (or a page inside one) kept mounted while hidden, so its scroll
// position and state survive. Web drops it from layout; native moves it off
// screen instead (display: none can make native lists lose their scroll
// offset). Hidden panes are removed from the accessibility tree either way.
function Pane({ hidden, children }) {
  return (
    <View
      style={hidden ? styles.hidden : styles.fill}
      pointerEvents={hidden ? 'none' : 'auto'}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={hidden}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  fill: { flex: 1 },
  hidden: Platform.select({
    web: { display: 'none' },
    default: { position: 'absolute', top: 100000, left: 0, width: '100%', height: '100%', opacity: 0 },
  }),
  hiddenWeb: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  banners: { gap: 12 },
  triageEntry: { flexDirection: 'row' },
});
