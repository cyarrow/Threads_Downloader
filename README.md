# Threads_Downloader
For user to download any media from THREADS. Co-Work with CLAUDE.

一鍵把 Threads 貼文裡的影片和圖片存到相簿的 App（Expo / React Native）。

## 使用方式

1. 在 Threads 貼文點「分享」→ 選「Threads 下載」
2. App 開啟並自動下載，完成後影片和圖片就在相簿裡

也可以在 App 裡按「貼上連結並下載」，或手動貼上連結。第一次遇到需要登入的貼文時，會自動跳出登入頁，登入後自動繼續下載。

## 運作方式

```
Threads「分享」/ 貼上連結（支援 /@user/post/…、/t/…、/share/… 連結）
        │
        ▼
隱藏的 WebView 以使用者自己登入的 Threads 帳號開啟貼文
        │  注入腳本：等 /share/ 連結轉到 /post/<code>，收集頁面內嵌的 JSON 與 <video> 來源
        ▼
src/threads.js 找出對應貼文 → 挑選最高畫質的影片 / 圖片（輪播貼文全部下載）
        │
        ▼
expo-file-system 下載 → expo-media-library 存進相簿
```

- Threads 未登入時貼文頁面不含媒體資料，所以需要登入一次（登入狀態只存在手機上）。
- 不需要後端伺服器或 API 金鑰。

## 專案結構

| 檔案 | 用途 |
| --- | --- |
| `app/App.js` | 主畫面：連結輸入、狀態卡片、分享選單進入點、隱藏 WebView |
| `app/src/useDownloader.js` | 下載流程狀態機（讀取 → 下載 → 完成 / 錯誤） |
| `app/src/threads.js` | 純邏輯：連結解析、登入判斷、從頁面 JSON 找貼文、挑選最佳畫質、檔名 |
| `app/src/injected.js` | 注入 WebView 的收集腳本 |
| `app/src/download.js` | 下載並存入相簿 |
| `app/src/ui/` | 介面元件：主題（淺色 / 深色）、彈簧動畫、按鈕、狀態卡片、登入頁 |
| `app/test/threads.test.mjs` | 擷取邏輯的單元測試 |

介面依照 Apple 的設計原則：按下即回饋、臨界阻尼彈簧動畫、單一主要動作、狀態一律可見、成功 / 失敗才給觸覺回饋、遵循系統的深色模式與「減少動態效果」設定。

## 開發

```bash
cd app
npm install
npm test               # 單元測試
npx expo lint
npx expo run:android   # 或 run:ios；含原生模組，需要 development build，無法用 Expo Go
```

雲端建置安裝檔：`npx eas-cli@latest build --platform android --profile preview`（需 Expo 帳號）。

## 注意

請只下載你有權保存的內容，並遵守 Threads 服務條款與著作權規範。
