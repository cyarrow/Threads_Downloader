import { useCallback, useEffect, useState } from 'react';
import { Directory, File, Paths } from 'expo-file-system';
import { upsertHistory } from './historyModel';

const historyFile = () => new File(Paths.document, 'history.json');
const thumbDir = () => new Directory(Paths.document, 'thumbs');

// Also read once by the collection store to migrate old downloads into cards.
export async function loadHistory() {
  try {
    const file = historyFile();
    return file.exists ? JSON.parse(await file.text()) : [];
  } catch {
    return [];
  }
}

function persist(list) {
  historyFile()
    .write(JSON.stringify(list))
    .catch(() => {});
}

// Keeps a small local copy of the post's cover so the list still shows it after
// the CDN link expires. Returns a file:// URI, or null if it couldn't be saved.
export async function saveThumb(code, url) {
  if (!url) return null;
  try {
    const dir = thumbDir();
    if (!dir.exists) dir.create();
    const target = new File(dir, `${code}.jpg`);
    if (target.exists) target.delete();
    return (await File.downloadFileAsync(url, target)).uri;
  } catch {
    return null;
  }
}

function deleteThumb(entry) {
  try {
    if (entry.thumb) new File(entry.thumb).delete();
  } catch {
    // Already gone; nothing to clean up.
  }
}

export function useHistory() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadHistory().then(setItems);
  }, []);

  const add = useCallback((entry) => {
    setItems((list) => {
      const next = upsertHistory(list, entry);
      list.filter((e) => !next.includes(e) && e.thumb !== entry.thumb).forEach(deleteThumb);
      persist(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems((list) => {
      list.forEach(deleteThumb);
      persist([]);
      return [];
    });
  }, []);

  return { items, add, clear };
}
