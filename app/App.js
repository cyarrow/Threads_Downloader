import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaInsetsContext, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useShareIntent } from './src/shareIntent';
import { parseThreadsUrl } from './src/threads';
import { useAppUpdate } from './src/useAppUpdate';
import { useDownloads } from './src/useDownloads';
import { CollectionProvider, useCollection } from './src/collection/store';
import { useBrandFont } from './src/collection/fonts';
import { UNCATEGORIZED, indexTags } from './src/collection/tagModel';
import { onHardwareBack } from './src/collection/hardwareBack';
import { backTarget, closeAuthor, openAuthor as openAuthorPage, visitTab, wallKey } from './src/collection/navModel';
import { useSaveSheet } from './src/collection/useSaveSheet';
import { useWallSelection } from './src/collection/useWallSelection';
import { useWallState } from './src/collection/useWallState';
import { useLatestCallback } from './src/collection/useLatestCallback';
import { useCollectionTheme } from './src/collection/tokens';
import { pickBackup, shareBackup } from './src/collection/backupIO';
import { speedLabel } from './src/collection/fetchSpeed';
import { NoteSheet } from './src/collection/ui/Notes';
import { RuleEditSheet, RulesPage, ruleResultToast } from './src/collection/ui/TagRules';
import { TagManager } from './src/collection/ui/Phase2';
import { buzz } from './src/collection/ui/base';
import { CollectionTab } from './src/collection/ui/CollectionTab';
import { DeckScreen } from './src/collection/ui/DeckScreen';
import { StreamScreen } from './src/collection/ui/StreamScreen';
import { Pane } from './src/collection/ui/Pane';
import { TAB_BAR_HEIGHT, TabBar } from './src/collection/ui/TabBar';
import { CardMenu, Toast } from './src/collection/ui/Overlays';
import { BatchTagSheet, ConfirmDeleteSheet, SELECTION_BAR_HEIGHT } from './src/collection/ui/Selection';
import { PostDetail } from './src/collection/ui/PostDetail';
import { SaveSheet } from './src/collection/ui/SaveSheet';
import { AddLinkSheet, DownloadPickerSheet, DownloadPill, LoginSheet, SettingsSheet } from './src/collection/ui/AppSheets';

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  // The store reports notices from its async work; Home (inside the provider)
  // registers the handler that shows them, so they arrive as events, not state.
  const noticeHandler = useRef(null);
  const onNotice = useCallback((n) => noticeHandler.current?.(n), []);
  const listenNotices = useCallback((fn) => {
    noticeHandler.current = fn;
    return () => {
      if (noticeHandler.current === fn) noticeHandler.current = null;
    };
  }, []);
  useBrandFont();
  return (
    <CollectionProvider onNotice={onNotice}>
      <Home listenNotices={listenNotices} />
    </CollectionProvider>
  );
}

