import { File, Paths } from 'expo-file-system';

const historyFile = () => new File(Paths.document, 'history.json');

// Also read once by the collection store to migrate old downloads into cards.
export async function loadHistory() {
  try {
    const file = historyFile();
    return file.exists ? JSON.parse(await file.text()) : [];
  } catch {
    return [];
  }
}
