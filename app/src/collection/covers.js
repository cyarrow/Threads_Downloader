import { Directory, File, Paths } from 'expo-file-system';

const coverDir = () => new Directory(Paths.document, 'covers');

// Keeps the post's full-resolution still on the phone so the wall stays sharp
// and works offline after the CDN link expires. Returns a file:// URI or null.
export async function saveCover(code, url) {
  if (!code || !url) return null;
  try {
    const dir = coverDir();
    if (!dir.exists) dir.create();
    // Download next to the cover and swap it in afterwards: a failed download
    // must leave the cover the card already has.
    const name = `${code}.jpg`;
    const part = new File(dir, `${code}.part`);
    if (part.exists) part.delete();
    const fresh = await File.downloadFileAsync(url, part);
    const target = new File(dir, name);
    if (target.exists) target.delete();
    fresh.rename(name);
    return new File(dir, name).uri;
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
