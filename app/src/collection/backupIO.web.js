// Web build (E2E tests): keep the last export in memory so import can read it back.
let last = null;

export async function shareBackup(json) {
  last = json;
}

export async function pickBackup() {
  return last;
}

// --- Auto backup stand-in: a fake picked folder whose files live in memory. ---
// E2E hooks: window.__fakeBackupFolder.files() lists what was written;
// .revoke() makes the folder "disappear" like a removed SAF grant.
const FOLDER = 'content://com.google.android.apps.docs.storage/tree/Threads%E5%82%99%E4%BB%BD';
const files = new Map(); // uri → { name, json }
let gone = false;

export class BackupFolderError extends Error {
  constructor() {
    super('找不到資料夾');
    this.kind = 'folder';
  }
}

if (typeof window !== 'undefined') {
  window.__fakeBackupFolder = {
    files: () => [...files.values()].map((f) => f.name),
    revoke: () => {
      gone = true;
    },
    restore: () => {
      gone = false;
    },
  };
}

export async function pickBackupFolder() {
  gone = false;
  return FOLDER;
}

function check(folderUri) {
  if (gone || folderUri !== FOLDER) throw new BackupFolderError();
}

export async function writeBackupFile(folderUri, name, json) {
  check(folderUri);
  let unique = name;
  for (let i = 1; [...files.values()].some((f) => f.name === unique); i++) unique = name.replace(/\.json$/, ` (${i}).json`);
  const uri = `${FOLDER}/document/doc-${files.size + 1}-${Date.now()}`; // opaque, like Drive
  files.set(uri, { name: unique, json });
  return { uri, name: unique };
}

export function listBackupFolder(folderUri) {
  check(folderUri);
  return [...files.keys()];
}

export function deleteBackupFile(uri) {
  files.delete(uri);
}
