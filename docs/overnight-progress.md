# 夜間工作進度紀錄（重置後從這裡接著做）

最後更新：2026-10-29（第一階段開發中途）

## 使用者交辦（2026-10-29 晚）
1. 跑一次第一階段正式版，輸出 APK。
2. 另一個 agent 上網搜尋類似 App 的功能與設計。✅ 完成：`/tmp/.../scratchpad/agents/research/competitors.md`
3. APK 做出來後完整測試。
4. 想還有什麼可以優化、讓使用者更直覺。
5. 多放幾個 agent 嘗試創新（視覺 / 整理與找回 / 收藏流程），各自在 `.claude/worktrees/agent-*`。
   三個都因為額度用完中途停止（進度保存在 worktree），額度恢復後用 SendMessage 讓它們繼續。
6. 第一階段做完後：設計第二、三階段，也做出 APK（參考 design-system 與 agent 情資）。

使用者回饋要納入：
- 字體要有一點手寫感但不明顯 → 已選 霞鶩文楷 TC（OFL），子集化放在 `app/assets/fonts/`，用在標題與貼文文字。
- 滑動「有種說不上來的感覺」→ 已做：卡片按壓延遲 90ms（滑動時不縮）、expo-image recyclingKey（避免閃前一張圖）、FlashList drawDistance。視覺方向交給 visual agent 探索。
- 縮圖不要模糊 → 收藏時把原始解析度封面存到手機（`collection/covers.js`）。

## 第一階段狀態
已寫好（未提交前的最後狀態）：
- 資料層：`src/collection/repo.js`（SQLite / 記憶體兩種實作，contract tests 用 node:sqlite）、`collectionModel.js`、`store.js`（CollectionProvider：預設標籤、舊下載紀錄遷移、讀取中續傳、重複合併、刪除可復原）、`fetcher.js`（隱藏 WebView 讀貼文）、`covers.js`。
- web 版替身（給自動化 E2E 測試）：`*.web.js`（fetcher / covers / openRepo / fonts / useDownloader）。
- 畫面：`App.js` 改成卡片牆首頁；`ui/AppSheets.js`（登入、貼上連結、下載挑選、下載狀態膠囊、更新提示、設定）；PostCard / PostDetail / SaveSheet 接上真資料。
- 架構決定：第一階段不換 Expo Router（分享選單整合風險高、無法實機測），用覆蓋層切換畫面；之後階段再搬。

待辦：
1. `npx expo lint`、`npm test` 修到全過。
2. 刪掉不再使用的舊 UI（`src/ui/components.js`、HistoryList、PickerSheet、UpdateCard、LoginSheet、theme）。
3. prototype 的假資料格式（media.image）跟新 PostCard（cover / poster）對齊，`npm run prototype:web` 要能建。
4. web E2E：`EXPO_PUBLIC_?` 不需要，web 版自動用 *.web.js 替身；用 Playwright 跑：貼連結收藏 → 選標籤 → 篩選 → 內容頁 → 下載 → 刪除/復原 → 重複收藏 → 登入失敗卡片。
5. 建 APK（BUILD_NUMBER=5）：`cd app && CI=1 npx expo prebuild --platform android --clean --no-install`，寫 `android/local.properties`（sdk.dir=/root/android-sdk），`./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a`。Gradle 走 Maven Central 鏡像（/root/.gradle/init.d/central-mirror.gradle）。
6. 嘗試軟體模擬器做開機冒煙測試（無 KVM，可能很慢）。
7. 第二、三階段設計＋APK；最後寫給使用者的總報告。
