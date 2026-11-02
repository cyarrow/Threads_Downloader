// Pure rules for automatic backups and the backup reminder. Tested in Node.
// Times are epoch ms; "day" means the device's local calendar day.
import { backupNameKey, isBackupFileName } from './backup.js';

export const KEEP_BACKUPS = 5;
export const REMINDER_DAYS = 30;
export const REMINDER_MIN_POSTS = 20;
// After a failed automatic attempt, wait this long before trying again on our own.
export const RETRY_AFTER_FAILURE_MS = 3600 * 1000;
// How many files we remember writing (to prune folders whose file URIs hide the name).
export const OWN_FILES_MAX = 20;

const DAY_MS = 24 * 3600 * 1000;

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

// Fingerprint of what the user curated: which posts, their tags/featured state and
// the tags themselves. Media links are left out on purpose — background refreshes
// renew them all the time, and that alone shouldn't count as a change.
export function collectionMarker(posts, tags) {
  const p = posts
    .filter((x) => x.code)
    .map((x) => [x.code, x.author || '', x.caption || '', x.featured ? 1 : 0, x.downloaded ? 1 : 0, x.savedAt || 0, [...(x.tagIds || [])].sort()])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const t = tags
    .map((x) => [x.id, x.name, x.parentId || '', x.color || ''])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return `${p.length}.${t.length}.${hash(JSON.stringify([p, t]))}`;
}

export function sameLocalDay(a, b) {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

// Whether an automatic backup should run now (on launch or when the app goes to
// the background): a folder is set, nothing was backed up yet today, the
// collection changed since the last backup, and we didn't just fail.
export function shouldAutoBackup({ folderUri, lastAt, lastMarker, marker, lastFailedAt, now }) {
  if (!folderUri) return false;
  if (lastAt && sameLocalDay(lastAt, now)) return false;
  if (lastMarker && marker === lastMarker) return false;
  if (lastFailedAt && now - lastFailedAt < RETRY_AFTER_FAILURE_MS) return false;
  return true;
}

// Best-effort file name from a document URI. Path-like document ids
// ("primary:Download/x.json", "raw:/storage/…/x.json") give the real name;
// opaque ids (Drive, "msf:123") give something that won't match our pattern.
export function nameFromDocumentUri(uri) {
  const last = String(uri || '').replace(/\/+$/, '').split('/').pop() || '';
  let decoded;
  try {
    decoded = decodeURIComponent(last);
  } catch {
    decoded = last;
  }
  return decoded.split('/').pop().replace(/^[^:]*:/, '');
}

// Our backup files in a folder listing: [{ uri, name }]. A file counts only if its
// name is certain — readable from its URI, or remembered from when we wrote it.
export function resolveBackupFiles(uris, ownFiles = []) {
  const known = new Map(ownFiles.map((f) => [f.uri, f.name]));
  const out = [];
  for (const uri of uris) {
    const fromUri = nameFromDocumentUri(uri);
    const name = isBackupFileName(fromUri) ? fromUri : known.get(uri);
    if (isBackupFileName(name)) out.push({ uri, name });
  }
  return out;
}

// Which of our backup files to delete so only the newest `keep` remain.
export function planPrune(files, keep = KEEP_BACKUPS) {
  return files
    .filter((f) => isBackupFileName(f.name))
    .map((f) => ({ ...f, key: backupNameKey(f.name) }))
    .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0))
    .map(({ key, ...f }) => f)
    .slice(keep);
}

// Adds a file we just wrote to the remembered list (newest first, bounded).
export function rememberFile(ownFiles, file, max = OWN_FILES_MAX) {
  return [file, ...(ownFiles || []).filter((f) => f.uri !== file.uri)].slice(0, max);
}

const PROVIDERS = [
  [/^com\.google\.android\.apps\.docs/, '雲端硬碟'],
  [/^com\.android\.providers\.downloads/, '下載'],
  [/onedrive|skydrive/i, 'OneDrive'],
  [/dropbox/i, 'Dropbox'],
];

// Short human name for a folder the user picked, e.g. "Download/Threads備份" or
// "雲端硬碟/Threads備份". Falls back to the provider's name for opaque ids.
export function folderLabel(uri) {
  if (!uri) return '';
  const m = String(uri).match(/^content:\/\/([^/]+)\/tree\/([^/]+)/);
  if (!m) return nameFromDocumentUri(uri) || '已選的資料夾';
  const authority = m[1];
  let id;
  try {
    id = decodeURIComponent(m[2]);
  } catch {
    id = m[2];
  }
  const colon = id.indexOf(':');
  const volume = colon >= 0 ? id.slice(0, colon) : '';
  const path = (colon >= 0 ? id.slice(colon + 1) : id).replace(/^\/storage\/emulated\/\d+\//, '');
  const readable = path && !/[=;]/.test(path) && !/^\d+$/.test(path);
  const tail = readable ? path.split('/').filter(Boolean).slice(-2).join('/') : '';
  if (authority === 'com.android.externalstorage.documents') {
    const base = volume === 'primary' || volume === 'home' ? '' : 'SD 卡';
    if (!tail) return base || '內部儲存空間';
    return base ? `${base}/${tail}` : tail;
  }
  const provider = PROVIDERS.find(([re]) => re.test(authority))?.[1] || '已選的資料夾';
  return tail ? `${provider}/${tail}` : provider;
}

const pad = (n) => String(n).padStart(2, '0');

// 「今天 14:02」「昨天 09:15」「11/2 14:02」「2025/11/2」.
export function formatBackupTime(at, now) {
  if (!at) return '還沒有';
  const d = new Date(at);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (sameLocalDay(at, now)) return `今天 ${time}`;
  if (sameLocalDay(at, now - DAY_MS)) return `昨天 ${time}`;
  if (d.getFullYear() === new Date(now).getFullYear()) return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

// Gentle reminder while auto backup is off: ≥20 posts and nothing backed up for
// 30 days (counted from the first save if there was never a backup).
// `settings`: one-line note in settings. `wall`: the dismissible note on the wall,
// at most once per 30 days (`noteShownAt` is when it was last shown).
export function backupReminder({ autoOn, lastBackupAt, posts, noteShownAt, now }) {
  const period = REMINDER_DAYS * DAY_MS;
  const saved = posts.filter((p) => p.code);
  if (autoOn || saved.length < REMINDER_MIN_POSTS) return { settings: false, wall: false };
  const since = lastBackupAt || Math.min(...saved.map((p) => p.savedAt || now));
  const overdue = now - since >= period;
  return {
    settings: overdue,
    wall: overdue && (!noteShownAt || now - noteShownAt >= period),
    never: !lastBackupAt,
    count: saved.length,
  };
}
