// Backup format for the collection (phase 3). Pure — tested in Node.
// The file is plain JSON so it stays readable even without this app.
// Covers are left out (they're re-downloaded from the post on the new phone).

export const BACKUP_APP = 'threads-downloader';
export const BACKUP_VERSION = 1;

export function makeBackup(posts, tags, now = Date.now()) {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now,
    tags: tags.map(({ id, name, parentId, color, createdAt }) => ({ id, name, parentId: parentId || null, color, createdAt })),
    posts: posts
      .filter((p) => p.code)
      .map(({ code, url, author, caption, media, featured, downloaded, savedAt, tagIds }) => ({
        code, url, author, caption, media, featured: !!featured, downloaded: !!downloaded, savedAt, tagIds,
      })),
  };
}

export function backupFileName(now = Date.now()) {
  const d = new Date(now);
  const pad = (n) => String(n).padStart(2, '0');
  return `threads-collection-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
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
// parent; posts already saved (same code) are skipped. `newId(prefix)` makes ids.
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
  let skipped = 0;
  for (const p of backup.posts) {
    if (!p.code || have.has(p.code)) {
      skipped += 1;
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
      tagIds: (p.tagIds || []).map((id) => idMap[id]).filter(Boolean),
    });
  }
  return { tagsToCreate, postsToInsert, skipped };
}
