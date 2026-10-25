# Threads_Downloader
For user to download any media from THREADS. Co-Work with CLAUDE.

一鍵把 Threads 貼文裡的影片和圖片存到相簿的 App（Expo / React Native）。

## 使用方式

1. 在 Threads 貼文點「分享」→ 選「Threads 下載」
2. 存好後會跳出提示並自動回到 Threads；檔案在相簿的「Threads」資料夾

- 多張圖片 / 影片的貼文會先讓你勾選要下載哪幾項（預設全選）。
- App 首頁有「最近下載」：點一下在 Threads 開啟該貼文，按 ↓ 重新下載。
- 也可以在 App 裡按「貼上連結並下載」，或手動貼上連結。
- 第一次遇到需要登入的貼文時會跳出登入頁，登入後自動繼續下載。
- 有新版本時首頁會出現「有新版本」，按「下載更新」即可覆蓋安裝。

## 下載安裝檔

最新版 APK 在 [Releases](https://github.com/cyarrow/Threads_Downloader/releases/latest)。每次合併到 `main`，GitHub Actions 都會自動建置並發佈新版本（標籤 `build-<編號>`）。

## 運作方式

```
Threads「分享」/ 貼上連結（支援 /@user/post/…、/t/…、/share/… 連結）
        │
        ▼
隱藏的 WebView 以使用者自己登入的 Threads 帳號開啟貼文
        │  注入腳本：等 /share/ 連結轉到 /post/<code>，收集頁面內嵌的 JSON 與 <video> 來源
        ▼
src/threads.js 找出對應貼文 → 作者、內文、每個項目的最高畫質網址與縮圖
        │
        ▼
（輪播貼文）勾選項目 → expo-file-system 下載 → expo-media-library 存進「Threads」相簿
```

- Threads 未登入時貼文頁面不含媒體資料，所以需要登入一次（登入狀態只存在手機上）。
- 不需要後端伺服器或 API 金鑰。

## 專案結構

| 檔案 | 用途 |
| --- | --- |
| `app/App.js` | 主畫面：連結輸入、狀態卡片、下載紀錄、更新提示、分享選單進入點、隱藏 WebView |
| `app/src/useDownloader.js` | 下載流程狀態機（讀取 → 挑選 → 下載 → 完成 / 錯誤） |
| `app/src/threads.js` | 純邏輯：連結解析、登入判斷、從頁面 JSON 找貼文、挑選最佳畫質與縮圖、檔名 |
| `app/src/injected.js` | 注入 WebView 的收集腳本 |
| `app/src/download.js` | 下載並存入「Threads」相簿 |
| `app/src/history.js`、`historyModel.js` | 下載紀錄的儲存與純邏輯 |
| `app/src/updates.js` | 比對 GitHub 最新 Release 判斷是否有更新 |
| `app/src/ui/` | 介面元件：主題、彈簧動畫、狀態卡片、下載紀錄、挑選頁、登入頁、更新提示 |
| `app/plugins/withReleaseSigning.js` | 有提供金鑰時，用自己的金鑰簽署 release 版 |
| `app/test/` | 單元測試 |
| `.github/workflows/android.yml` | 自動測試、建置 APK、發佈 Release |

介面依照 Apple 的設計原則：按下即回饋、臨界阻尼彈簧動畫、單一主要動作、狀態一律可見、成功 / 失敗才給觸覺回饋、遵循系統的深色模式與「減少動態效果」設定。

## 開發

```bash
cd app
npm install
npm test               # 單元測試
npx expo lint
npx expo run:android   # 或 run:ios；含原生模組，需要 development build，無法用 Expo Go
```

### 簽章

目前的 APK 用 Expo 範本附的 debug 金鑰簽署，所以新版可以直接覆蓋安裝；工作流程會檢查這把金鑰沒有變。若想改用自己的金鑰，在 repo 的 Settings → Secrets and variables → Actions 新增 `ANDROID_KEYSTORE_BASE64`、`ANDROID_KEYSTORE_PASSWORD`、`ANDROID_KEY_ALIAS`、`ANDROID_KEY_PASSWORD`。換金鑰後需要先解除安裝舊版一次。

## 注意

請只下載你有權保存的內容，並遵守 Threads 服務條款與著作權規範。
