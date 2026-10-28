// Pure rules for the download queue. Items look like { url, fromShare }.

// Adds a request unless that post is already running or waiting.
export function enqueue(queue, item, currentUrl) {
  if (item.url === currentUrl || queue.some((q) => q.url === item.url)) return queue;
  return [...queue, item];
}

// The next request starts only once the current one has finished cleanly.
// Errors pause the queue so the message stays on screen until the user acts.
export function canAdvance(phase, loading) {
  return !loading && (phase === 'idle' || phase === 'done');
}