// The app shell: the three tabs (翻翻 | 收藏 | 串流) above the tab bar, and what is
// shared between them — post detail, the card menu, the save sheet, 設定 and its
// pages, downloads, toasts and the Android back button. The 收藏 tab's own state
// lives in useWallState and its screen in ui/CollectionTab.js.
function Home({ listenNotices }) {
  const t = useCollectionTheme();
  const c = useCollection();
  const index = useMemo(() => indexTags(c.tags), [c.tags]);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const insets = useSafeAreaInsets();

  const [toast, setToast] = useState(null);
  const hideToast = useCallback(() => setToast(null), []);
  const [detailId, setDetailId] = useState(null);
  const [menuPost, setMenuPost] = useState(null);
  const [menuSelectable, setMenuSelectable] = useState(false); // card menu opened from a wall
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false); // 設定 › 自動標籤規則
  const [ruleDraft, setRuleDraft] = useState(null); // 「為 @author 建立規則」 from a post
  const [noteFor, setNoteFor] = useState(null); // post whose note sheet is open
  // Tabs: 翻翻 | 收藏 | 串流. A tab mounts on first visit and then stays mounted
  // (hidden) so its scroll position, filter and deck survive switching.
  const [tab, setTab] = useState('home');
  const [visited, setVisited] = useState(['home']);
  const [deckFilter, setDeckFilter] = useState(null);
  const [streamFilter, setStreamFilter] = useState(null);
  const [streamAuthor, setStreamAuthor] = useState(null); // 串流 narrowed to one author

  const update = useAppUpdate();
  const downloads = useDownloads({ c, notify: setToast, onLogin: () => setLoginOpen(true) });
  const { dl, request: requestDownload } = downloads;
  const save = useSaveSheet({ c, index, notify: setToast, requestDownload });
  const w = useWallState({ c, index });
  const { authorPage, pageTag, browsing } = w;
  const detail = detailId && c.posts.find((p) => p.id === c.resolveId(detailId));

  // 批次選取 lives on one wall; opening another page or leaving the tab ends it.
  const currentWall = wallKey({ tab, authorPage: authorPage?.handle, tagPage: pageTag?.id, browsing });
  const sel = useWallSelection({
    currentWall,
    wallPosts: currentWall === 'home' ? w.visible : currentWall?.startsWith('tag:') ? w.pagePosts : w.authorPosts,
    c,
    download: (id) => requestDownload(id),
    notify: setToast,
  });

  const goTab = useCallback((next) => {
    setTab(next);
    setVisited((v) => visitTab(v, next));
  }, []);
  // 整理未分類 (wall banner, 所有標籤): the 翻翻 deck in its sorting mode.
  const startTriage = useCallback(() => {
    setDeckFilter(UNCATEGORIZED);
    goTab('deck');
  }, [goTab]);
  const { searchAll } = w;
  const searchFromTab = useCallback(() => {
    searchAll();
    goTab('home');
  }, [searchAll, goTab]);

  // Saves a link as a card and opens its sheet. Resolves to 'added' | 'exists' |
  // 'invalid'. State is only set once the store has answered, so the
  // share-intent effect below can call it.
  const collect = (text, { fromShare = false } = {}) => c.addFromUrl(text).then((res) => save.openCollected(res, fromShare));

  // "Share → Threads 下載" from the Threads app. Waits until the collection has loaded.
  const takeShare = useEffectEvent(() => {
    const text = shareIntent.webUrl || shareIntent.text || '';
    resetShareIntent();
    collect(text, { fromShare: true });
  });
  useEffect(() => {
    if (hasShareIntent && c.ready) takeShare();
  }, [hasShareIntent, c.ready]);

  useEffect(
    () =>
      listenNotices((notice) => {
        if (notice.kind === 'duplicate') setToast({ message: '這篇之前收藏過了，標籤已合併到原本的卡片' });
        else if (notice.kind === 'login') setLoginOpen(true);
        else if (notice.kind === 'failed') setToast({ message: '有一篇貼文讀取失敗，可以在卡片上重試' });
        else if (notice.kind === 'saveFailed') setToast({ message: '剛才的變更沒有存進資料庫，畫面已還原成儲存的內容' });
      }),
    [listenNotices],
  );

  // Stable (useLatestCallback): passed to every 串流 post, which are memoised.
  const onAction = useLatestCallback((kind, post) => {
    setMenuPost(null);
    switch (kind) {
      case 'feature':
        c.toggleFeatured(post.id);
        setToast({ message: post.featured ? '已取消精選' : '已設為精選，會放大成整排' });
        break;
      case 'tags':
        save.editTags(post);
        break;
      case 'download':
        requestDownload(post.id);
        break;
      case 'open': {
        // Only ever a Threads link (a card's url could come from an imported file).
        const link = parseThreadsUrl(post.url);
        if (link) Linking.openURL(link.url).catch(() => setToast({ message: '無法開啟 Threads' }));
        else setToast({ message: '這張卡片沒有 Threads 連結' });
        break;
      }
      case 'more':
        setMenuSelectable(false);
        setMenuPost(post);
        break;
      case 'select':
        sel.start(currentWall, post.id);
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
  });

  const add = useLatestCallback(async () => {
    let clip = '';
    try {
      clip = await Clipboard.getStringAsync();
    } catch {
      // No clipboard access; fall back to typing the link.
    }
    if (parseThreadsUrl(clip)) collect(clip);
    else setAddOpen(true);
  });

  const onLoggedIn = () => {
    setLoginOpen(false);
    c.retryLoginFailures();
    downloads.resumeAfterLogin();
  };

  // --- 作者頁: tapping an @handle (post detail, 串流, 翻翻) opens it in 收藏;
  // back returns to the tab and post detail it was opened from.
  const openAuthor = useLatestCallback((handle) => {
    if (!handle) return;
    const next = openAuthorPage(authorPage, handle, { tab, detailId });
    setDetailId(null);
    setMenuPost(null);
    w.setAuthorPage(next);
    goTab('home');
  });
  const leaveAuthor = () => {
    const back = closeAuthor(authorPage, (id) => c.posts.some((p) => p.id === c.resolveId(id)));
    w.setAuthorPage(null);
    if (back.tab !== 'home') goTab(back.tab);
    if (back.detailId) setDetailId(back.detailId);
  };

  // Android back closes the topmost layer first; the wall stays mounted underneath
  // so its scroll position and filters survive.
  useEffect(() => {
    return onHardwareBack(() => {
      const target = backTarget({
        sheet: save.open,
        batchSheet: !!sel.sheet,
        addOpen,
        settingsOpen,
        menuOpen: !!menuPost,
        detailOpen: !!detailId,
        selecting: sel.active,
        tab,
        authorPage: !!authorPage,
        tagPage: !!pageTag,
        browsing,
      });
      if (target === 'sheet') save.close();
      else if (target === 'batchSheet') sel.closeSheet();
      else if (target === 'selection') sel.exit();
      else if (target === 'author') leaveAuthor();
      else if (target === 'add') setAddOpen(false);
      else if (target === 'settings') setSettingsOpen(false);
      else if (target === 'menu') setMenuPost(null);
      else if (target === 'detail') setDetailId(null);
      else if (target === 'home') goTab('home');
      else if (target === 'tagPage') w.setTagPage(null);
      else if (target === 'browser') w.setBrowsing(false);
      return target !== null;
    });
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

  // Handlers for the memoised cards and screens keep one identity across renders,
  // so a keystroke in search or one post changing doesn't re-render every card
  // on the wall, the 串流 feed and the 翻翻 deck (see e2e/perf.cjs).
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const headerActions = useMemo(
    () => ({ onAdd: add, onSearch: searchFromTab, searching: false, onSettings: openSettings }),
    [add, searchFromTab, openSettings],
  );
  const openPost = useCallback((p) => setDetailId(p.id), []);
  const openMenu = useCallback((p) => {
    buzz('light');
    setMenuSelectable(true);
    setMenuPost(p);
  }, []);
  const { retry: retryId, refresh: refreshId } = c;
  const retryPost = useCallback((p) => retryId(p.id), [retryId]);
  const refreshPost = useCallback((p) => refreshId(p.id), [refreshId]);
  const clearStreamAuthor = useCallback(() => setStreamAuthor(null), []);

  // What the 收藏 tab asks App.js to do (ui/CollectionTab.js).
  const wallActions = {
    open: openPost,
    menu: openMenu,
    retry: retryPost,
    add,
    settings: openSettings,
    login: () => setLoginOpen(true),
    triage: startTriage,
    shuffle: () => {
      setDeckFilter(null);
      goTab('deck');
    },
    streamTag: (id) => {
      setStreamFilter(id);
      setStreamAuthor(null);
      goTab('stream');
    },
    streamAuthor: (handle) => {
      setStreamAuthor(handle);
      setStreamFilter(null);
      goTab('stream');
    },
    editTags: () => setTagsOpen(true),
    leaveAuthor,
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
            <CollectionTab w={w} sel={sel} c={c} index={index} update={update} on={wallActions} />
          </Pane>
          {visited.includes('deck') && (
            <Pane hidden={tab !== 'deck'}>
              <DeckScreen
                posts={c.posts}
                index={index}
                filter={deckFilter}
                onFilter={setDeckFilter}
                onOpen={openPost}
                onAuthor={openAuthor}
                onPick={save.pickDeckTags}
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
                author={streamAuthor}
                onClearAuthor={clearStreamAuthor}
                onAuthor={openAuthor}
                active={tab === 'stream' && !detail}
                actions={headerActions}
                onAction={onAction}
                onStale={refreshPost}
              />
            </Pane>
          )}
          {/* Lifted over the selection bar while selecting. */}
          <SafeAreaInsetsContext.Provider value={sel.active ? { ...contentInsets, bottom: SELECTION_BAR_HEIGHT } : contentInsets}>
            <DownloadPill state={dl.state} queued={dl.queued} onAction={downloads.onPillAction} onSkip={dl.skip} />
          </SafeAreaInsetsContext.Provider>
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
            onStale={refreshPost}
            onAuthor={openAuthor}
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

      <CardMenu post={menuPost} selectable={menuSelectable && !!currentWall} onClose={() => setMenuPost(null)} onAction={onAction} />
      {sel.sheet === 'tags' && (
        <BatchTagSheet posts={c.posts} ids={sel.ids} index={index} onCreateTag={c.createTag} onApply={sel.applyTags} onClose={sel.closeSheet} />
      )}
      {sel.sheet === 'delete' && <ConfirmDeleteSheet count={sel.ids.length} onConfirm={sel.confirmDelete} onClose={sel.closeSheet} />}
      <SaveSheet {...save.props} />
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
        onCheckUpdate={update.settingsPress}
        updateStatus={update.settingsStatus}
        version={update.version}
        stats={`${c.posts.length} 篇 · ${c.tags.length} 個標籤`}
        readSpeed={settingsOpen ? speedLabel(c.fetchSpeed?.summary()) : null}
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
        <Toast
          toast={toast}
          onUndo={() => {
            if (toast?.onUndo) toast.onUndo();
            else c.undoRemove();
            setToast(null);
          }}
          onHide={hideToast}
        />
      </SafeAreaInsetsContext.Provider>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  hiddenWeb: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
