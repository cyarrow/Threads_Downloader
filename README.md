# Threads_Downloader
For user to download any media from THREADS. Co-Work with CLAUDE.

一個「複製連結 → 打開 App → 自動存進相簿」的 Threads 影片/圖片下載 App（Expo / React Native，iOS 與 Android 共用一份程式碼）。

## 運作方式

```
Threads App 複製貼文連結
        │
        ▼
本 App 回到前景 → 讀剪貼簿 → 解析出貼文代碼 (shortcode)
        │
        ▼
App 內建 WebView（使用者自己登入的 Threads 帳號）開啟該貼文
        │  注入腳本，收集頁面內嵌的 JSON 與 <video> 來源
        ▼
src/threads.js 找出對應貼文 → 挑選最高畫質的影片 / 圖片（輪播貼文全部下載）
        │
        ▼
expo-file-system 下載 → expo-media-library 存進相簿
```

- Threads 未登入時，貼文頁面不會包含媒體資料，所以第一次使用需按「登入 Threads」在 App 內登入一次（Cookie 會保留）。
- App 只讀取你自己的瀏覽階段已經載入的內容，不需要後端伺服器、也不需要任何 API 金鑰。

## 專案結構

| 檔案 | 用途 |
| --- | --- |
| `app/App.js` | 單一畫面：輸入框、下載 / 登入按鈕、狀態文字、WebView（UI 先保持最陽春） |
| `app/src/threads.js` | 純邏輯：連結解析、從頁面 JSON 找貼文、挑選最佳畫質、檔名 |
| `app/src/injected.js` | 注入 WebView 的收集腳本 |
| `app/src/download.js` | 下載並存入相簿 |
| `app/test/threads.test.mjs` | 擷取邏輯的單元測試 |

## 開發

```bash
cd app
npm install
npm test               # 單元測試
npx expo lint
npx expo run:android   # 或 run:ios；react-native-webview 等原生模組需要 development build，無法用 Expo Go
```

雲端建置安裝檔：`npx eas-cli@latest build --platform android --profile preview`（需 Expo 帳號）。

## 待辦 / 下一步

- **分享選單一鍵下載**：加入 `expo-share-intent`，讓使用者在 Threads 內直接「分享 → Threads Downloader」，連複製都省掉。
- **前端 UI 設計**：目前刻意不做。
- Threads 頁面結構若改版，只需調整 `src/threads.js`，測試會告訴你哪裡壞了。

## 注意

請只下載你有權保存的內容，並遵守 Threads 服務條款與著作權規範。
