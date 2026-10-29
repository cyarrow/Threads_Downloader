// Web build (E2E tests): keep the collection in memory.
import { createMemoryRepo } from './repo';

export async function openRepo() {
  return createMemoryRepo();
}
