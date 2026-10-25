import { Directory, File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { fileName } from './threads';

// Downloads each media item and saves it to the device photo library.
// Returns the number of files saved.
export async function saveAll(code, media, onProgress) {
  const { granted } = await requestPermissionsAsync(true);
  if (!granted) throw new Error('需要相簿權限才能儲存媒體');

  const dir = new Directory(Paths.cache, 'threads');
  if (!dir.exists) dir.create();

  for (let i = 0; i < media.length; i++) {
    onProgress?.(i, media.length);
    const target = new File(dir, fileName(code, i, media[i]));
    if (target.exists) target.delete();
    const file = await File.downloadFileAsync(media[i].url, target);
    await Asset.create(file.uri);
    file.delete();
  }
  return media.length;
}
