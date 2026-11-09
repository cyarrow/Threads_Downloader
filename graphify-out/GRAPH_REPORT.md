# Graph Report - Threads_Downloader  (2026-11-09)

## Corpus Check
- 77 files · ~97,796 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1155 nodes · 2844 edges · 72 communities (59 shown, 13 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.86)
- Token cost: 115,440 input · 0 output

## Community Hubs (Navigation)
- Deck, Rediscover & Tag Model
- App Shell & In-App Updater
- E2E Harness & Perf Suites
- Shared UI Tokens & Base
- Fetch Health & Web Stand-ins
- Auto Backup Scheduling
- Save Sheet & Tag Picker
- Auto Tag Rules
- Film Prints & Deck Cards
- Brand Fonts & Settings
- Quick Save & Suggestions
- Page Spec Docs
- Android App Config
- E2E Runner
- Batch Selection Logic
- Threads Parsing & Media Save
- Competitor Research
- Design System Overview
- Collection Model & Covers
- Post Fetcher & Speed
- Perf & E2E Docs
- Post Detail & Media
- CI, Signing & Motion Docs
- E2E Suite Docs
- Theme Palettes
- Update Feed & Security Tests
- Runtime Dependencies
- Backup Format & Import
- Theme Contrast Scripts
- Font Licenses
- Media & WebView Deps
- Rediscovery Research
- Save-Flow Research
- Card Wall Rendering Docs
- Save Sheet & Download Reuse
- Post Card
- Overnight Report Features
- Web Backup Stand-in
- Editorial Restyle Plan
- Lint Config
- Theme Components Docs
- Phase 1 Architecture Notes
- CI Step Settings
- Expo Agent Rules
- Masonry & CDN Expiry Research
- CI Jobs
- npm Scripts
- Video Playback Focus
- CI Steps
- Contrast Check Script
- APK Job Defaults
- Personal Notes Model
- CI Signing Secrets
- CI Triggers
- Release Signing Plugin
- Web Installer Stand-in
- Safe Repo Guard
- Web Share Intent
- Tagging Research
- CI Env
- Share Intent
- Web Back Button
- CI Concurrency
- Clipboard Dep
- File System Dep
- Haptics Dep
- Linking Dep
- Media Library Dep
- Sharing Dep
- React Native Web Dep

## God Nodes (most connected - your core abstractions)
1. `useCollectionTheme()` - 114 edges
2. `react-native` - 43 edges
3. `Competitor Research: Threads Collection` - 41 edges
4. `react` - 38 edges
5. `@expo/vector-icons` - 27 edges
6. `space` - 27 edges
7. `icon` - 24 edges
8. `TOUCH` - 23 edges
9. `tagLabel()` - 22 edges
10. `TagChip()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Tget - Threads Downloader` --semantically_similar_to--> `Threads_Downloader App`  [INFERRED] [semantically similar]
  docs/agent-reports/competitors.md → README.md
- `Hidden WebView Fetcher (fetcher.js)` --semantically_similar_to--> `Hidden WebView with User's Threads Login`  [INFERRED] [semantically similar]
  docs/overnight-progress.md → README.md
- `*.web.js Stand-ins (fake fetcher, in-memory repo, fake backup folder, fake share intent)` --semantically_similar_to--> `Hidden WebView with User's Threads Login`  [INFERRED] [semantically similar]
  app/e2e/README.md → README.md
- `Threads_Downloader App` --conceptually_related_to--> `Threads 收藏 Design System Master`  [AMBIGUOUS]
  README.md → design-system/threads-collection/MASTER.md
- `Apple Design Principles for UI` --semantically_similar_to--> `Spring Motion Tokens (motion.js)`  [INFERRED] [semantically similar]
  README.md → design-system/threads-collection/MASTER.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Threads Collection Three-Phase Roadmap** — docs_overnight_report_phase1_collection_home, docs_overnight_report_phase2_organize_retrieve, docs_overnight_report_phase3_backup, docs_overnight_progress_log [EXTRACTED 1.00]
