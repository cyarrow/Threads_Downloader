# Graph Report - Threads_Downloader  (2026-10-30)

## Corpus Check
- Corpus is ~33,007 words - fits in a single context window. You may not need a graph.

## Summary
- 590 nodes · 1371 edges · 34 communities (25 shown, 9 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.82)
- Token cost: 124,660 input · 0 output

## Community Hubs (Navigation)
- App 殼層與畫面切換
- 收藏資料模型與備份
- 第二三階段功能規格
- 貼文抓取與下載
- Android CI 建置
- Expo 開發守則與專案說明
- 設計系統總綱
- Expo app.json 設定
- 執行期依賴（UI/媒體）
- 回顧推薦 rediscover
- package 中繼與系統依賴
- 批次選取與標籤差異
- 雜誌風格色票與移植
- 收藏牆版面規格
- 字體與授權
- 備份檔案 I/O
- 假資料 mock
- 智慧標籤建議
- 收藏面板與標籤膠囊
- 貼文內容頁規格
- ESLint 設定
- npm scripts
- 對比檢查工具
- 雜誌報頭與 FAB
- 入口與發版簽章
- 品牌字體載入（web）
- expo-image
- expo-linking
- expo-share-intent
- expo-sqlite
- FlashList

## God Nodes (most connected - your core abstractions)
1. `Design System Master — Threads 收藏` - 49 edges
2. `useCollectionTheme()` - 48 edges
3. `競品研究：Threads 收藏` - 38 edges
4. `Home()` - 34 edges
5. `react` - 19 edges
6. `CollectionProvider()` - 19 edges
7. `下一步：改成雜誌風格` - 19 edges
8. `react-native` - 16 edges
9. `tagLabel()` - 15 edges
10. `PostDetail()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `fetcher.js（隱藏 WebView 讀貼文）` --semantically_similar_to--> `隱藏 WebView 以登入帳號抓取貼文`  [INFERRED] [semantically similar]
  docs/overnight-progress.md → README.md
- `Pinterest board → section 兩層` --semantically_similar_to--> `兩層、可多選、可自建標籤`  [INFERRED] [semantically similar]
  docs/agent-reports/competitors.md → design-system/threads-collection/MASTER.md
- `夜間工作進度紀錄` --references--> `App()`  [EXTRACTED]
  docs/overnight-progress.md → app/App.js
- `README — Threads_Downloader` --references--> `App()`  [EXTRACTED]
  README.md → app/App.js
- `整頁只有一個主要按鈕（下載到相簿 / 再次下載）` --semantically_similar_to--> `Apple 設計原則（臨界阻尼彈簧、狀態可見、觸覺只給成功/失敗）`  [INFERRED] [semantically similar]
  design-system/threads-collection/pages/post-detail.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **雜誌風格改版（色票、報頭、標籤膠囊、FAB、卡片）** — design_system_threads_collection_master_editorial_magazine_direction, design_system_threads_collection_master_semantic_color_tokens, design_system_threads_collection_master_masthead, design_system_threads_collection_master_tag_chip_style, design_system_threads_collection_master_fab_save_link, docs_next_editorial_restyle_editorial_restyle_plan, docs_next_editorial_restyle_editorial_card [EXTRACTED 1.00]
- **先存後整理流程（面板即存、未分類、整理未分類、智慧建議）** — docs_agent_reports_competitors_save_first_organize_later, design_system_threads_collection_pages_save_sheet_already_saved_on_open, design_system_threads_collection_master_uncategorized_bucket, design_system_threads_collection_pages_phase_2_3_triage_uncategorized, design_system_threads_collection_pages_phase_2_3_smart_tag_suggestions [INFERRED 0.85]
- **資料保存護城河（本機封面、匯出備份、服務關閉教訓）** — docs_agent_reports_competitors_local_copy_moat, docs_overnight_progress_collection_covers, design_system_threads_collection_pages_phase_2_3_json_backup_export_import, docs_agent_reports_competitors_pocket_shutdown, docs_agent_reports_competitors_line_keep_shutdown, docs_agent_reports_competitors_r15_export_backup [INFERRED 0.85]

## Communities (34 total, 9 thin omitted)

### Community 0 - "App 殼層與畫面切換"
Cohesion: 0.08
Nodes (96): App(), Home(), leaveToThreads(), Root(), styles, systemToast(), Banner(), Prototype() (+88 more)

### Community 1 - "收藏資料模型與備份"
Cohesion: 0.06
Nodes (39): BACKUP_APP, BACKUP_VERSION, makeBackup(), parseBackup(), planImport(), DEFAULT_TAGS, fetchedFields(), mergeTags() (+31 more)

### Community 2 - "第二三階段功能規格"
Cohesion: 0.05
Nodes (51): expo-sqlite 本機資料，標籤 parentId 兩層, 第二、三階段頁面規格, 回顧卡（N 年前的今天 / 好久沒看 / 隨機翻翻）, 搜尋也比對標籤名稱, 標籤管理（改名、換色、合併、刪除需確認）, 整理未分類（一次一篇、56dp 大按鈕、無滑動）, 收藏面板版面（底部面板最高 85%）, 競品研究：Threads 收藏 (+43 more)

### Community 3 - "貼文抓取與下載"
Cohesion: 0.10
Nodes (30): styles, usePostFetcher(), img, SAMPLES, usePostFetcher(), FetchError, findAlbum(), saveAll() (+22 more)

### Community 4 - "Android CI 建置"
Cohesion: 0.05
Nodes (43): defaults, env, runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group (+35 more)

### Community 5 - "Expo 開發守則與專案說明"
Cohesion: 0.11
Nodes (18): app/AGENTS.md — Expo agent guidelines, Development build（原生模組不能用 Expo Go）, EAS Build / Submit / Update, npx expo install（解析 SDK 相容版本）, Expo Router（src/app/ 路由）, 無障礙重點（對比、非唯一顏色線索、閱讀順序）, 建議下一步（視覺方向、快速面板、合併到 main、Expo Router）, README — Threads_Downloader (+10 more)

### Community 6 - "設計系統總綱"
Cohesion: 0.12
Nodes (17): Design System Master — Threads 收藏, 反模式清單（emoji 圖示、照片角標、第二強調色、讚數…）, 產品類型 #114 Bookmark & Read-Later, 深層連結 threadsdownloader://post/<code>, expo-image（快取、本機小縮圖）, react-native-gesture-handler 面板手勢, Ionicons（@expo/vector-icons），outline/filled 規則, Minimalism & Swiss + Flat 風格（次要 Editorial Grid） (+9 more)

### Community 7 - "Expo app.json 設定"
Cohesion: 0.09
Nodes (21): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, expo, android (+13 more)

### Community 8 - "執行期依賴（UI/媒體）"
Cohesion: 0.13
Nodes (15): dependencies, expo-clipboard@~58.0.4, expo-status-bar@~58.0.4, expo-system-ui@~58.0.6, @expo/vector-icons@^15.0.2, expo-video@~58.0.13, react@19.3.0, react-native@0.88.0 (+7 more)

### Community 9 - "回顧推薦 rediscover"
Cohesion: 0.29
Nodes (11): ageLabel(), dayKey(), isBrowsable(), isLeap(), onThisDay(), pickRediscover(), randomPicks(), rng() (+3 more)

### Community 10 - "package 中繼與系統依賴"
Cohesion: 0.15
Nodes (12): expo-constants@~58.0.13, expo-haptics@~58.0.7, expo-media-library@~58.0.12, react-dom@19.3.0, main, name, private, version (+4 more)

### Community 11 - "批次選取與標籤差異"
Cohesion: 0.28
Nodes (11): applyTagDiff(), cycleState(), diffStates(), pruneSelection(), removePosts(), restorePosts(), splitDownloadable(), tagCounts() (+3 more)

### Community 12 - "雜誌風格色票與移植"
Cohesion: 0.18
Nodes (9): TAG_HUES, 語意色票（background/card/foreground/accent…）, 下一步：改成雜誌風格, contrast_check_directions.py, directions.json editorial 色票, EditorialCard.js / cards/shared.js, 雜誌風格移植計畫, 驗證：npm test 73、lint、web e2e 27 項、APK build 7 (+1 more)

### Community 13 - "收藏牆版面規格"
Cohesion: 0.18
Nodes (11): 空狀態（無收藏 / 篩選無結果）, FlashList masonry＋overrideItemLayout span 精選整排, PostCard 元件規格（media/quote/featured 變體與狀態）, 介面雛形 app/prototype/PrototypeApp.js, TagFilterBar 規格（換行最多兩行、+N、兩層、多選聯集）, 兩層、可多選、可自建標籤, 收藏牆（首頁）頁面規格, 卡片狀態（讀取中骨架呼吸、讀取失敗重試、已刪除、已下載） (+3 more)

### Community 14 - "字體與授權"
Cohesion: 0.25
Nodes (8): SIL Open Font License 1.1 (LXGW WenKai TC), LXGW WenKai Project Authors, Reserved Font Name 限制, SIL Open Font License 1.1, Fonts README, 霞鶩文楷 TC 子集（WenKaiTC-Regular/Bold）, fontTools pyftsubset 子集化, 第一階段：收藏成為主畫面（APK build 5）

### Community 15 - "備份檔案 I/O"
Cohesion: 0.25
Nodes (8): expo-document-picker@~58.0.4, expo-file-system@~58.0.11, expo-sharing@~58.0.21, backupFileName(), shareBackup(), expo-document-picker, expo-file-system, expo-sharing

### Community 16 - "假資料 mock"
Cohesion: 0.25
Nodes (8): img, INCOMING, normalize(), now, POSTS, RAW_INCOMING, RAW_POSTS, TAGS

### Community 17 - "智慧標籤建議"
Cohesion: 0.33
Nodes (6): keywordHit(), KEYWORDS, reasonText(), suggestTags(), index, posts

### Community 18 - "收藏面板與標籤膠囊"
Cohesion: 0.22
Nodes (9): 觸覺回饋只在收藏成功、出錯、長按, 標籤膠囊：細框方角＋8×8 色方塊、已選填墨色加 ✓, 標籤色票（rose…slate，低彩度）, TagChip 元件規格（choice/display）, 收藏面板頁面規格, 同時下載到相簿開關（記住上次選擇）, 「完成」→ 觸覺＋提示 → 自動回 Threads, 「+ 新增標籤」原地輸入、選上層與顏色 (+1 more)

### Community 19 - "貼文內容頁規格"
Cohesion: 0.22
Nodes (5): 互動（點卡推入內容頁、長按選單、下拉重整、保留捲動）, 貼文內容頁頁面規格, 媒體輪播（本頁唯一水平滑動，有頁碼與指示點）, 貼文內容頁版面（媒體輪播、完整內文、標籤、底部動作區）, 原貼文已刪除：本機縮圖＋下載停用

### Community 20 - "ESLint 設定"
Cohesion: 0.29
Nodes (7): { defineConfig }, expoConfig, devDependencies, eslint@^9.0.0, eslint-config-expo@~58.0.4, eslint, eslint-config-expo

### Community 21 - "npm scripts"
Cohesion: 0.25
Nodes (8): scripts, android, ios, lint, prototype:web, start, test, web

### Community 22 - "對比檢查工具"
Cohesion: 0.39
Nodes (6): check(), cr(), hx(), lum(), over(), 對比驗證紀錄（128 組 FAILS: 0）

### Community 23 - "雜誌報頭與 FAB"
Cohesion: 0.29
Nodes (5): FAB「＋ 收藏連結」, 報頭「THREADS 收藏誌 · N 篇」＋「收藏」＋2px 粗線, 收藏牆版面（報頭、搜尋、標籤列、瀑布流、FAB）, 延後功能（批次選取、作者頁、Sharing Shortcuts…）, 批次選取（三態標籤）雛形

### Community 24 - "入口與發版簽章"
Cohesion: 0.33
Nodes (3): expo@~58.0.19, { withAppBuildGradle }, expo

## Knowledge Gaps
- **31 isolated node(s):** `下載紀錄（history.js / historyModel.js）`, `EAS Build / Submit / Update`, `npx expo install（解析 SDK 相容版本）`, `Development build（原生模組不能用 Expo Go）`, `LXGW WenKai Project Authors` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 166 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `下一步：改成雜誌風格` connect `雜誌風格色票與移植` to `App 殼層與畫面切換`, `第二三階段功能規格`, `設計系統總綱`, `收藏牆版面規格`, `對比檢查工具`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **What connects `下載紀錄（history.js / historyModel.js）`, `EAS Build / Submit / Update`, `npx expo install（解析 SDK 相容版本）` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App 殼層與畫面切換` be split into smaller, more focused modules?**
  _Cohesion score 0.07576463282099052 - nodes in this community are weakly interconnected._
- **Why does `Design System Master — Threads 收藏` connect `設計系統總綱` to `第二三階段功能規格`, `Expo 開發守則與專案說明`, `雜誌風格色票與移植`, `收藏牆版面規格`, `收藏面板與標籤膠囊`, `貼文內容頁規格`, `對比檢查工具`, `雜誌報頭與 FAB`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Should `收藏資料模型與備份` be split into smaller, more focused modules?**
  _Cohesion score 0.06349206349206349 - nodes in this community are weakly interconnected._
- **Why does `競品研究：Threads 收藏` connect `第二三階段功能規格` to `收藏面板與標籤膠囊`, `收藏牆版面規格`, `設計系統總綱`, `雜誌報頭與 FAB`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Should `第二三階段功能規格` be split into smaller, more focused modules?**
  _Cohesion score 0.0546448087431694 - nodes in this community are weakly interconnected._