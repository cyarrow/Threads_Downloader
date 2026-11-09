import { useCallback, useLayoutEffect, useRef } from 'react';

// A function that keeps one identity for the component's lifetime and always
// calls the latest `fn`. For handlers passed to memoised list rows (PostCard,
// StreamPost) and screens: a new closure on every render would make them render
// again whenever anything in Home changes. Only for event handlers: don't call
// the result during render.
export function useLatestCallback(fn) {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args) => ref.current(...args), []);
}
