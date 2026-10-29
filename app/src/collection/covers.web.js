// Web build (E2E tests / previews): no file system, so the cover stays a URL.
export async function saveCover(code, url) {
  return url || null;
}

export function deleteCover() {}
