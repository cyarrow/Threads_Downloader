import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { collectScript } from '../injected';
import { extractPost, parseThreadsUrl } from '../threads';
import { FetchError } from './fetchError';
import { createHealthTracker } from './fetchHealth';
import { createSpeedTracker } from './fetchSpeed';

export { FetchError };

const TIMEOUT_MS = 30000;
const BLANK = 'about:blank';

// Reads posts one at a time in a hidden WebView that uses the user's own Threads
// session. fetchPost(url) resolves to { code, url, author, caption, media }, or
// rejects with a FetchError whose kind comes from fetchHealth.js (which also
// spots a run of empty pages that suggests Threads changed its markup).
// noteLogin(): the login sheet just reported a working session.
//
// Speed: the WebView is created once, when the app starts, and kept for every
// read (a new one per post cost its start-up each time), and it goes back to a
// blank page between reads so a post's videos don't keep playing in the
// background. The collector (injected.js) is injected while the page loads and
// reads the post as soon as the HTML is parsed, without waiting for images.
// `speed` keeps how long recent reads took (fetchSpeed.js), shown in 設定.
export function usePostFetcher() {
  const queue = useRef([]);
  const [health] = useState(createHealthTracker);
  const [speed] = useState(createSpeedTracker);
  const current = useRef(null); // { post, resolve, reject, nonce }
  const [job, setJob] = useState(null);
  // What the WebView shows. `n` changes only to reload the same address (the
  // same post read twice in a row), since an unchanged source doesn't reload.
  const [page, setPage] = useState({ uri: BLANK, n: 0 });
  const webRef = useRef(null);

  const pump = useCallback(() => {
    if (current.current) return;
    while (queue.current.length) {
      const item = queue.current.shift();
      const post = parseThreadsUrl(item.url);
      if (!post) {
        item.reject(health.record({ type: 'error', kind: 'invalid' }));
        continue;
      }
      const next = { ...item, post, nonce: Date.now() };
      current.current = next;
      setJob(next);
      setPage((p) => ({ uri: post.url, n: p.uri === post.url ? p.n + 1 : p.n }));
      return;
    }
    setPage((p) => (p.uri === BLANK ? p : { uri: BLANK, n: p.n }));
  }, [health]);

  const finish = useCallback(
    (error, result) => {
      const j = current.current;
      if (!j) return;
      current.current = null;
      setJob(null);
      if (error) j.reject(error);
      else {
        speed.record(Date.now() - j.nonce);
        j.resolve(result);
      }
      pump();
    },
    [pump, speed],
  );

  const fetchPost = useCallback(
    (url) =>
      new Promise((resolve, reject) => {
        queue.current.push({ url, resolve, reject });
        pump();
      }),
    [pump],
  );

  useEffect(() => {
    if (!job) return;
    const timer = setTimeout(() => finish(health.record({ type: 'error', kind: 'timeout' })), TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [job, finish, health]);

  const inject = useCallback(() => {
    const j = current.current;
    if (j) webRef.current?.injectJavaScript(collectScript(j.post.id, j.post.code, String(j.nonce), j.nonce));
  }, []);

  const onMessage = useCallback((event) => {
    const j = current.current;
    let data;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (!j || data.id !== j.post.id || data.nonce !== String(j.nonce)) return;
    const found = data.code ? extractPost(data.json, data.code, data.videos) : null;
    if (!found || (!found.found && !found.media.length)) {
      // structural: the page had JSON about this post but we couldn't read the post out of it.
      const outcome = data.loggedOut
        ? { type: 'loggedOut' }
        : { type: 'miss', url: j.url, structural: !!found && data.json.length > 0 };
      finish(health.record(outcome));
      return;
    }
    health.record({ type: 'ok' });
    finish(null, { code: data.code, url: j.post.url, author: found.author, caption: found.caption, media: found.media });
  }, [finish, health]);
  const onError = useCallback(() => current.current && finish(health.record({ type: 'error', kind: 'network' })), [finish, health]);

  // Memoised: the store puts this element in its context value, which would
  // otherwise change on every render of the provider.
  const webView = useMemo(() => (
    <WebView
      key={page.n}
      ref={webRef}
      source={{ uri: page.uri }}
      onLoadProgress={inject}
      onLoadEnd={inject}
      onMessage={onMessage}
      onError={onError}
      sharedCookiesEnabled
      style={styles.hidden}
      // The library wraps the page in a flex: 1 container; without hiding that too
      // it took half the screen while a post was being read.
      containerStyle={styles.hidden}
    />
  ), [page, inject, onMessage, onError]);

  const noteLogin = useCallback(() => health.noteLogin(), [health]);

  return { fetchPost, webView, busy: !!job, noteLogin, speed };
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
