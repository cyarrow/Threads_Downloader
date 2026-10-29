// Storage for the collection. Two implementations share one interface:
// - createSqlRepo(db): SQLite through an async driver (expo-sqlite on device,
//   node:sqlite in tests) exposing execAsync / runAsync / getAllAsync /
//   getFirstAsync / withTransactionAsync.
// - createMemoryRepo(): in-memory, for the web build used in E2E tests.
//
// Post: { id, code, url, author, caption, media: [{ type, url, poster, ratio }],
//         cover, status: 'loading' | 'ready' | 'failed' | 'sourceDeleted',
//         error, featured, downloaded, savedAt, fetchedAt, tagIds: [] }
// Tag:  { id, name, parentId, color, createdAt }

export const SCHEMA_VERSION = 1;

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT UNIQUE,
  url TEXT NOT NULL,
  author TEXT,
  caption TEXT,
  media TEXT NOT NULL DEFAULT '[]',
  cover TEXT,
  status TEXT NOT NULL DEFAULT 'loading',
  error TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  downloaded INTEGER NOT NULL DEFAULT 0,
  saved_at INTEGER NOT NULL,
  fetched_at INTEGER
);
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS post_tags (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT);
CREATE INDEX IF NOT EXISTS posts_saved_at ON posts (saved_at DESC);
`;

const POST_COLUMNS = {
  code: 'code',
  url: 'url',
  author: 'author',
  caption: 'caption',
  media: 'media',
  cover: 'cover',
  status: 'status',
  error: 'error',
  featured: 'featured',
  downloaded: 'downloaded',
  savedAt: 'saved_at',
  fetchedAt: 'fetched_at',
};

function toColumn(key, value) {
  if (key === 'media') return JSON.stringify(value || []);
  if (key === 'featured' || key === 'downloaded') return value ? 1 : 0;
  return value === undefined ? null : value;
}

function rowToPost(row, tagIds) {
  return {
    id: row.id,
    code: row.code,
    url: row.url,
    author: row.author || '',
    caption: row.caption || '',
    media: JSON.parse(row.media || '[]'),
    cover: row.cover,
    status: row.status,
    error: row.error,
    featured: !!row.featured,
    downloaded: !!row.downloaded,
    savedAt: row.saved_at,
    fetchedAt: row.fetched_at,
    tagIds: tagIds || [],
  };
}

const rowToTag = (row) => ({
  id: row.id,
  name: row.name,
  parentId: row.parent_id,
  color: row.color,
  createdAt: row.created_at,
});

export function createSqlRepo(db) {
  const insertPost = async (post) => {
    const keys = Object.keys(POST_COLUMNS).filter((k) => post[k] !== undefined);
    await db.runAsync(
      `INSERT INTO posts (id, ${keys.map((k) => POST_COLUMNS[k]).join(', ')}) VALUES (?${', ?'.repeat(keys.length)})`,
      [post.id, ...keys.map((k) => toColumn(k, post[k]))],
    );
    for (const tagId of post.tagIds || []) {
      await db.runAsync('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)', [post.id, tagId]);
    }
  };

  return {
    async init() {
      await db.execAsync(SCHEMA);
      await db.runAsync('INSERT OR IGNORE INTO meta (key, value) VALUES (?, ?)', ['schema_version', String(SCHEMA_VERSION)]);
    },

    async listPosts() {
      const rows = await db.getAllAsync('SELECT * FROM posts ORDER BY saved_at DESC');
      const links = await db.getAllAsync('SELECT post_id, tag_id FROM post_tags');
      const byPost = {};
      for (const l of links) (byPost[l.post_id] ||= []).push(l.tag_id);
      return rows.map((r) => rowToPost(r, byPost[r.id]));
    },

    async listTags() {
      const rows = await db.getAllAsync('SELECT * FROM tags ORDER BY created_at ASC');
      return rows.map(rowToTag);
    },

    async findByCode(code) {
      const row = await db.getFirstAsync('SELECT * FROM posts WHERE code = ?', [code]);
      if (!row) return null;
      const links = await db.getAllAsync('SELECT tag_id FROM post_tags WHERE post_id = ?', [row.id]);
      return rowToPost(row, links.map((l) => l.tag_id));
    },

    insertPost: (post) => db.withTransactionAsync(() => insertPost(post)),

    async updatePost(id, patch) {
      const keys = Object.keys(patch).filter((k) => POST_COLUMNS[k]);
      if (!keys.length) return;
      await db.runAsync(
        `UPDATE posts SET ${keys.map((k) => `${POST_COLUMNS[k]} = ?`).join(', ')} WHERE id = ?`,
        [...keys.map((k) => toColumn(k, patch[k])), id],
      );
    },

    deletePost: (id) => db.runAsync('DELETE FROM posts WHERE id = ?', [id]),

    setPostTags: (postId, tagIds) =>
      db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM post_tags WHERE post_id = ?', [postId]);
        for (const tagId of tagIds) {
          await db.runAsync('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)', [postId, tagId]);
        }
      }),

    insertTag: (tag) =>
      db.runAsync('INSERT INTO tags (id, name, parent_id, color, created_at) VALUES (?, ?, ?, ?, ?)', [
        tag.id,
        tag.name,
        tag.parentId || null,
        tag.color,
        tag.createdAt,
      ]),

    async getMeta(key) {
      const row = await db.getFirstAsync('SELECT value FROM meta WHERE key = ?', [key]);
      return row ? row.value : null;
    },

    setMeta: (key, value) =>
      db.runAsync('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
        key,
        value,
      ]),
  };
}

export function createMemoryRepo() {
  let posts = [];
  let tags = [];
  const meta = {};
  const clone = (p) => ({ ...p, media: [...(p.media || [])], tagIds: [...(p.tagIds || [])] });

  return {
    async init() {},
    listPosts: async () => [...posts].sort((a, b) => b.savedAt - a.savedAt).map(clone),
    listTags: async () => [...tags].sort((a, b) => a.createdAt - b.createdAt).map((t) => ({ ...t })),
    findByCode: async (code) => {
      const p = posts.find((x) => x.code === code);
      return p ? clone(p) : null;
    },
    async insertPost(post) {
      if (posts.some((p) => p.id === post.id || (post.code && p.code === post.code))) {
        throw new Error('UNIQUE constraint failed');
      }
      posts.push(clone({ featured: false, downloaded: false, status: 'loading', media: [], tagIds: [], ...post }));
    },
    async updatePost(id, patch) {
      const known = Object.keys(patch).filter((k) => POST_COLUMNS[k]);
      posts = posts.map((p) => (p.id === id ? { ...p, ...Object.fromEntries(known.map((k) => [k, patch[k]])) } : p));
    },
    async deletePost(id) {
      posts = posts.filter((p) => p.id !== id);
    },
    async setPostTags(postId, tagIds) {
      posts = posts.map((p) => (p.id === postId ? { ...p, tagIds: [...new Set(tagIds)] } : p));
    },
    async insertTag(tag) {
      tags.push({ ...tag, parentId: tag.parentId || null });
    },
    getMeta: async (key) => (key in meta ? meta[key] : null),
    async setMeta(key, value) {
      meta[key] = value;
    },
  };
}
