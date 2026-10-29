import { Directory, File, Paths } from 'expo-file-system';

const coverDir = () => new Directory(Paths.document, 'covers');

// Keeps the post's full-resolution still on the phone so the wall stays sharp
// and works offline after the CDN link expires. Returns a file:// URI or null.
export async function saveCover(code, url) {
  if (!code || !url) return null;
  try {
    const dir = coverDir();
    if (!dir.exists) dir.create();
    const target = new File(dir, `${code}.jpg`);
    if (target.exists) target.delete();
    return (await File.downloadFileAsync(url, target)).uri;
  } catch {
    return null;
  }
}

export function deleteCover(uri) {
  try {
    if (uri && uri.startsWith('file:')) new File(uri).delete();
  } catch {
    // Already gone.
  }
}
