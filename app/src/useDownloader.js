import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { extractMedia, parseThreadsUrl } from './threads';
import { collectScript } from './injected';
import { saveAll } from './download';

const TIMEOUT_MS = 30000;

const needsLogin = {
  phase: 'error',
  title: '需要登入 Threads',
  message: '登入後會自動繼續下載。',
  action: { kind: 'login', label: '登入 Threads' },
};

// Drives one download at a time: load the post in a hidden WebView, collect what
// the page contains, then save the media. `state.phase` is one of
// idle | loading | saving | done | error.
export function useDownloader() {
  const [state, setState] = useState({ phase: 'idle' });
  const [job, setJob] = useState(null); // { id, code, url, nonce } while a post is loading
  const webRef = useRef(null);
  const last = useRef(null);

  const fail = useCallback((next) => {
    setJob(null);
    setState(next);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  const start = useCallback(
    (text) => {
      const post = parseThreadsUrl(text);
      if (!post) {
        fail({ phase: 'error', title: '這不是 Threads 貼文連結', message: '請確認連結是從 Threads 分享或複製的。' });
        return;
      }
      last.current = post;
      setJob({ ...post, nonce: Date.now() });
      setState({ phase: 'loading' });
    },
    [fail],
  );

  const retry = useCallback(() => last.current && start(last.current.url), [start]);

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

  const onMessage = async (event) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (!job || data.id !== job.id) return;
    setJob(null);

    const media = data.code ? extractMedia(data.json, data.code, data.videos) : [];
    if (!media.length) {
      const empty = data.code && !data.loggedOut && (data.json.length || data.videos.length);
      fail(empty ? { phase: 'error', title: '這篇貼文沒有影片或圖片' } : needsLogin);
      return;
    }

    try {
      setState({ phase: 'saving', done: 0, total: media.length });
      await saveAll(data.code, media, (done) =>
        setState({ phase: 'saving', done, total: media.length }),
      );
      const videos = media.filter((m) => m.type === 'video').length;
      setState({ phase: 'done', videos, images: media.length - videos });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      fail({ phase: 'error', title: '下載失敗', message: e.message, action: { kind: 'retry', label: '再試一次' } });
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
    start,
    retry,
    webViewProps,
    webViewKey: job?.nonce,
    busy: !!job || state.phase === 'saving',
  };
}
