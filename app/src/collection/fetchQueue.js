// Order of the post reader's queue (fetcher.js reads one post at a time).
// A post the user just saved or retried must not wait behind background work:
//   high   — saved or retried just now
//   normal — a save from an earlier session that never finished loading
//   low    — background refresh of a card that already shows
// Within a level, first come first served. Pure: Node-testable.

export const PRIORITY = { low: 0, normal: 1, high: 2 };

const level = (item) => item.priority ?? PRIORITY.low;

// Adds `item` behind everything of its level or higher.
export function enqueue(queue, item) {
  const at = queue.findIndex((q) => level(q) < level(item));
  return at < 0 ? [...queue, item] : [...queue.slice(0, at), item, ...queue.slice(at)];
}

// Puts back a job that was interrupted for a more urgent one: first of its level.
export function requeueFront(queue, item) {
  const at = queue.findIndex((q) => level(q) <= level(item));
  return at < 0 ? [...queue, item] : [...queue.slice(0, at), item, ...queue.slice(at)];
}

// Whether a newly queued item should interrupt the job being read now.
export const shouldPreempt = (running, item) => !!running && level(running) < level(item);