- **Editorial Restyle Visual Components** — docs_next_editorial_restyle_editorial_palette, docs_next_editorial_restyle_editorial_card, docs_next_editorial_restyle_masthead, docs_next_editorial_restyle_tag_capsule, docs_next_editorial_restyle_save_link_fab, docs_next_editorial_restyle_tag_color_text_card [EXTRACTED 1.00]
- **Competitor Recommendations Realized in Phase 2/3** — docs_overnight_report_smart_suggestions, docs_overnight_report_review_cards, docs_overnight_report_tag_management, docs_overnight_report_organize_unsorted, docs_overnight_report_phase3_backup, docs_overnight_report_quick_panel [INFERRED 0.85]
- **Tap targets never move under the finger** — design_system_threads_collection_pages_save_sheet_no_shift_layout, design_system_threads_collection_pages_save_sheet_lock_picks, design_system_threads_collection_pages_save_sheet_late_suggestions, design_system_threads_collection_pages_phase_2_3_smart_tag_suggestions [INFERRED 0.85]
- **Automatic tag suggestion & rule sources for saving** — design_system_threads_collection_pages_save_sheet_suggest_js, design_system_threads_collection_pages_save_sheet_rank_quick_tags, design_system_threads_collection_pages_phase_2_3_smart_tag_suggestions [INFERRED 0.85]
- **Browser E2E Suites Run by run.mjs over harness.cjs** — app_e2e_readme_run_mjs, app_e2e_readme_harness_cjs, app_e2e_readme_core_cjs, app_e2e_readme_quick_save_cjs, app_e2e_readme_fetch_health_cjs, app_e2e_readme_auto_backup_cjs, app_e2e_readme_video_cjs, app_e2e_readme_tabs_cjs, app_e2e_readme_film_theme_cjs, app_e2e_readme_selection_author_cjs, app_e2e_readme_rules_notes_cjs [EXTRACTED 1.00]
- **Threads Media Download Flow** — readme_share_menu_entry, readme_hidden_webview_login, readme_injected_js, readme_threads_js, readme_usedownloader_js, readme_download_js, readme_expo_media_library [EXTRACTED 1.00]
- **Switchable Theme System (雜誌 / 底片)** — design_system_threads_collection_master_themes_js, design_system_threads_collection_master_usecollectiontheme, design_system_threads_collection_master_editorial_theme, design_system_threads_collection_master_film_theme, design_system_threads_collection_master_contrast_check_themes, design_system_threads_collection_master_text_color_surface_rule [EXTRACTED 1.00]

## Communities (72 total, 13 thin omitted)

### Community 0 - "Deck, Rediscover & Tag Model"
Cohesion: 0.05
Nodes (58): authorSummary(), normalizeHandle(), postsByAuthor(), summaryText(), topTags(), actionMessage(), advance(), ALL (+50 more)

### Community 1 - "App Shell & In-App Updater"
Cohesion: 0.07
Nodes (50): App(), Home(), Root(), styles, clearStale(), downloadApk(), InstallError, installsInApp (+42 more)

### Community 2 - "E2E Harness & Perf Suites"
Cohesion: 0.05
Nodes (33): T0, http, injectedPath, loadCollectScript(), page(), path, POST_JSON, serve() (+25 more)

### Community 3 - "Shared UI Tokens & Base"
Cohesion: 0.11
Nodes (38): failureSummary(), font, icon, space, TOUCH, AuthorBar(), styles, BackupNote() (+30 more)

### Community 4 - "Fetch Health & Web Stand-ins"
Cohesion: 0.06
Nodes (31): img, SAMPLES, usePostFetcher(), FetchError, authorOf(), createHealthTracker(), distinct(), failureLabel() (+23 more)

### Community 5 - "Auto Backup Scheduling"
Cohesion: 0.11
Nodes (35): META, num(), useAutoBackup(), autoBackupFileName(), backupFileName(), backupNameKey(), isBackupFileName(), BackupFolderError (+27 more)

### Community 6 - "Save Sheet & Tag Picker"
Cohesion: 0.14
Nodes (33): tagNameError(), lateSuggestions(), tagHue(), tagLabel(), useCollectionTheme(), PressScale(), PrimaryButton(), SecondaryButton() (+25 more)

