# Browser E2E tests

The app's web export (`npx expo export --platform web`) swaps the native pieces
for `*.web.js` stand-ins: a fake fetcher (post codes such as `IMG1`, `CAR1`,
`FLAKY1`, `LOGIN1`, `GONE1` decide what a "read" returns), an in-memory
repository, a fake backup folder (`window.__fakeBackupFolder`) and a fake share
intent (`?share=<url>` / `window.__shareToApp(url)`). The suites here drive that
build in Chromium with Playwright at phone size (390×844, touch) and print one
`PASS …` / `FAIL …` line per check.

| Suite | Covers |
| --- | --- |
| `core.cjs` | First run, saving an image / carousel (new tag, download picker) / text post, login failure, duplicate save, filter + search, detail + 精選, long-press delete + 復原, same-author suggestion, 整理未分類, tag manager (rename, merge, delete), backup export + import |
| `quick-save.cjs` | Quick-save panel for shares: skeleton rows, three locked rows, same-author reasons, 其他標籤… full picker, 先存到未分類, 同時下載, the 分享時用快速面板 setting, rows that stay put when a slow post loads |
| `fetch-health.cjs` | Fetch-failure banner: 全部重試, deleted/private vs "Threads 可能改版了", login banner and 先不要提醒 |
| `auto-backup.cjs` | 自動備份: choose folder, 立即備份 keeps the newest 5, folder lost + re-pick, 30-day reminder on the wall, backup when the app goes to the background (fake clock) |
| `video.cjs` | At most one video plays at a time on the post detail page (carousel pages, page marks, closing, another post) |
| `tabs.cjs` | Bottom tabs, header ＋, 所有標籤 and tag pages, 串流 (filters, 隨機/換一批, 精選, inline video), the 翻翻 deck (drags, buttons, undo, 未分類 triage, 再洗一次), reduced motion |
| `film-theme.cjs` | Switching to the 底片 theme and visiting every screen in it, then back to 雜誌; no horizontal overflow |
| `selection-author.cjs` | 批次選取 on the wall / author / tag pages (tri-state 加標籤, 精選, 下載, 刪除 + 復原, Android back) and the 作者頁 from detail, 串流 and 翻翻 |
| `rules-notes.cjs` | 自動標籤規則 (author and keyword rules in the quick panel and full sheet, apply to existing posts + undo, rules from the detail page, tag deletion, slow loads) and 個人筆記 (detail, wall, 串流, search, save sheet, backup round-trip) |

`lib/harness.cjs` holds what every suite shares: the static server for the
export, the Chromium launch, phone-sized pages (`newPage()`), `check()` /
`step()` and the exit code (non-zero when any check fails or the suite throws).
It also answers the app's update check (GitHub releases API) with "no release",
so results don't depend on the network, and, for suites that play video, serves
`clip.webm` for every media request (the stand-in data points videos at PNGs).

## Running locally

```bash
cd app
npm ci
npx playwright install chromium   # once; or point E2E_CHROMIUM at a Chromium binary
npm run e2e                       # export the web build, then run everything
```

`npm run e2e` is `node e2e/run.mjs --build`. The runner exports the web build to
`e2e/.out/web`, runs every suite in light and dark (plus the 底片 variants of
`selection-author` and `rules-notes`), three at a time, retries a failed suite
once and reports it as flaky if the retry passes, prints a summary table and
exits non-zero if any suite failed twice. Options:

```bash
node e2e/run.mjs --only core,tabs --scheme dark   # reuse the last export
node e2e/run.mjs --build --theme film --jobs 2
E2E_CHROMIUM=/path/to/chrome npm run e2e          # use an installed Chromium
```

One suite on its own (after an export exists in `e2e/.out/web`):

```bash
node e2e/selection-author.cjs [webdir] [shotdir] [light|dark] [editorial|film]
```

Every argument is optional (also `E2E_WEB`, `E2E_OUT`, `E2E_SCHEME`,
`E2E_THEME`). Screenshots go to `e2e/.out/shots/<suite>-<scheme>[-film]/` and
the runner's logs to `e2e/.out/logs/`; `e2e/.out/` is gitignored.
`E2E_TIMEOUT` (seconds, default 600) fails a suite that hangs.

## CI

The `e2e` job in `.github/workflows/android.yml` runs on the same triggers as the
APK build, alongside it, and does not block the build or the release: `npm ci`,
`npx playwright install --with-deps chromium`, `npm run e2e`. When it fails, the
screenshots and logs are uploaded as the `e2e-screenshots-<run>` artifact.

## Writing checks

The suites use fixed waits sized to the stand-ins' timers (a post "loads" in
600 ms) and real labels (`getByRole` / `getByText` with the Chinese UI text), so
a renamed label fails loudly. When a check turns out timing-sensitive, wait for
the state you expect instead of adding sleeps: the harness passes `until(fn)`,
which polls `fn` for up to 5 s (see the 翻翻 tag-pick check in `tabs.cjs`).
