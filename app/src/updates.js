// Checks GitHub Releases for a newer APK. CI publishes each main-branch build as a
// release tagged `build-<run number>` with the APK attached.

export function parseRelease(rel) {
  if (!rel || rel.draft || rel.prerelease) return null;
  const m = String(rel.tag_name || '').match(/^build-(\d+)$/);
  const apk = (rel.assets || []).find((a) => /\.apk$/i.test(a.name || ''));
  if (!m || !apk) return null;
  return {
    build: Number(m[1]),
    name: rel.name || rel.tag_name,
    notes: (rel.body || '').trim(),
    apkUrl: apk.browser_download_url,
    pageUrl: rel.html_url,
  };
}

// Resolves to the newer release, or null when up to date or the check fails;
// an update check must never get in the way of downloading.
export async function checkForUpdate(repo, currentBuild, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;
    const release = parseRelease(await res.json());
    return release && release.build > currentBuild ? release : null;
  } catch {
    return null;
  }
}
