# Graph Report - Threads_Downloader  (2026-11-08)

## Corpus Check
- 131 files · ~74,410 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 4, .ttf 3)

## Summary
- 972 nodes · 2651 edges · 58 communities (45 shown, 13 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 77 edges (avg confidence: 0.86)
- Token cost: 233,220 input · 0 output

## Community Hubs (Navigation)
- 收藏介面元件
- 收藏資料模型與匯入
- 貼文讀取器
- 自動備份排程
- Android CI 工作流程
- 翻翻滑卡邏輯
- 主題與字型
- 競品產品清單
- App 殼層
- Expo app.json 設定
- 串流與標籤篩選
- 介面雛形
- 批次選取邏輯
- 本機封面與失效貼文
- 對比檢查工具（主題）
- 雜誌風格改版
- 設計系統總綱
- 分頁與導覽規格
- 舊下載紀錄
- 執行期依賴
- 快速收藏面板
- 字型授權
- package 中繼資料
- 找回與回顧功能
- 備份檔案 I/O
- Expo 開發守則
- 返回鍵與導覽模型
- 自動標籤規則與筆記
- 收藏面板規格
- 內容頁與互動規則
- 作者頁統計
- 收藏牆規格
- 第一階段資料層
- ESLint 設定
- npm scripts
- 影片播放焦點
- 智慧標籤建議
- 分享下載流程
- 對比檢查工具（雜誌）
- 入口與簽章外掛
- 更新檢查
- 雜誌與底片主題
- 安靜的配色原則
- 資料保存與備份動機
- 分享入口（網頁替身）
- 分享入口（原生）
- 返回鍵（網頁替身）
- expo-clipboard
- expo-file-system
- expo-haptics
- expo-linking
- expo-media-library
- expo-system-ui
- react-native-webview
- FlashList
- ＋ 收藏連結按鈕

## God Nodes (most connected - your core abstractions)
1. `useCollectionTheme()` - 117 edges
2. `Home()` - 60 edges
3. `Competitor Research: Threads Collection` - 41 edges
4. `react-native` - 39 edges
5. `react` - 34 edges
6. `CollectionProvider()` - 33 edges
7. `tagLabel()` - 29 edges
8. `space` - 28 edges
9. `@expo/vector-icons` - 27 edges
10. `Design System Master File — Threads 收藏` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Hidden WebView Fetcher (fetcher.js)` --semantically_similar_to--> `Hidden WebView with User Login`  [INFERRED] [semantically similar]
  docs/overnight-progress.md → README.md
- `Tget - Threads Downloader` --semantically_similar_to--> `Threads Downloader App`  [INFERRED] [semantically similar]
  docs/agent-reports/competitors.md → README.md
- `Local APK Build Procedure (prebuild + gradlew)` --semantically_similar_to--> `GitHub Actions APK Release Pipeline`  [INFERRED] [semantically similar]
  docs/overnight-progress.md → README.md
- `EditorialCard Layout` --references--> `LXGW WenKai TC Subset Font`  [INFERRED]
  docs/next-editorial-restyle.md → app/assets/fonts/README.md
- `Legacy Download History Migration` --references--> `Recent Downloads History`  [INFERRED]
  docs/overnight-report.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Threads Collection Three-Phase Roadmap** — docs_overnight_report_phase1_collection_home, docs_overnight_report_phase2_organize_retrieve, docs_overnight_report_phase3_backup, docs_overnight_progress_log [EXTRACTED 1.00]
- **Editorial Restyle Visual Components** — docs_next_editorial_restyle_editorial_palette, docs_next_editorial_restyle_editorial_card, docs_next_editorial_restyle_masthead, docs_next_editorial_restyle_tag_capsule, docs_next_editorial_restyle_save_link_fab, docs_next_editorial_restyle_tag_color_text_card [EXTRACTED 1.00]
- **Competitor Recommendations Realized in Phase 2/3** — docs_overnight_report_smart_suggestions, docs_overnight_report_review_cards, docs_overnight_report_tag_management, docs_overnight_report_organize_unsorted, docs_overnight_report_phase3_backup, docs_overnight_report_quick_panel [INFERRED 0.85]
- **Tap targets never move under the finger** — design_system_threads_collection_pages_save_sheet_no_shift_layout, design_system_threads_collection_pages_save_sheet_lock_picks, design_system_threads_collection_pages_save_sheet_late_suggestions, design_system_threads_collection_pages_phase_2_3_smart_tag_suggestions, design_system_threads_collection_master_rule_hits_row [INFERRED 0.85]
- **Theme system: themes.js data, provider hook and themed components** — design_system_threads_collection_master_themes_js, design_system_threads_collection_master_use_collection_theme, design_system_threads_collection_master_print_component, design_system_threads_collection_master_photoback_component, design_system_threads_collection_master_tag_mark_kicker, design_system_threads_collection_master_masthead_rule [EXTRACTED 1.00]
- **Automatic tag suggestion & rule sources for saving** — design_system_threads_collection_pages_save_sheet_suggest_js, design_system_threads_collection_pages_save_sheet_rank_quick_tags, design_system_threads_collection_master_tag_rules, design_system_threads_collection_pages_phase_2_3_smart_tag_suggestions [INFERRED 0.85]

## Communities (58 total, 13 thin omitted)

### Community 0 - "收藏介面元件"
Cohesion: 0.05
Nodes (139): tagNameError(), cardStill(), imageSource(), useCollection(), reasonText(), tagHue(), tagLabel(), elevation (+131 more)

### Community 1 - "收藏資料模型與匯入"
Cohesion: 0.07
Nodes (47): parseBackup(), planImport(), DEFAULT_TAGS, fetchedFields(), mergeTags(), needsRefresh(), newId(), nextTagColor() (+39 more)

### Community 2 - "貼文讀取器"
Cohesion: 0.07
Nodes (44): styles, usePostFetcher(), img, SAMPLES, usePostFetcher(), FetchError, authorOf(), createHealthTracker() (+36 more)

### Community 3 - "自動備份排程"
Cohesion: 0.10
Nodes (38): META, num(), useAutoBackup(), autoBackupFileName(), BACKUP_APP, BACKUP_VERSION, backupFileName(), backupNameKey() (+30 more)

### Community 4 - "Android CI 工作流程"
Cohesion: 0.05
Nodes (43): defaults, env, runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group (+35 more)

### Community 5 - "翻翻滑卡邏輯"
Cohesion: 0.12
Nodes (33): actionMessage(), advance(), ALL, deckAction(), deckHint(), newDeck(), releaseDirection(), remaining() (+25 more)

### Community 6 - "主題與字型"
Cohesion: 0.11
Nodes (27): TAG_COLORS, TAG_HUES, COLOR_TOKENS, DEFAULT_THEME, formatImprint(), KNOBS, mixHex(), normalizeThemeId() (+19 more)

### Community 7 - "競品產品清單"
Cohesion: 0.11
Nodes (29): Choeae, Cosmos, Dewey, Eagle, Featured Card as Cover Story, Forced Categorization on Save (A2), GoodLinks, Google Keep (+21 more)

### Community 8 - "App 殼層"
Cohesion: 0.12
Nodes (24): App(), Home(), leaveToThreads(), Pane(), Root(), styles, systemToast(), pickBackup() (+16 more)

### Community 9 - "Expo app.json 設定"
Cohesion: 0.09
Nodes (21): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, expo, android (+13 more)

### Community 10 - "串流與標籤篩選"
Cohesion: 0.16
Nodes (14): filterForTag(), streamItemType(), streamPosts(), expand(), filterPosts(), foldChips(), indexTags(), UNCATEGORIZED (+6 more)

### Community 11 - "介面雛形"
Cohesion: 0.15
Nodes (18): Banner(), Prototype(), PrototypeApp(), styles, img, INCOMING, normalize(), now (+10 more)

### Community 12 - "批次選取邏輯"
Cohesion: 0.25
Nodes (17): allSelected(), applyTagDiff(), cycleState(), diffStates(), featureTarget(), isSelectable(), pruneSelection(), removePosts() (+9 more)

### Community 13 - "本機封面與失效貼文"
Cohesion: 0.12
Nodes (16): Pinterest Gestalt Masonry Guidance, Threads Ghost Posts (24h), Masonry Layout Instability (A6), Meta CDN URL Expiry (oe parameter), R1 Download Cover and Dimensions on Save, R5 Ghost Post and Deleted Post Handling, Tget - Threads Downloader, Local APK Build Procedure (prebuild + gradlew) (+8 more)

### Community 14 - "對比檢查工具（主題）"
Cohesion: 0.15
Nodes (7): check(), cr(), hx(), lum(), over(), contrast_check.py (editorial-only legacy check), Semantic Color Tokens

### Community 15 - "雜誌風格改版"
Cohesion: 0.14
Nodes (17): R10 Batch Operations, Threads Collection Design Spec (MASTER.md, save-sheet, card-wall), EditorialCard Layout, Masthead (THREADS 收藏誌 · N 篇), Editorial (Magazine) Restyle Plan, + 收藏連結 Labeled FAB, Editorial Tag Capsule, Tag-Color Solid Text Card (+9 more)

### Community 16 - "設計系統總綱"
Cohesion: 0.15
Nodes (13): Pre-delivery Checklist, Empty States, Ionicons Icon System (outline vs filled), Design System Master File — Threads 收藏, <PhotoBack> text-post card, Spacing, Radius & Shadow Tokens (4/8 system, two shadow levels), Tag Color Palette (9 low-saturation hues, slate reserved for 未分類), <TagMark> / <TagKicker> components (+5 more)

### Community 17 - "分頁與導覽規格"
Cohesion: 0.16
Nodes (15): Author Page (ui/AuthorPage.js, authorModel), Batch Selection (ui/Selection.js), BatchTagSheet (tri-state tag checkboxes, batch.cycleState / diffStates), Bottom Tab Bar (翻翻 | 收藏 | 串流), 翻翻 Flip-through Tab, Masthead (報頭), <MastheadRule> / <SprocketRule>, Screen Architecture & Navigation (+7 more)

### Community 18 - "舊下載紀錄"
Cohesion: 0.18
Nodes (7): MAX_HISTORY, summary(), timeAgo(), upsertHistory(), posts, tags, index

### Community 19 - "執行期依賴"
Cohesion: 0.14
Nodes (14): dependencies, expo-image@~58.0.18, expo-sharing@~58.0.21, expo-sqlite@~58.0.14, expo-status-bar@~58.0.4, @expo/vector-icons@^15.0.2, react@19.3.0, react-native@0.88.0 (+6 more)

### Community 20 - "快速收藏面板"
Cohesion: 0.25
Nodes (10): lateSuggestions(), lockPicks(), postSettled(), QUICK_SLOTS, quickReasonText(), rankQuickTags(), SETTLE_MS, slotCount() (+2 more)

### Community 21 - "字型授權"
Cohesion: 0.19
Nodes (12): SIL OFL 1.1 License (IBM Plex for ImprintMono), Reserved Font Name "Plex" (IBM Corp.), SIL OFL 1.1 License (LXGW WenKai TC), OFL Reserved Font Name Clause, SIL Open Font License 1.1, Film Theme Date Imprint, Fonts README, ImprintMono Date Imprint Font (+4 more)

### Community 22 - "package 中繼資料"
Cohesion: 0.15
Nodes (12): expo-constants@~58.0.13, expo-document-picker@~58.0.4, expo-video@~58.0.13, react-dom@19.3.0, main, name, private, version (+4 more)

### Community 23 - "找回與回顧功能"
Cohesion: 0.20
Nodes (11): Magazine-Style Quote Card, mymind, mymind Serendipity, R11 Author-Based Tag Suggestions, R12 Rediscovery Banner and Tidy Mode, R14 Featured as Pin Intent, Proactive Resurfacing (P6), Bottom Tabs (翻翻 / 收藏 / 串流) (+3 more)

### Community 24 - "備份檔案 I/O"
Cohesion: 0.24
Nodes (5): BackupFolderError, check(), files, listBackupFolder(), writeBackupFile()

### Community 25 - "Expo 開發守則"
Cohesion: 0.24
Nodes (6): Development Build Required for Native Modules, EAS Build/Submit/Update, Expo App Agent Guidelines, Use expo install for Dependencies, Expo Router Navigation Convention, Lint and Typecheck Before Done

### Community 26 - "返回鍵與導覽模型"
Cohesion: 0.36
Nodes (8): backTarget(), closeAuthor(), HOME_TAB, openAuthor(), TABS, visitTab(), wallKey(), base

### Community 27 - "自動標籤規則與筆記"
Cohesion: 0.24
Nodes (9): Backup format v2 (notes + rules), Local SQLite storage (expo-sqlite, two-level tags via parentId), NoteBlock / NoteSection / NoteSheet / NoteField, Personal Notes (posts.note, noteModel.js), RuleHitsRow, RulesPage / RuleEditSheet, Auto-tag Rules (tag_rules table, tagRules.js), rankQuickTags (src/collection/quickSave.js) (+1 more)

### Community 28 - "收藏面板規格"
Cohesion: 0.31
Nodes (6): Motion Spring Tokens (press/standard/sheet/stagger, src/ui/motion.js), 同時下載到相簿 switch (download_too), Full Save Sheet (fixed 88% height), 分享時用快速面板 setting (meta quick_save), Quick Save Sheet (one tap to finish), 收藏面板 頁面規格

### Community 29 - "內容頁與互動規則"
Cohesion: 0.27
Nodes (5): Tag Management, Editor's-note (編按) row for deleted/backfill states, Media Carousel with page markers, PrimaryButton, 貼文內容頁 頁面規格

### Community 30 - "作者頁統計"
Cohesion: 0.44
Nodes (7): authorSummary(), normalizeHandle(), postsByAuthor(), summaryText(), topTags(), index, posts

### Community 31 - "收藏牆規格"
Cohesion: 0.28
Nodes (9): FlashList masonry with overrideItemLayout span, PostCard Component, Interface Prototype (app/prototype/PrototypeApp.js), Typography (system Noto Sans TC + LXGW WenKai TC subset), Card Wall Interactions, Card States (loading/failed/deleted/downloaded), Featured Card (full-row), Masonry Arrangement Rules (+1 more)

### Community 32 - "第一階段資料層"
Cohesion: 0.31
Nodes (9): Scroll Feel Fixes (press delay, recyclingKey, getItemType, drawDistance), Automatic Backup, Hidden WebView Fetcher (fetcher.js), CollectionProvider (store.js), Collection Repo (SQLite / in-memory, repo.js), Innovation Agents (visual, organize/retrieve, save flow), Overnight Work Progress Log, Scroll Feel Fixes (press delay, recyclingKey, drawDistance) (+1 more)

### Community 33 - "ESLint 設定"
Cohesion: 0.29
Nodes (7): { defineConfig }, expoConfig, devDependencies, eslint@^9.0.0, eslint-config-expo@~58.0.4, eslint, eslint-config-expo

### Community 34 - "npm scripts"
Cohesion: 0.25
Nodes (8): scripts, android, ios, lint, prototype:web, start, test, web

### Community 35 - "影片播放焦點"
Cohesion: 0.36
Nodes (5): createPlaybackFocus(), playbackFocus, playingAfterPageChange(), fakePlayer(), p

### Community 36 - "智慧標籤建議"
Cohesion: 0.36
Nodes (5): keywordHit(), KEYWORDS, suggestTags(), index, posts

### Community 37 - "分享下載流程"
Cohesion: 0.29
Nodes (7): Carousel Item Picker, Download State Machine (useDownloader.js), Injected Collector Script (injected.js), Post Parser (threads.js), Share Menu Entry Point, Share-to-Download Flow, Save to Threads Album

### Community 38 - "對比檢查工具（雜誌）"
Cohesion: 0.48
Nodes (5): check(), cr(), hx(), lum(), over()

### Community 39 - "入口與簽章外掛"
Cohesion: 0.33
Nodes (3): expo@~58.0.19, { withAppBuildGradle }, expo

### Community 40 - "更新檢查"
Cohesion: 0.53
Nodes (3): checkForUpdate(), parseRelease(), release

### Community 41 - "雜誌與底片主題"
Cohesion: 0.33
Nodes (4): ImprintMono font (IBM Plex Mono digit subset), <Print> photo component, themes.js (theme data, COLOR_TOKENS, knobs), useCollectionTheme hook / ThemeProvider

### Community 42 - "安靜的配色原則"
Cohesion: 0.33
Nodes (4): Are.na, Contrast Check Script, Editorial Palette (ink, paper, single blue accent), WCAG AA Accessibility

### Community 43 - "資料保存與備份動機"
Cohesion: 0.40
Nodes (5): LINE Keep, Pocket (shut down), R15 Export and Backup ZIP, Service Shutdown Data Loss (A9), Phase 3: Export/Import Backup

### Community 44 - "分享入口（網頁替身）"
Cohesion: 0.67
Nodes (3): initialShare(), listeners, useShareIntent()

## Knowledge Gaps
- **32 isolated node(s):** `Share Menu Entry Point`, `Use expo install for Dependencies`, `EAS Build/Submit/Update`, `Lint and Typecheck Before Done`, `make_imprint_font.py Rebuild Script` (+27 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 256 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useCollectionTheme()` connect `收藏介面元件` to `翻翻滑卡邏輯`, `主題與字型`, `App 殼層`, `介面雛形`, `批次選取邏輯`, `快速收藏面板`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `Share Menu Entry Point`, `Use expo install for Dependencies`, `EAS Build/Submit/Update` to the rest of the system?**
  _32 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `收藏介面元件` be split into smaller, more focused modules?**
  _Cohesion score 0.0541701887855734 - nodes in this community are weakly interconnected._
- **Why does `react` connect `收藏介面元件` to `收藏資料模型與匯入`, `貼文讀取器`, `自動備份排程`, `翻翻滑卡邏輯`, `主題與字型`, `App 殼層`, `介面雛形`, `批次選取邏輯`, `分享入口（網頁替身）`, `執行期依賴`, `package 中繼資料`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `收藏資料模型與匯入` be split into smaller, more focused modules?**
  _Cohesion score 0.06564364876385337 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `收藏介面元件` to `貼文讀取器`, `自動備份排程`, `翻翻滑卡邏輯`, `主題與字型`, `App 殼層`, `介面雛形`, `執行期依賴`, `package 中繼資料`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `貼文讀取器` be split into smaller, more focused modules?**
  _Cohesion score 0.0670762928827445 - nodes in this community are weakly interconnected._