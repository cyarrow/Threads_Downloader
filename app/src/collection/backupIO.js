import { File, Paths } from 'expo-file-system';
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