### Community 7 - "Auto Tag Rules"
Cohesion: 0.15
Nodes (25): useCollection(), autoTags(), dropRules(), hasTagOrChild(), KEYWORD_MAX, matchRules(), normalizeRuleValue(), postsToTag() (+17 more)

### Community 8 - "Film Prints & Deck Cards"
Cohesion: 0.14
Nodes (24): formatImprint(), DeckCardImpl(), PageRules(), shortDate(), styles, Cover(), PhotoBack(), Rules() (+16 more)

### Community 9 - "Brand Fonts & Settings"
Cohesion: 0.10
Nodes (21): BRAND_BOLD, BRAND_FONT, BRAND_FONT_BOLD_WEB, elevation, filmFont, FONTS, IMPRINT_FONT, radius (+13 more)

### Community 10 - "Quick Save & Suggestions"
Cohesion: 0.14
Nodes (20): lockPicks(), postSettled(), QUICK_SLOTS, quickReasonText(), rankQuickTags(), SETTLE_MS, slotCount(), keywordHit() (+12 more)

### Community 11 - "Page Spec Docs"
Cohesion: 0.10
Nodes (18): TagChip Component, Competitor research report (docs/overnight-progress.md), Recap Card (回顧卡), 第二、三階段 頁面規格, Tag Management, Triage Uncategorized (整理未分類), Editor's-note (編按) row for deleted/backfill states, Media Carousel with page markers (+10 more)

### Community 12 - "Android App Config"
Cohesion: 0.09
Nodes (22): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, permissions, expo (+14 more)

### Community 13 - "E2E Runner"
Cohesion: 0.11
Nodes (16): APP_DIR, args, attempt(), build(), E2E_DIR, failed, flaky, jobs (+8 more)

### Community 14 - "Batch Selection Logic"
Cohesion: 0.23
Nodes (19): allSelected(), applyTagDiff(), cycleState(), diffStates(), featureTarget(), isSelectable(), pruneSelection(), removePosts() (+11 more)

### Community 15 - "Threads Parsing & Media Save"
Cohesion: 0.16
Nodes (18): LoginSheet(), findAlbum(), saveAll(), saveToLibrary(), domVideos(), extractPost(), fileName(), findPost() (+10 more)

### Community 16 - "Competitor Research"
Cohesion: 0.13
Nodes (20): Are.na, Choeae, Dewey, Eagle, Featured Card as Cover Story, Instagram Saves and Collections, LINE Keep, K-pop Photocard Binder View (+12 more)

### Community 17 - "Design System Overview"
Cohesion: 0.11
Nodes (11): FlashList Masonry Wall, contrast_check_themes.py Contrast Validator, Threads 收藏 Design System Master, FlashList masonry with overrideItemLayout span, Ionicons Icon Set, Pre-Delivery Checklist, Spacing, Radius and Two-Level Shadow, Typography (System CJK + LXGW WenKai TC) (+3 more)

### Community 18 - "Collection Model & Covers"
Cohesion: 0.20
Nodes (16): DEFAULT_TAGS, fetchedFields(), mergeTags(), needsRefresh(), newId(), nextTagColor(), postFromHistory(), pushRecent() (+8 more)

### Community 19 - "Post Fetcher & Speed"
Cohesion: 0.19
Nodes (13): styles, usePostFetcher(), createSpeedTracker(), speedLabel(), collectScript(), canAdvance(), enqueue(), isThreadsPage() (+5 more)

### Community 20 - "Perf & E2E Docs"
Cohesion: 0.15
Nodes (18): batch.js Set-Based Selection Helpers, Browser E2E Tests (Playwright), Fake Fetcher Post Codes (IMG1, CAR1, FLAKY1, LOGIN1, GONE1), Input-to-Next-Paint (INP) / Long Tasks / Renders Metrics, StreamScreen and DeckScreen memo, perf.cjs Performance Script, ?seed=N Perf Seed (perfSeed.js / openRepo.web.js), tabs.cjs Suite (+10 more)

### Community 21 - "Post Detail & Media"
Cohesion: 0.23
Nodes (17): cardStill(), imageSource(), NoteBlock(), NoteSection(), clamp(), formatDate(), InlineVideo(), MediaItem() (+9 more)

