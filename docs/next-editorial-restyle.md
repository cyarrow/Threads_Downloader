# 下一步：改成「雜誌」風格（使用者 2026-10-30 決定）

## 來源
- 視覺 agent 的 worktree：`.claude/worktrees/agent-acd11e8a117f64f8f`，分支 `worktree-agent-acd11e8a117f64f8f`，commit `50ee945`（建在 `a397b0e` 雛形之上，不是建在正式版上）。
- 可點的比較頁：https://claude.ai/artifact/DyG87Vk2Prgpx1B7Tp9X7R（選「雜誌」）。
- agent 報告重點已整理在 `docs/overnight-report.md`。

## 要搬過來的東西（從 worktree 參考，移植到正式版 `app/src/collection/`）
- 色票：worktree 的 `app/src/collection/directions.json` 裡的 editorial（淺色 `#F7F6F2` 底、墨字 `#1E1D1A`、次要字 `#5E5B53`、唯一強調色藍 `#2E4E8F`；深色 `#161615` / `#EDEBE6` / `#A9A69E` / `#9DB7EA`）＋低彩度標籤色。對比檢查：worktree 的 `design-system/threads-collection/contrast_check_directions.py`。
- 卡片：worktree 的 `app/src/collection/ui/cards/EditorialCard.js`、`cards/shared.js`。版面：圖（無框、圖上無角標）→ 欄目標（標籤色小方塊＋標籤名）→ 三行文楷內文 → 資訊列（@handle、▶ 影片、N 張、已下載、已刪除改成文字）→ 細線。純文字貼文開頭一個標籤色大「「」。
- 頂部報頭：小字「THREADS 收藏誌 · N 篇」＋「收藏」＋一條粗線。
- 標籤膠囊：細框方角＋顏色小方塊；選取時填墨色並加 ✓。
- FAB：有文字的「＋ 收藏連結」。
- 推薦再借：小卡風格的「標籤色實心文字卡」（純文字貼文）。

## 正式版現況（不要弄壞）
- 正式版元件：`app/src/collection/ui/`（PostCard、CardWall、TagFilterBar、SaveSheet、PostDetail、AppSheets、Phase2、base、Overlays），tokens 在 `app/src/collection/tokens.js`、`palette.js`。
- 字體已是霞鶩文楷 TC 子集（`app/assets/fonts/`），雜誌風格沿用即可。
- 已有的手感修正要保留：按壓延遲 120ms、expo-image recyclingKey、getItemType、drawDistance。
- 驗證方式：`cd app && npm test`（73 個）、`npx expo lint`、`npx expo export --platform web --output-dir dist` 後跑 scratchpad 的 `e2e_full.cjs`（27 項）；建 APK 用 BUILD_NUMBER=7（步驟見 `docs/overnight-progress.md`）。
- 改完要更新 `design-system/threads-collection/MASTER.md` §2 色票與 §12 對比檢查紀錄。

## 狀態（2026-10-30）
已完成：色票、標籤膠囊、雜誌卡片（含標籤色文字卡）、報頭、「＋ 收藏連結」FAB、MASTER §0/§2/§3/§4/§9/§12 與 pages/card-wall.md。
驗證：`npm test` 73 過、lint 無錯、`contrast_check.py` 128 組 0 失敗、網頁端完整流程淺色 / 深色同改版前（只剩已知的「新標籤自動勾選」判斷失準，以及 GitHub API 對更新檢查限流）。APK build 7。
