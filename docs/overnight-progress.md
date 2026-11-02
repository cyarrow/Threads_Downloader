# 夜間工作進度紀錄（重置後從這裡接著做）

最後更新：2026-10-30（第一～三階段完成，報告見 docs/overnight-report.md）

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

## 2026-10-30 更新
- 第一階段完成並測試（APK build 5）；第二、三階段完成並測試（APK build 6）。
- 三個創新 agent 與研究 agent 都已完成；整理成 `docs/overnight-report.md`。
- 視覺方向比較頁：https://claude.ai/artifact/DyG87Vk2Prgpx1B7Tp9X7R
- 待使用者決定：視覺方向、快速面板／直接收藏、批次選取、合併到 main。

## 2026-11-02 晚（使用者去睡覺，做完再回報）
- 已合併並推送：讀取失敗提醒、雜誌風格延伸、快速收藏面板＋標籤跳動修正、自動備份、播放鍵置中、同時只播一支影片。APK build 8 已給使用者（不含影片修正）。
- 進行中（兩個 agent，base ef847a8）：
  1. `worktree-agent-a3a664c0a67ea8f64`：底部分頁 翻翻｜收藏｜串流、＋移到右上、「所有標籤 ›」、翻翻滑卡（右＝精選、左＝下一張、上＝加標籤；未分類＝整理模式）、串流單欄。可能改用 Expo Router（注意 expo-share-intent 設定）。
  2. `worktree-agent-a659b2f195e65b8f7`：主題系統（雜誌／底片），設定裡切換；底片＝相片白邊＋收藏日期印字、無編號、齒孔報頭；深色可讀性硬性要求。
- 兩個都完成後：合併 → 把底片套到新的分頁畫面（翻翻／串流／所有標籤／CardWall 報頭）→ 用 `/anthropic-skills:ui-ux-pro-max` 檢查並修正 → 全部測試 → APK build 9 → 回報使用者。
- 預覽：https://claude.ai/artifact/7zKzMLyGXQ1r2owkjrKEDr