### Community 22 - "CI, Signing & Motion Docs"
Cohesion: 0.15
Nodes (15): e2e CI Job (non-blocking), Spring Motion Tokens (motion.js), android.yml GitHub Actions Workflow, APK Signing Keys (debug key / ANDROID_KEYSTORE_* secrets), App.js Main Screen, download.js Save to Threads Album, expo-file-system / expo-media-library Saving, In-App New Version Prompt (+7 more)

### Community 23 - "E2E Suite Docs"
Cohesion: 0.21
Nodes (17): auto-backup.cjs Suite, core.cjs Suite, fetch-health.cjs Suite, film-theme.cjs Suite, lib/harness.cjs Shared Harness, quick-save.cjs Suite, rules-notes.cjs Suite, e2e/run.mjs Suite Runner (+9 more)

### Community 24 - "Theme Palettes"
Cohesion: 0.22
Nodes (14): TAG_COLORS, TAG_HUES, COLOR_TOKENS, DEFAULT_THEME, KNOBS, mixHex(), normalizeThemeId(), RADIUS_KEYS (+6 more)

### Community 25 - "Update Feed & Security Tests"
Cohesion: 0.18
Nodes (6): summary(), checkForUpdate(), parseRelease(), samples, ok, release

### Community 26 - "Runtime Dependencies"
Cohesion: 0.12
Nodes (16): dependencies, expo-constants@~58.0.13, expo-image@~58.0.18, expo-sqlite@~58.0.14, expo-status-bar@~58.0.4, expo-system-ui@~58.0.6, @expo/vector-icons@^15.0.2, react@19.3.0 (+8 more)

### Community 27 - "Backup Format & Import"
Cohesion: 0.21
Nodes (12): BACKUP_APP, BACKUP_VERSION, cleanMedia(), makeBackup(), num(), parseBackup(), planImport(), web() (+4 more)

### Community 28 - "Theme Contrast Scripts"
Cohesion: 0.19
Nodes (5): check(), cr(), hx(), lum(), over()

### Community 29 - "Font Licenses"
Cohesion: 0.19
Nodes (12): SIL OFL 1.1 License (IBM Plex for ImprintMono), Reserved Font Name "Plex" (IBM Corp.), SIL OFL 1.1 License (LXGW WenKai TC), OFL Reserved Font Name Clause, SIL Open Font License 1.1, Film Theme Date Imprint, Fonts README, ImprintMono Date Imprint Font (+4 more)

### Community 30 - "Media & WebView Deps"
Cohesion: 0.15
Nodes (12): expo-document-picker@~58.0.4, expo-intent-launcher@~58.0.3, expo-video@~58.0.13, react-native-webview@14.0.1, main, name, private, version (+4 more)

### Community 31 - "Rediscovery Research"
Cohesion: 0.18
Nodes (12): Magazine-Style Quote Card, mymind, mymind Serendipity, R11 Author-Based Tag Suggestions, R12 Rediscovery Banner and Tidy Mode, R14 Featured as Pin Intent, Proactive Resurfacing (P6), Bottom Tabs (翻翻 / 收藏 / 串流) (+4 more)

### Community 32 - "Save-Flow Research"
Cohesion: 0.19
Nodes (12): Cosmos, GoodLinks, R19 Android Sharing Shortcuts to Tags, R2 Quick Save Mode, R4 Unsorted as Inbox, R6 Offline Save, R7 Share Onboarding Tutorial, R9 Tag Management (+4 more)

### Community 33 - "Card Wall Rendering Docs"
Cohesion: 0.20
Nodes (11): store.js runFetch, useLatestCallback Hook, 收藏牆 Card Wall (two-column masonry), NoteBlock / NoteSection / NoteSheet / NoteField, PostCard Component, TagFilterBar Component, Card Wall Interactions, Card States (loading/failed/deleted/downloaded) (+3 more)

### Community 34 - "Save Sheet & Download Reuse"
Cohesion: 0.35
Nodes (7): leaveToThreads(), systemToast(), useSaveSheet(), FRESH_MS, knownPost(), useDownloads(), card

