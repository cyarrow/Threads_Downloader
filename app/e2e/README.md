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

## Performance

`perf.cjs` measures the app with a large collection. It is run by hand and is
not part of `npm run e2e`. `?seed=N` on the page URL makes the web build's
in-memory repository (`openRepo.web.js`, web only; the seed is
`src/collection/perfSeed.js`) start with N generated posts. The posts are a mix
of images, carousels, videos and text, newest first over three years. Each has
0–3 two-level tags, and some have notes or are 精選, failed or deleted at the
source. The script then drives the build in Chromium at phone size with the CPU
slowed down 4×:

```bash
cd app
node e2e/perf.cjs --build                      # unminified export → e2e/.out/web-perf, then 1000 and 3000 posts × 3 runs
node e2e/perf.cjs --sizes 3000 --runs 1 --label mine
node e2e/perf.cjs --select-only                # load + 批次選取 steps only
node e2e/perf.cjs --web <other export> --label old   # e.g. an export of an older commit
node e2e/perf.cjs --compare e2e/.out/perf-old.json e2e/.out/perf-mine.json   # markdown table
```

For each interaction the script reports these measures:

- **Input→next paint:** the Event Timing `duration`, which is the INP measure. It
  comes in 8 ms steps, and values under 16 ms aren't reported.
- **Long tasks:** long-task time in the second after the interaction.
- **Renders:** how many components rendered. A small React DevTools stand-in
  walks every commit to count them, so the export is unminified to keep
  component names. Function components and memo cells are counted, and `View`
  and `Text` count too.

The interactions are:

- first wall card after load
- the launch refresh of 30 cards
- a quick wheel scroll down the wall
- typing `club1` into search, one key every 120 ms
- a tag chip on and off
- 精選 on one card from its long-press menu, then again after 串流 and 翻翻 have
  been visited (they stay mounted, hidden)
- 設定 open and close, 所有標籤, and the tabs
- 批次選取: start, 全選, untick one card, end

Results are written to `e2e/.out/perf-<label>.json`.

**Web numbers are a proxy for Android.** They come from desktop Chromium with
the CPU throttled and react-native-web, not Hermes and Fabric on a phone. Use
them to compare before and after on one machine, not as phone timings.

### Results

The table compares the parent commit 5b3c4d8 with this change, as the median of
3 runs on a 4-core Xeon VM with the CPU at 4×. Times are input→next paint in ms
unless marked. The 批次選取 rows come from `--select-only` runs.

| | 1000 before | 1000 after | 3000 before | 3000 after |
| --- | ---: | ---: | ---: | ---: |
| First wall card after load (ms since navigation) | 1347 | 1466 | 1733 | 1813 |
| Scroll the wall: frames over 50 ms / long tasks | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Search: worst key | 120 | 72 | 120 | 64 |
| Search: components rendered while typing | 6071 | 2737 | 6350 | 2803 |
| Search: results after the last key (incl. 250 ms debounce) | 459 | 502 | 461 | 437 |
| Tag filter on | 152 | 192 | 168 | 160 |
| 精選 on one card (wall only) | 128 | 96 | 168 | 88 |
| … PostCards rendered | 18 | 1 | 22 | 1 |
| 精選 on one card, 串流 + 翻翻 mounted | 6888 | 144 | 21320 | 168 |
| … components rendered (PostCard / StreamPost) | 117744 (1000 / 997) | 950 (1 / 1) | 352713 (3000 / 2993) | 954 (1 / 1) |
| 設定 sheet open / close | 176 / 112 | 128 / 80 | 176 / 112 | 120 / 72 |
| 所有標籤 open | 3520 | 112 | 11768 | 112 |
| Tab → 串流 (first visit) | 2064 | 216 | 5984 | 168 |
| Tab → 收藏 | 13848 | 96 | 75008 | 104 |
| Tab → 翻翻 (first visit) | 6616 | 152 | 19096 | 224 |
| Tab → 串流 (again) | 9856 | 104 | 28256 | 128 |
| 批次選取: 全選 | 144 | 80 | 176 | 80 |
| 批次選取: untick one card after 全選 | 128 | 64 | 112 | 88 |

What changed, in order of effect:

1. **Hidden panes keep their size on web** (`Pane` in `App.js`). Web used to
   hide a pane with `display: none`. In a pane hidden that way, FlashList
   measures every card as 0 px tall and mounts the whole list, which is every
   PostCard plus every StreamPost. After that, any render of the hidden list
   took seconds: tab → 收藏 at 3000 posts went from 74 s to 0.1 s, and
   所有標籤 from 12 s to 0.1 s. Web now lays a hidden pane over the visible one
   with `visibility: hidden`, as native already moves it off screen. Native
   always kept the pane's size, so this one is web only. It affects the E2E
   runs and the web proxy, not the APK.
2. **Stable props, so the memo cards actually skip.** PostCard now takes
   `onOpen(post)`, `onMenu(post)` and `onRetry(post)` instead of a new closure
   per card. `Home` passes `useCallback` handlers, or `useLatestCallback`
   (`src/collection/useLatestCallback.js`) for handlers that read a lot of state,
   such as `onAction`, `openAuthor` and `add`. `headerActions` is memoised.
   `store.js` builds `runFetch` on the fetcher's stable `fetchPost` instead of
   the fetcher object, which was new on every render. That had made `retry`,
   `refresh` and `addFromUrl` new on every provider render too. With these
   changes, 精選 on one card renders 1 PostCard instead of the whole visible
   window. Measured with `display: none` still in place, 精選 with all tabs
   mounted went from 6.9 s to 0.9 s at 1000 posts and from 21 s to 3.1 s at 3000.
3. **StreamScreen and DeckScreen are `memo`.** Their props are now stable, so
   while they are hidden a search keystroke or a sheet opening doesn't render
   them again. When one post changes, only that StreamPost or DeckCard renders.
4. **批次選取 helpers use Sets** (`batch.js`). `ids.includes` inside a loop over
   every post was O(posts × selected). With 全選 on 3000 posts that was about
   9 M comparisons per render, from `allSelected` and `featureTarget`, plus each
   batch action. The results are unchanged, and `test/batch.test.mjs` covers a
   3000-post 全選.
5. `untaggedCount` is memoised on the posts in `Home`.

Some costs are unchanged. Load time doesn't move: on web it includes generating
and inserting the seed, and the first render mounts the same cards. A filter or
search result still costs about 150–200 ms, which is FlashList laying out the
masonry wall again and mounting the new cards. 選取多篇 and 結束選取 render
every visible cell once. Scrolling the wall had no dropped frames before or
after, so the FlashList settings (`drawDistance`, `getItemType`,
`recyclingKey`) are unchanged. `filterPosts`, `tagSummaries` and the author
summary didn't show up in the profile at 3000 posts, so they were left as they
are.

**Check on a phone:** the native numbers for the same steps, with a release
build and about 3000 posts, by importing a backup made from a seeded web
session or a real large collection. Check these in particular:

- scrolling the wall, and 精選 / 編輯標籤 with 串流 and 翻翻 already visited
  (the hidden FlashLists should now stay idle)
- that the hidden panes off screen don't cost frames
- a search keystroke while 串流 is mounted
- 全選 on a big wall
