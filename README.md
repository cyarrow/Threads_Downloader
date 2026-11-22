# Threads_Downloader
For user to download any media from THREADS. Co-Work with CLAUDE.

一鍵把 Threads 貼文裡的影片和圖片存到相簿的 App（Expo / React Native）。

## 使用方式

**收藏**
1. 在 Threads 貼文點「分享」→ 選「Threads 下載」，或在 App 右上角按 ＋ 貼上連結。
2. 跳出儲存面板：點一下建議的標籤就完成（快速面板），或展開選更多標籤、加一句筆記。
3. 貼文會在背景讀好；從 Threads 分享的，讀完（最多等 5 秒）會自動回到 Threads。

**三個分頁**
- **翻翻**：一張一張翻過去，左右滑標記、上滑精選；也用來整理未分類的收藏。
- **收藏**：卡片牆，依兩層標籤篩選、搜尋、批次選取（改標籤、精選、下載、刪除）、作者頁。
- **串流**：像動態時報一樣直接看貼文和影片。

**其他**
- 標籤分大標籤與小標籤；可設「自動標籤規則」（依作者或關鍵字）和個人筆記。
- 貼文可下載到相簿的「Threads」資料夾（多張圖片或影片的貼文會先讓你勾選）。
- 主題有「雜誌」與「底片」兩種，並支援深色模式。
- 備份：設定裡可匯出／匯入收藏，也可選一個資料夾每天自動備份。
- 有新版本時收藏頁上方會出現提示，按「下載並安裝」就會在 App 內下載、檢查檔案並開啟安裝畫面。
- 第一次遇到需要登入的貼文時會跳出登入頁，登入狀態只存在手機上。

## 下載安裝檔

最新版 APK 在 [Releases](https://github.com/cyarrow/Threads_Downloader/releases/latest)。每次合併到 `main`，GitHub Actions 都會自動測試、建置並發佈新版本（標籤 `build-<編號>`）。

## 運作方式

```
Threads「分享」/ 貼上連結（支援 /@user/post/…、/t/…、/share/… 連結）
        │
        ▼
隱藏的 WebView（一直開著重複使用）以使用者自己登入的 Threads 帳號開啟貼文，一次讀一篇
        │  注入腳本：頁面一解析完就收集內嵌的 JSON 與 <video> 來源
        ▼
src/threads.js 找出對應貼文 → 作者、內文、每個項目的最高畫質網址與縮圖
        │
        ▼
存進手機上的 SQLite（卡片、標籤、規則、筆記）；封面圖存在 App 的資料夾
        │
        ▼（要下載時）勾選項目 → expo-file-system 下載 → expo-media-library 存進「Threads」相簿
```

- Threads 未登入時貼文頁面不含媒體資料，所以需要登入一次。
- 不需要後端伺服器或 API 金鑰。資料都在手機上，沒有雲端同步。

## 專案結構

| 路徑 | 用途 |
| --- | --- |
| `app/App.js` | 外殼：三個分頁、共用的面板與提示、下載、返回鍵 |
| `app/src/collection/store.js` | 收藏的資料與動作（SQLite、讀取排隊、封面、標籤、規則、備份） |
| `app/src/collection/repo.js` | SQLite 存取（寫入逐筆排隊），另有網頁測試用的記憶體版 |
| `app/src/collection/fetcher.js`、`fetchQueue.js`、`fetchHealth.js` | 讀取貼文：WebView、優先順序、失敗原因判斷 |
| `app/src/collection/ui/` | 畫面元件：收藏牆、翻翻、串流、詳情、儲存面板、設定、標籤管理等 |
| `app/src/collection/themes.js`、`tokens.js` | 兩套主題與設計權杖 |
| `app/src/threads.js`、`injected.js` | 連結解析、從頁面 JSON 找貼文、注入 WebView 的腳本 |
| `app/src/useDownloader.js`、`download.js` | 下載到相簿的流程 |
| `app/src/useAppUpdate.js`、`apkInstaller.js`、`updates.js` | App 內更新 |
| `app/*.web.js`（各處） | 瀏覽器測試用的替身（假的讀取、記憶體資料庫等） |
| `app/test/`、`app/e2e/` | 單元測試、瀏覽器端到端測試（見 `app/e2e/README.md`） |
| `design-system/threads-collection/` | 設計規範（MASTER.md）與各頁面規格 |
| `.github/workflows/android.yml` | 自動測試、建置 APK、發佈 Release |

無障礙：文字對比度符合 WCAG AA（≥ 4.5:1），可點擊區域至少 44×44，圖示附螢幕閱讀器標籤，遵循系統的深色模式與「減少動態效果」。

## 開發

```bash
cd app
npm install
npm test               # 單元測試
npm run lint           # ESLint 檢查整個 app/（單打 npx expo lint 只會檢查 src/）
npm run e2e            # 瀏覽器端到端測試（需要 Chromium，見 app/e2e/README.md）
npx expo run:android   # 含原生模組，需要 development build，無法用 Expo Go
```

### 簽章

目前的 APK 用 Expo 範本附的 debug 金鑰簽署，所以新版可以直接覆蓋安裝；工作流程會檢查這把金鑰沒有變。若想改用自己的金鑰，在 repo 的 Settings → Secrets and variables → Actions 新增 `ANDROID_KEYSTORE_BASE64`、`ANDROID_KEYSTORE_PASSWORD`、`ANDROID_KEY_ALIAS`、`ANDROID_KEY_PASSWORD`。換金鑰後需要先解除安裝舊版一次。

## 注意

請只下載你有權保存的內容，並遵守 Threads 服務條款與著作權規範。
