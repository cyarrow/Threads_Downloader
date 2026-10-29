import { openDatabaseAsync } from 'expo-sqlite';
import { createSqlRepo } from './repo';

export async function openRepo() {
  const db = await openDatabaseAsync('collection.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  return createSqlRepo(db);
}