### Community 35 - "Post Card"
Cohesion: 0.23
Nodes (8): NoteLine(), clamp(), Kicker(), Meta(), PostCard, PostCardImpl(), Skeleton(), styles

### Community 36 - "Overnight Report Features"
Cohesion: 0.17
Nodes (10): R10 Batch Operations, Card Wall Home Screen, Batch Selection (tri-state tags), Legacy Download History Migration, Phase 1: Collection as Home Screen, Overnight Work Report (2026-10-29 to 10-30), Test Results (73 unit, 27 web E2E), Items Needing On-Device Verification (+2 more)

### Community 37 - "Web Backup Stand-in"
Cohesion: 0.24
Nodes (5): BackupFolderError, check(), files, listBackupFolder(), writeBackupFile()

### Community 38 - "Editorial Restyle Plan"
Cohesion: 0.24
Nodes (11): Threads Collection Design Spec (MASTER.md, save-sheet, card-wall), Contrast Check Script, EditorialCard Layout, Editorial Palette (ink, paper, single blue accent), Masthead (THREADS 收藏誌 · N 篇), Editorial (Magazine) Restyle Plan, + 收藏連結 Labeled FAB, Editorial Tag Capsule (+3 more)

### Community 39 - "Lint Config"
Cohesion: 0.22
Nodes (9): { defineConfig }, expoConfig, devDependencies, eslint@^9.0.0, eslint-config-expo@~58.0.4, playwright@1.63.0, eslint, eslint-config-expo (+1 more)

### Community 40 - "Theme Components Docs"
Cohesion: 0.27
Nodes (10): 雜誌 (Editorial) Theme, 底片 (Film) Theme, ImprintMono Date Font (IBM Plex Mono subset), <PhotoBack> Text Card Component, <Print> Photo Component, Semantic Color Tokens, Tag Color Palette (9 low-chroma hues), TagMark / TagKicker Components (+2 more)

### Community 41 - "Phase 1 Architecture Notes"
Cohesion: 0.27
Nodes (10): Scroll Feel Fixes (press delay, recyclingKey, getItemType, drawDistance), Local APK Build Procedure (prebuild + gradlew), Automatic Backup, Hidden WebView Fetcher (fetcher.js), CollectionProvider (store.js), Collection Repo (SQLite / in-memory, repo.js), Innovation Agents (visual, organize/retrieve, save flow), Overnight Work Progress Log (+2 more)

### Community 42 - "CI Step Settings"
Cohesion: 0.20
Nodes (10): with, cache, cache-dependency-path, distribution, if-no-files-found, java-version, name, node-version (+2 more)

### Community 43 - "Expo Agent Rules"
Cohesion: 0.25
Nodes (5): Development Build Requirement (Expo Go limits), EAS Build / Submit / Update, Expo/React Native Agent Guidelines, npx expo install for SDK-Compatible Versions, Expo Router Navigation

### Community 44 - "Masonry & CDN Expiry Research"
Cohesion: 0.25
Nodes (8): Pinterest Gestalt Masonry Guidance, Threads Ghost Posts (24h), Masonry Layout Instability (A6), Meta CDN URL Expiry (oe parameter), R1 Download Cover and Dimensions on Save, R5 Ghost Post and Deleted Post Handling, Tget - Threads Downloader, Original-Resolution Covers (covers.js)

### Community 45 - "CI Jobs"
Cohesion: 0.25
Nodes (8): permissions, runs-on, timeout-minutes, jobs, e2e, name, permissions, contents

### Community 46 - "npm Scripts"
Cohesion: 0.25
Nodes (8): scripts, android, e2e, ios, lint, start, test, web

### Community 47 - "Video Playback Focus"
Cohesion: 0.36
Nodes (5): createPlaybackFocus(), playbackFocus, playingAfterPageChange(), fakePlayer(), p

### Community 48 - "CI Steps"
Cohesion: 0.36
Nodes (8): steps, steps, id, if, name, run, uses, working-directory

### Community 49 - "Contrast Check Script"
Cohesion: 0.48
Nodes (5): check(), cr(), hx(), lum(), over()

