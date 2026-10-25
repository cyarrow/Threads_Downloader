import { Directory, File, Paths } from 'expo-file-system';
import { Album, Asset, requestPermissionsAsync } from 'expo-media-library';
import { fileName } from './threads';

const ALBUM = 'Threads';

async function findAlbum() {
  try {
    return await Album.get(ALBUM);
  } catch {
    return null; // e.g. no read access to the library; we'll create it instead
  }
}

// Saves a downloaded file into the "Threads" album when possible. The album is
// only a convenience, so any failure leaves the file in the default location.
async function saveToLibrary(uri, album) {
  if (album) {
    try {
      return { asset: await Asset.create(uri, album), album };
    } catch {
      // Fall through to a plain save.
    }
  }
  const asset = await Asset.create(uri);
  if (album) return { asset, album };
  try {
    return { asset, album: await Album.create(ALBUM, [asset], true) };
  } catch {
    return { asset, album: null };
  }
}

// Downloads each media item and saves it to the device photo library.
// Returns the number of files saved.
export async function saveAll(code, media, onProgress) {
  const { granted } = await requestPermissionsAsync(true);
  if (!granted) throw new Error('需要相簿權限才能儲存媒體');

  const dir = new Directory(Paths.cache, 'threads');
  if (!dir.exists) dir.create();

  let album = await findAlbum();
  for (let i = 0; i < media.length; i++) {
    onProgress?.(i, media.length);
    const target = new File(dir, fileName(code, i, media[i]));
    if (target.exists) target.delete();
    const file = await File.downloadFileAsync(media[i].url, target);
    ({ album } = await saveToLibrary(file.uri, album));
    file.delete();
  }
  return media.length;
}
