// Pure helpers for installing an update from inside the app (apkInstaller.js does
// the downloading and opens Android's installer). Handing the APK link to the
// browser used to fail with nothing but 「未安裝應用程式」 when a download was cut
// short, or when the user opened an older half-finished copy; downloading it
// ourselves lets the app check the file and say what went wrong.
// No React Native imports, so Node can test it.

export const APK_MIME = 'application/vnd.android.package-archive';
const APK_FILE = /^update-\d+\.apk$/;
// Room to spare on top of the APK itself: Android unpacks it while installing.
const SPACE_MARGIN = 100 * 1024 * 1024;

export const apkFileName = (build) => `update-${build}.apk`;

// Downloaded update files other than `keep`, to delete before a new download.
export const staleApkNames = (names, keep) => names.filter((n) => APK_FILE.test(n) && n !== keep);

// Whether the free space is clearly too little for the download plus the install.
// Unknown sizes (0 / NaN) never block: the download itself would fail then.
export function lacksSpace(available, apkSize) {
  if (!(available > 0) || !(apkSize > 0)) return false;
  return available < apkSize + SPACE_MARGIN;
}

// null when the downloaded file is complete, else the failure reason.
// `expected`: the release asset's size from GitHub; `total`: the Content-Length
// the server sent (-1 when unknown).
export function checkDownload({ size, expected, total }) {
  if (!(size > 0)) return 'incomplete';
  if (expected > 0 && size !== expected) return 'incomplete';
  if (!(expected > 0) && total > 0 && size !== total) return 'incomplete';
  return null;
}

// Failure reason for an error thrown while downloading.
export function downloadFailure(error) {
  const text = String(error?.message || error || '');
  if (/ENOSPC|no space|not enough space|disk full/i.test(text)) return 'space';
  if (/cancel/i.test(text)) return 'cancelled';
  return 'network';
}

export const FAILURE_TEXT = {
  network: '下載中斷了，請確認網路後再試一次',
  space: '手機空間不夠，請清出約 200 MB 後再試',
  incomplete: '下載的檔案不完整，請再試一次',
  installer: '打不開安裝畫面，可以改用瀏覽器下載',
  cancelled: '已取消下載',
};

const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

// 「37%・17.4 / 47.2 MB」 while the size is known, else just the MB so far.
export function progressLabel(written, total) {
  if (!(total > 0)) return `${mb(written || 0)} MB`;
  const pct = Math.min(100, Math.floor((written / total) * 100));
  return `${pct}%・${mb(written)} / ${mb(total)} MB`;
}

// Fraction 0–1 for the progress bar, or null when the total is unknown.
export const progressFraction = (written, total) => (total > 0 ? Math.min(1, Math.max(0, written / total)) : null);

// Progress events arrive many times a second; re-render only when the shown
// percentage (or, size unknown, the shown tenth of a MB) changes.
export function progressChanged(prev, written, total) {
  if (!prev) return true;
  return progressLabel(prev.written, prev.total) !== progressLabel(written, total);
}
