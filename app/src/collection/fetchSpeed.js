// How long reading a post takes (fetcher.js records each successful read), so
// 設定 can show it and a change to the fetcher can be judged by real numbers.
// Keeps the most recent reads since the app started. Pure: Node-testable.

const KEEP = 20;

export function createSpeedTracker() {
  const times = [];
  return {
    record(ms) {
      if (!(ms >= 0)) return;
      times.push(ms);
      if (times.length > KEEP) times.shift();
    },
    // { count, median } in ms, or null before the first read.
    summary() {
      if (!times.length) return null;
      const sorted = [...times].sort((a, b) => a - b);
      const mid = sorted.length >> 1;
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      return { count: times.length, median };
    },
  };
}

// 「約 2.4 秒（最近 8 篇）」, or null before the first read.
export function speedLabel(summary) {
  if (!summary) return null;
  return `約 ${(summary.median / 1000).toFixed(1)} 秒（最近 ${summary.count} 篇）`;
}