### Community 50 - "APK Job Defaults"
Cohesion: 0.29
Nodes (7): defaults, runs-on, timeout-minutes, run, defaults, apk, working-directory

### Community 51 - "Personal Notes Model"
Cohesion: 0.73
Nodes (4): mergeNote(), normalizeNote(), NOTE_MAX, noteFirstLine()

### Community 52 - "CI Signing Secrets"
Cohesion: 0.33
Nodes (6): ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD, ANDROID_KEYSTORE_PASSWORD, GH_TOKEN, KEYSTORE_BASE64, env

### Community 53 - "CI Triggers"
Cohesion: 0.33
Nodes (6): on, pull_request, push, workflow_dispatch, paths, paths

### Community 54 - "Release Signing Plugin"
Cohesion: 0.40
Nodes (3): expo@~58.0.19, { withAppBuildGradle }, expo

### Community 57 - "Web Share Intent"
Cohesion: 0.67
Nodes (3): initialShare(), listeners, useShareIntent()

### Community 58 - "Tagging Research"
Cohesion: 0.50
Nodes (4): Forced Categorization on Save (A2), Google Keep, Pinterest Boards and Sections, Two-Level Tags / Container+Tags (P5)

### Community 59 - "CI Env"
Cohesion: 0.50
Nodes (4): env, env, BUILD_NUMBER, CI

### Community 63 - "CI Concurrency"
Cohesion: 0.67
Nodes (3): concurrency, cancel-in-progress, group

## Ambiguous Edges - Review These
- `Threads_Downloader App` → `Threads 收藏 Design System Master`  [AMBIGUOUS]
  design-system/threads-collection/MASTER.md · relation: conceptually_related_to

## Knowledge Gaps
- **37 isolated node(s):** `Local APK Build Procedure (prebuild + gradlew)`, `Masthead (THREADS 收藏誌 · N 篇)`, `+ 收藏連結 Labeled FAB`, `Editorial Tag Capsule`, `Verification Procedure (npm test, lint, web export E2E)` (+32 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 318 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useCollectionTheme()` connect `Save Sheet & Tag Picker` to `Deck, Rediscover & Tag Model`, `App Shell & In-App Updater`, `Shared UI Tokens & Base`, `Post Card`, `Auto Tag Rules`, `Film Prints & Deck Cards`, `Brand Fonts & Settings`, `Quick Save & Suggestions`, `Batch Selection Logic`, `Threads Parsing & Media Save`, `Post Detail & Media`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `Local APK Build Procedure (prebuild + gradlew)`, `Masthead (THREADS 收藏誌 · N 篇)`, `+ 收藏連結 Labeled FAB` to the rest of the system?**
  _37 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Deck, Rediscover & Tag Model` be split into smaller, more focused modules?**
  _Cohesion score 0.053946053946053944 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Film Prints & Deck Cards` to `Deck, Rediscover & Tag Model`, `App Shell & In-App Updater`, `Save Sheet & Download Reuse`, `Shared UI Tokens & Base`, `Fetch Health & Web Stand-ins`, `Auto Backup Scheduling`, `Save Sheet & Tag Picker`, `Post Card`, `Auto Tag Rules`, `Brand Fonts & Settings`, `Quick Save & Suggestions`, `Batch Selection Logic`, `Collection Model & Covers`, `Post Fetcher & Speed`, `Post Detail & Media`, `Web Share Intent`, `Runtime Dependencies`, `Media & WebView Deps`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `App Shell & In-App Updater` be split into smaller, more focused modules?**
  _Cohesion score 0.06646825396825397 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `Shared UI Tokens & Base` to `Deck, Rediscover & Tag Model`, `App Shell & In-App Updater`, `Save Sheet & Download Reuse`, `Post Card`, `Auto Backup Scheduling`, `Save Sheet & Tag Picker`, `Auto Tag Rules`, `Film Prints & Deck Cards`, `Brand Fonts & Settings`, `Quick Save & Suggestions`, `Post Fetcher & Speed`, `Post Detail & Media`, `Runtime Dependencies`, `Media & WebView Deps`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Threads_Downloader App` and `Threads 收藏 Design System Master`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._