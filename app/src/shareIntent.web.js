// Web build only (automated E2E tests): the browser has no share sheet, so a
// share is simulated with `?share=<link>` on the page URL, or later with
// `window.__shareToApp(link)`. Same shape as expo-share-intent's hook.
import { useEffect, useState } from 'react';

const listeners = new Set();

function initialShare() {
  try {
    return new URLSearchParams(window.location.search).get('share');
  } catch {
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.__shareToApp = (text) => listeners.forEach((fn) => fn(text));
}

export function useShareIntent() {
  const [text, setText] = useState(initialShare);
  useEffect(() => {
    listeners.add(setText);
    return () => listeners.delete(setText);
  }, []);
  return {
    hasShareIntent: !!text,
    shareIntent: { text, webUrl: text, files: null, type: text ? 'weburl' : null },
    resetShareIntent: () => setText(null),
  };
}
