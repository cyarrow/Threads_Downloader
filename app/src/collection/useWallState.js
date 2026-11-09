import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { authorSummary, postsByAuthor } from './authorModel';
import { dayKey, pickRediscover } from './rediscover';
import { filterPosts, tagSummaries, untaggedCount } from './tagModel';

const SEARCH_DEBOUNCE_MS = 250;

// The wall's 回顧 card is picked per calendar day. The clock is read when the app
// starts and again when it comes back to the foreground on a later day.
function useToday() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      const t = Date.now();
      setNow((prev) => (dayKey(prev) === dayKey(t) ? prev : t));
    });
    return () => sub.remove();
  }, []);
  return now;
}

// State of the 收藏 tab: the wall's tag filter and search (shared by its pages),
// 所有標籤 (`browsing`) with a 大標籤's page (`tagPage`, `tagChild`), the 作者頁
// (`authorPage`: { handle, from }, see navModel.openAuthor), and the posts each
// of them shows. Rendered by ui/CollectionTab.js; App.js reads it for the back
// button, 批次選取 and opening an author from another tab.
export function useWallState({ c, index }) {
  const [filter, setFilter] = useState([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [tagPage, setTagPage] = useState(null);
  const [tagChild, setTagChild] = useState(null);
  const [authorPage, setAuthorPage] = useState(null);
  const [rediscoverHidden, setRediscoverHidden] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAppliedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const visible = useMemo(() => filterPosts(c.posts, filter, appliedQuery, index), [c.posts, filter, appliedQuery, index]);
  const untagged = useMemo(() => untaggedCount(c.posts), [c.posts]);
  // 「N 年前的今天」/「好久沒看」 stay on the wall; its 隨機翻翻 opens the 翻翻 tab.
  const today = useToday();
  const rediscover = useMemo(() => {
    if (rediscoverHidden || filter.length || appliedQuery.trim()) return null;
    return pickRediscover(c.posts, today);
  }, [c.posts, filter, appliedQuery, rediscoverHidden, today]);
  const pageTag = browsing && tagPage ? index.byId[tagPage] : null;
  const pagePosts = useMemo(
    () => (pageTag ? filterPosts(c.posts, [tagChild || pageTag.id], appliedQuery, index) : []),
    [pageTag, tagChild, c.posts, appliedQuery, index],
  );
  const summaries = useMemo(() => (browsing ? tagSummaries(c.posts, index) : []), [browsing, c.posts, index]);
  const authorHandle = authorPage?.handle;
  const authorPosts = useMemo(
    () => (authorHandle ? filterPosts(postsByAuthor(c.posts, authorHandle), [], appliedQuery, index) : []),
    [authorHandle, c.posts, appliedQuery, index],
  );
  const authorInfo = useMemo(() => (authorHandle ? authorSummary(c.posts, authorHandle, index) : null), [authorHandle, c.posts, index]);

  const setSearchOpen = (on) => {
    if (!on) setQuery('');
    setSearching(on);
  };
  // 搜尋 from 翻翻 / 串流 searches the whole collection on the wall itself.
  const searchAll = useCallback(() => {
    setBrowsing(false);
    setTagPage(null);
    setAuthorPage(null);
    setSearching(true);
  }, []);
  const openTagPage = (id) => {
    setTagChild(null);
    setTagPage(id);
  };
  const pullRefresh = () => {
    setRefreshing(true);
    c.posts.filter((p) => p.status === 'failed').forEach((p) => c.retry(p.id));
    setTimeout(() => setRefreshing(false), 600);
  };

  return {
    filter,
    setFilter,
    query,
    setQuery,
    searching,
    setSearchOpen,
    searchAll,
    browsing,
    setBrowsing,
    tagPage,
    setTagPage,
    openTagPage,
    tagChild,
    setTagChild,
    authorPage,
    setAuthorPage,
    hideRediscover: () => setRediscoverHidden(true),
    refreshing,
    pullRefresh,
    visible,
    untagged,
    rediscover,
    pageTag,
    pagePosts,
    summaries,
    authorPosts,
    authorInfo,
  };
}
