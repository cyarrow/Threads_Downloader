import { useCallback, useEffect, useRef } from 'react';
import { leaveToThreads, systemToast } from './appExit';
import { summary } from './historyModel';
import { useDownloader } from './useDownloader';

// Downloads of saved cards, on top of useDownloader. A card's media is only known
// once its details are in (share links resolve then), so a download asked for
// earlier waits and starts when the card is ready, or reports that it failed.
// `notify(toast)`: in-app toast. `onLogin()`: open the login sheet (the download
// pill's 登入 action); call `resumeAfterLogin()` once the user has logged in.
export function useDownloads({ c, notify, onLogin }) {
  const { markDownloaded } = c;
  const onSaved = useCallback((entry) => markDownloaded(entry.code), [markDownloaded]);
  // A finished download: in-app toast, or (shared from Threads) a system toast
  // and back to Threads, since nothing else is queued by then.
  const onDone = useCallback(
    (result) => {
      const message = `已存到相簿：${summary(result)}`;
      if (result.fromShare) {
        systemToast(message);
        leaveToThreads();
      } else {
        notify({ message });
      }
    },
    [notify],
  );
  const dl = useDownloader({ onSaved, onDone });
  const pending = useRef(new Map()); // postId → { fromShare }
  const afterLogin = useRef(false);

  const request = (id, fromShare = false) => {
    const post = c.posts.find((p) => p.id === c.resolveId(id));
    if (post?.status === 'ready' && post.code) dl.start(post.url, { fromShare });
    else pending.current.set(c.resolveId(id), { fromShare });
  };

  useEffect(() => {
    for (const [id, opts] of [...pending.current]) {
      const post = c.posts.find((p) => p.id === c.resolveId(id));
      if (post?.status === 'ready' && post.code) {
        pending.current.delete(id);
        dl.start(post.url, opts);
      } else if (!post || post.status === 'failed') {
        pending.current.delete(id);
        notify({ message: '貼文讀取失敗，無法下載' });
      }
    }
  }, [c.posts, c, dl, notify]);

  const onPillAction = (kind) => {
    if (kind === 'login') {
      afterLogin.current = true;
      onLogin();
    } else dl.retry();
  };
  const resumeAfterLogin = () => {
    if (!afterLogin.current) return;
    afterLogin.current = false;
    dl.retry();
  };

  return { dl, request, onPillAction, resumeAfterLogin };
}
