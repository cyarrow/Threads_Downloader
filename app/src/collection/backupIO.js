import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { backupFileName } from './backup';

// Writes the backup to a temp file and opens the system share sheet
// (save to Drive / Files, send to yourself on LINE, …).
export async function shareBackup(json) {
  const file = new File(Paths.cache, backupFileName());
  if (file.exists) file.delete();
  file.create();
  await file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: '儲存收藏備份' });
}

// Lets the user pick a backup file; resolves to its text, or null if cancelled.
export async function pickBackup() {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  return new File(res.assets[0].uri).text();
}

// --- Auto backup to a folder the user picked (Android Storage Access Framework) ---
// Directory.pickDirectoryAsync opens ACTION_OPEN_DOCUMENT_TREE and takes a
// persistable read/write grant, so the content:// tree URI keeps working after
// restarts until the user removes the folder or revokes access.

// Thrown when the folder is gone or we lost access to it (user must pick again).
export class BackupFolderError extends Error {
  constructor(cause) {
    super('找不到資料夾');
    this.kind = 'folder';
    this.cause = cause;
  }
}

const isCancel = (e) => e?.code === 'ERR_PICKER_CANCELLED' || /cancel/i.test(String(e?.message));
const isPermission = (e) => /permission|security|not found|no such|does not exist/i.test(`${e?.code} ${e?.message}`);

// Resolves to the picked folder's URI, or null if the user backed out.
export async function pickBackupFolder() {
  try {
    const dir = await Directory.pickDirectoryAsync();
    return dir?.uri || null;
  } catch (e) {
    if (isCancel(e)) return null;
    throw e;
  }
}

function openFolder(folderUri) {
  let dir;
  try {
    dir = new Directory(folderUri);
    if (!dir.exists) throw new Error('folder does not exist');
  } catch (e) {
    throw new BackupFolderError(e);
  }
  return dir;
}

// Creates `name` in the folder and writes `json` to it. Returns { uri, name }.
export async function writeBackupFile(folderUri, name, json) {
  const dir = openFolder(folderUri);
  let file;
  try {
    file = dir.createFile(name, 'application/json');
  } catch (e) {
    throw isPermission(e) ? new BackupFolderError(e) : e;
  }
  try {
    await file.write(json);
  } catch (e) {
    try {
      file.delete(); // don't leave a half-written backup behind
    } catch {
      // Nothing more we can do.
    }
    throw isPermission(e) ? new BackupFolderError(e) : e;
  }
  return { uri: file.uri, name };
}

// URIs of the files directly in the folder.
export function listBackupFolder(folderUri) {
  return openFolder(folderUri)
    .list()
    .filter((x) => x instanceof File)
    .map((x) => x.uri);
}

export function deleteBackupFile(uri) {
  const file = new File(uri);
  if (file.exists) file.delete();
}
