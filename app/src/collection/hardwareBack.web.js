// Web build only (used by the automated E2E tests): there is no back button, so
// `window.__pressBack()` plays one — newest handler first, like Android — and
// returns whether the app handled it (false = the app would close).
const handlers = [];

if (typeof window !== 'undefined') {
  window.__pressBack = () => {
    for (const handler of [...handlers].reverse()) if (handler()) return true;
    return false;
  };
}

export function onHardwareBack(handler) {
  handlers.push(handler);
  return () => {
    const i = handlers.indexOf(handler);
    if (i >= 0) handlers.splice(i, 1);
  };
}
