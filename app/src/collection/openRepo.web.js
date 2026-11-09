// Web build (E2E tests): keep the collection in memory.
// `?seed=N` on the page URL (performance harness, e2e/perf.cjs) starts it with
// N generated posts and two-level tags instead of an empty collection.
import { createMemoryRepo } from './repo';
import { SAMPLES } from './fetcher.web';
import { seedCollection, seedCount } from './perfSeed';

export async function openRepo() {
  const repo = createMemoryRepo();
  const n = typeof window === 'undefined' ? 0 : seedCount(window.location.search);
  if (n) {
    const { tags, posts } = seedCollection(n, { samples: SAMPLES });
    for (const tag of tags) await repo.insertTag(tag);
    for (const post of posts) await repo.insertPost(post);
    await repo.setMeta('seeded', '1'); // no default tags on top of the generated ones
    await repo.setMeta('migrated_history', '1');
  }
  return repo;
}
