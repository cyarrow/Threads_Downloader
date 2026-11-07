// Backup format for the collection (phase 3). Pure — tested in Node.
// The file is plain JSON so it stays readable even without this app.
// Covers are left out (they're re-downloaded from the post on the new phone).
// Version 2 adds each post's `note` (only when it has one) and `rules`
// (自動標籤規則, pointing at the file's tag ids). Version 1 files still import.
import { normalizeNote } from './noteModel.js';
import { RULE_KINDS, normalizeRuleValue } from './tagRules.js';

export const BACKUP_APP = 'threads-downloader';
export const BACKUP_VERSION = 2;

export function makeBackup(posts, tags, rules = [], now = Date.now()) {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now,
    tags: tags.map(({ id, name, parentId, color, createdAt }) => ({ id, name, parentId: parentId || null, color, createdAt })),
    posts: posts
      .filter((p) => p.code)
      .map(({ code, url, author, caption, media, featured, downloaded, savedAt, tagIds, note }) => ({
        code, url, author, caption, media, featured: !!featured, downloaded: !!downloaded, savedAt, tagIds,
        ...(note ? { note } : {}),
      })),
    rules: rules.map(({ kind, value, tagId, createdAt }) => ({ kind, value, tagId, createdAt })),
  };
}

export function backupFileName(now = Date.now()) {
  const d = new Date(now);
  const pad = (n) => String(n).padStart(2, '0');
  return `threads-collection-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
}

// Auto backups can land more than once a day (立即備份), so they carry the time too.
export function autoBackupFileName(now = Date.now()) {
  const d = new Date(now);
  const pad = (n) => String(n).padStart(2, '0');
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return backupFileName(now).replace(/\.json$/, `-${time}.json`);
}

// Our backup files, as named by backupFileName / autoBackupFileName — including the
// " (1)" a document provider adds when a name is taken. Nothing else is ever pruned.
const BACKUP_NAME_RE = /^threads-collection-(\d{8})(?:-(\d{6}))?(?: \((\d+)\))?\.json$/;

export function isBackupFileName(name) {
  return typeof name === 'string' && BACKUP_NAME_RE.test(name);
}

// Sortable key (newer sorts later) for one of our backup file names, or null.
export function backupNameKey(name) {
  const m = typeof name === 'string' && name.match(BACKUP_NAME_RE);
  if (!m) return null;
  return `${m[1]}${m[2] || '000000'}${String(m[3] || 0).padStart(4, '0')}`;
}

// Throws an Error with a user-facing message when the file isn't a valid backup.
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('這不是收藏備份檔（無法讀取內容）');
  }
  if (!data || data.app !== BACKUP_APP || !Array.isArray(data.posts) || !Array.isArray(data.tags)) {
    throw new Error('這不是 Threads 下載的收藏備份檔');
  }
  if (data.version > BACKUP_VERSION) throw new Error('備份檔來自較新的版本，請先更新 App');
  return data;
}

// Works out what an import adds. Tags match existing ones by name under the same
// parent; posts already saved (same code) are skipped, except that a note the
// saved post doesn't have yet is filled in (`notesToFill`). Rules are added unless
// the same rule exists. `newId(prefix)` makes ids. `existing.rules` may be omitted.
export function planImport(backup, existing, newId) {
  const keyOf = (name, parentKey) => `${parentKey || ''}\u0000${name}`;
  const byKey = new Map();
  for (const t of existing.tags.filter((x) => !x.parentId)) byKey.set(keyOf(t.name, null), t.id);
  for (const t of existing.tags.filter((x) => x.parentId)) byKey.set(keyOf(t.name, t.parentId), t.id);

  const idMap = {};
  const tagsToCreate = [];
  const ordered = [...backup.tags.filter((t) => !t.parentId), ...backup.tags.filter((t) => t.parentId)];
  for (const t of ordered) {
    const parentId = t.parentId ? idMap[t.parentId] : null;
    if (t.parentId && !parentId) continue; // orphan child in a damaged file
    const key = keyOf(t.name, parentId);
    if (byKey.has(key)) {
      idMap[t.id] = byKey.get(key);
      continue;
    }
    const tag = { id: newId('t'), name: t.name, parentId, color: t.color, createdAt: t.createdAt || Date.now() };
    byKey.set(key, tag.id);
    idMap[t.id] = tag.id;
    tagsToCreate.push(tag);
  }

  const have = new Set(existing.posts.map((p) => p.code).filter(Boolean));
  const postsToInsert = [];
  const notesToFill = [];
  let skipped = 0;
  for (const p of backup.posts) {
    if (!p.code || have.has(p.code)) {
      skipped += 1;
      const saved = p.code && existing.posts.find((x) => x.code === p.code);
      const note = normalizeNote(p.note);
      if (saved && note && !saved.note && !notesToFill.some((n) => n.id === saved.id)) notesToFill.push({ id: saved.id, note });
      continue;
    }
    have.add(p.code);
    postsToInsert.push({
      id: newId('p'),
      code: p.code,
      url: p.url,
      author: p.author || '',
      caption: p.caption || '',
      media: Array.isArray(p.media) ? p.media : [],
      cover: null,
      status: 'ready',
      featured: !!p.featured,
      downloaded: !!p.downloaded,
      savedAt: p.savedAt || Date.now(),
      fetchedAt: null, // refresh in the background to bring the cover back
      note: normalizeNote(p.note),
      tagIds: (p.tagIds || []).map((id) => idMap[id]).filter(Boolean),
    });
  }

  const rulesToCreate = [];
  const key = (r) => `${r.kind}\u0000${r.value.toLowerCase()}\u0000${r.tagId}`;
  const ruleKeys = new Set((existing.rules || []).map(key));
  for (const r of Array.isArray(backup.rules) ? backup.rules : []) {
    if (!r || !RULE_KINDS.includes(r.kind)) continue;
    const rule = { kind: r.kind, value: normalizeRuleValue(r.kind, r.value), tagId: idMap[r.tagId] };
    if (!rule.value || !rule.tagId || ruleKeys.has(key(rule))) continue;
    ruleKeys.add(key(rule));
    rulesToCreate.push({ id: newId('r'), ...rule, createdAt: r.createdAt || Date.now() });
  }
  return { tagsToCreate, postsToInsert, skipped, notesToFill, rulesToCreate };
}
