import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { extractPost, parseThreadsUrl } from './threads';
import { collectScript } from './injected';
import { saveAll } from './download';
import { saveThumb } from './history';
import { canAdvance, enqueue } from './queueModel';

const TIMEOUT_MS = 30000;

const needsLogin = {
  phase: 'error',
  title: '需要登入 Threads',
  message: '登入後會自動繼續下載。',
  action: { kind: 'login', label: '登入 Threads' },
};

// Drives downloads one at a time: load the post in a hidden WebView, collect what
// the page contains, let the user pick carousel items, then save the media.
// Requests that arrive while one is in progress wait in a queue and run in order.
// `state.phase` is one of idle | loading | choosing | saving | done | error.
// `onSaved(entry)` receives a history entry after every successful save.
export function useDownloader({ onSaved } = {}) {
  const [state, setStateRaw] = useState({ phase: 'idle' });
  const [job, setJobRaw] = useState(null); // { id, code, url, nonce } while a post is loading
  const [queued, setQueued] = useState(0);
  const webRef = useRef(null);
  const last = useRef(null); // { url, fromShare } of the current/latest request, for retry
  const savedCallback = useRef(onSaved);
  // Mirrors of state that callbacks need synchronously (e.g. a share arriving mid-download).
  const phaseRef = useRef('idle');
  const jobRef = useRef(null);
  const queueRef = useRef([]);

  useEffect(() => {
    savedCallback.current = onSaved;
  }, [onSaved]);

  const setState = useCallback((next) => {
    phaseRef.current = next.phase;
    setStateRaw(next);
  }, []);

  const setJob = useCallback((next) => {
    jobRef.current = next;
    setJobRaw(next);
  }, []);

  const setQueue = useCallback((next) => {
    queueRef.current = next;
    setQueued(next.length);
  }, []);

  const fail = useCallback(
    (next) => {
      setJob(null);
      setState(next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
    [setJob, setState],
  );

  const run = useCallback(
    (post, fromShare) => {
      last.current = { url: post.url, fromShare };
      setJob({ ...post, nonce: Date.now() });
      setState({ phase: 'loading' });
    },
    [setJob, setState],
  );

  // Starts the next queued request, if any and if nothing is running.
  const advance = useCallback(() => {
    if (!canAdvance(phaseRef.current, !!jobRef.current)) return;
    const [next, ...rest] = queueRef.current;
    if (!next) return;
    setQueue(rest);
    run(parseThreadsUrl(next.url), next.fromShare);
  }, [run, setQueue]);

  // `fromShare`: the request came from the share menu, so the app can send the
  // user straight back to Threads once everything is done.
  // Returns 'started', 'queued', 'duplicate' (already running or waiting), or 'invalid'.
  const start = useCallback(
    (text, { fromShare = false } = {}) => {
      const post = parseThreadsUrl(text);
      const busy = !!jobRef.current || ['loading', 'choosing', 'saving'].includes(phaseRef.current);
      if (!post) {
        // Don't wipe out a running download's status for a bad link.
        if (!busy) {
          fail({ phase: 'error', title: '這不是 Threads 貼文連結', message: '請確認連結是從 Threads 分享或複製的。' });
        }
        return 'invalid';
      }
      if (busy) {
        const next = enqueue(queueRef.current, { url: post.url, fromShare }, last.current?.url);
        if (next === queueRef.current) return 'duplicate';
        setQueue(next);
        return 'queued';
      }
      run(post, fromShare);
      return 'started';
    },
    [fail, run, setQueue],
  );

  const retry = useCallback(() => {
    if (last.current) run(parseThreadsUrl(last.current.url), last.current.fromShare);
  }, [run]);

  // Leave a failed request behind and move on to the next queued one.
  const skip = useCallback(() => {
    setState({ phase: 'idle' });
    advance();
  }, [advance, setState]);

  const save = useCallback(
    async (post, media) => {
      const fromShare = !!last.current?.fromShare;
      try {
        setState({ phase: 'saving', done: 0, total: media.length });
        await saveAll(post.code, media, (done) =>
          setState({ phase: 'saving', done, total: media.length }),
        );
        const videos = media.filter((m) => m.type === 'video').length;
        const counts = { videos, images: media.length - videos };
        setState({ phase: 'done', ...counts, author: post.author, fromShare });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const thumb = await saveThumb(post.code, media[0].thumb);
        savedCallback.current?.({
          code: post.code,
          url: post.url,
          author: post.author,
          caption: post.caption,
          ...counts,
          thumb,
          savedAt: Date.now(),
        });
        advance();
      } catch (e) {
        fail({ phase: 'error', title: '下載失敗', message: e.message, action: { kind: 'retry', label: '再試一次' } });
      }
    },
    [advance, fail, setState],
  );

  // Carousel picker results: indexes into state.post.media.
  const choose = useCallback(
    (indexes) => {
      if (state.phase !== 'choosing') return;
      const { post } = state;
      save(post, indexes.map((i) => post.media[i]));
    },
    [state, save],
  );

  const cancelChoice = useCallback(() => {
    setState({ phase: 'idle' });
    advance();
  }, [advance, setState]);

  // Safety net in case the page never reports back (network error, blocked page).
  useEffect(() => {
    if (!job) return;
    const timer = setTimeout(
      () => fail({ ...needsLogin, title: '讀取逾時', message: '請確認網路，或登入後再試一次。' }),
      TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, [job, fail]);

  const onLoadEnd = () => {
    if (job) webRef.current?.injectJavaScript(collectScript(job.id, job.code));
  };

  const onMessage = (event) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (!job || data.id !== job.id) return;
    setJob(null);

    const found = data.code ? extractPost(data.json, data.code, data.videos) : null;
    if (!found || !found.media.length) {
      const empty = data.code && !data.loggedOut && (data.json.length || data.videos.length);
      fail(empty ? { phase: 'error', title: '這篇貼文沒有影片或圖片' } : needsLogin);
      return;
    }

    const post = {
      ...found,
      code: data.code,
      url: found.author
        ? `https://www.threads.com/@${found.author}/post/${data.code}`
        : job.url,
    };
    if (post.media.length > 1) {
      setState({ phase: 'choosing', post });
    } else {
      save(post, post.media);
    }
  };

  const webViewProps = job && {
    ref: webRef,
    source: { uri: job.url },
    onLoadEnd,
    onMessage,
    onError: () =>
      fail({ phase: 'error', title: '無法開啟貼文', message: '請檢查網路連線。', action: { kind: 'retry', label: '再試一次' } }),
  };

  return {
    state,
    queued,
    start,
    retry,
    skip,
    choose,
    cancelChoice,
    webViewProps,
    webViewKey: job?.nonce,
    busy: !!job || state.phase === 'saving' || state.phase === 'choosing',
  };
}
