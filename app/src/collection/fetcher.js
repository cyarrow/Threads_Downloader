import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { collectScript } from '../injected';
import { extractPost, parseThreadsUrl } from '../threads';
import { FetchError } from './fetchError';
import { createHealthTracker } from './fetchHealth';

export { FetchError };

const TIMEOUT_MS = 30000;

// Reads posts one at a time in a hidden WebView that uses the user's own Threads
// session. fetchPost(url) resolves to { code, url, author, caption, media }, or
// rejects with a FetchError whose kind comes from fetchHealth.js (which also
// spots a run of empty pages that suggests Threads changed its markup).
// noteLogin(): the login sheet just reported a working session.
export function usePostFetcher() {
  const queue = useRef([]);
  const [health] = useState(createHealthTracker);
  const current = useRef(null); // { post, resolve, reject, nonce }
  const [job, setJob] = useState(null);
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
      current.current = { ...item, post, nonce: Date.now() };
      setJob(current.current);
      return;
    }
  }, [health]);

  const finish = useCallback(
    (error, result) => {
      const j = current.current;
      if (!j) return;
      current.current = null;
      setJob(null);
      if (error) j.reject(error);
      else j.resolve(result);
      pump();
    },
    [pump],
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

  const onMessage = (event) => {
    const j = current.current;
    let data;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (!j || data.id !== j.post.id) return;
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
  };

  const webView = job ? (
    <WebView
      key={job.nonce}
      ref={webRef}
      source={{ uri: job.post.url }}
      onLoadEnd={() => webRef.current?.injectJavaScript(collectScript(job.post.id, job.post.code))}
      onMessage={onMessage}
      onError={() => finish(health.record({ type: 'error', kind: 'network' }))}
      sharedCookiesEnabled
      style={styles.hidden}
    />
  ) : null;

  const noteLogin = useCallback(() => health.noteLogin(), [health]);

  return { fetchPost, webView, busy: !!job, noteLogin };
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
