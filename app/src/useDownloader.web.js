// Web build only (automated E2E tests): same interface as useDownloader.js, but
// "downloads" are simulated — no WebView or photo library on the web.
import { useCallback, useEffect, useRef, useState } from 'react';
import { parseThreadsUrl } from './threads';

const STEP_MS = 400;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function useDownloader({ onSaved } = {}) {
  const [state, setState] = useState({ phase: 'idle' });
  const [queued, setQueued] = useState(0);
  const queue = useRef([]);
  const busy = useRef(false);
  const choice = useRef(null);
  const last = useRef(null);
  const saved = useRef(onSaved);
  const runRef = useRef(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    saved.current = onSaved;
  }, [onSaved]);

  const run = useCallback(async (code, fromShare) => {
    busy.current = true;
    setWorking(true);
    last.current = { code, fromShare };
    setState({ phase: 'loading' });
    await sleep(STEP_MS);
    if (code.startsWith('FAIL')) {
      busy.current = false;
      setWorking(false);
      setState({ phase: 'error', title: '下載失敗', message: '網路錯誤', action: { kind: 'retry', label: '再試一次' } });
      return;
    }
    let total = 1;
    if (code.startsWith('CAR')) {
      const media = [0, 1, 2].map((i) => ({ type: 'image', thumb: null, poster: null, i }));
      total = await new Promise((resolve) => {
        choice.current = resolve;
        setState({ phase: 'choosing', post: { code, media } });
      });
      if (!total) {
        busy.current = false;
        setWorking(false);
        setState({ phase: 'idle' });
        return;
      }
    }
    for (let done = 0; done < total; done++) {
      setState({ phase: 'saving', done, total });
      await sleep(STEP_MS);
    }
    setState({ phase: 'done', videos: 0, images: total, fromShare });
    saved.current?.({ code });
    busy.current = false;
    setWorking(false);
    const next = queue.current.shift();
    setQueued(queue.current.length);
    if (next) runRef.current(next.code, next.fromShare);
  }, []);

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const start = useCallback(
    (text, { fromShare = false } = {}) => {
      const post = parseThreadsUrl(text);
      if (!post) return 'invalid';
      const code = post.code || `S${post.id}`;
      if (busy.current) {
        queue.current.push({ code, fromShare });
        setQueued(queue.current.length);
        return 'queued';
      }
      run(code, fromShare);
      return 'started';
    },
    [run],
  );

  const choose = useCallback((indexes) => {
    choice.current?.(indexes.length);
    choice.current = null;
  }, []);
  const cancelChoice = useCallback(() => {
    choice.current?.(0);
    choice.current = null;
  }, []);
  const retry = useCallback(() => last.current && run(last.current.code, last.current.fromShare), [run]);
  const skip = useCallback(() => {
    setState({ phase: 'idle' });
    const next = queue.current.shift();
    setQueued(queue.current.length);
    if (next) run(next.code, next.fromShare);
  }, [run]);

  return { state, queued, start, retry, skip, choose, cancelChoice, webViewProps: null, webViewKey: undefined, busy: working };
}
