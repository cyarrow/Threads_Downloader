# 競品研究：Threads 收藏（個人貼文收藏工具）

- 研究日期：2026-10-29
- 範圍：書籤 / 稍後讀 / 視覺收藏 / 情緒板 App、社群平台內建「收藏」、台日韓的粉絲與收藏工具
- 對照規格：`design-system/threads-collection/MASTER.md`、`pages/save-sheet.md`、`pages/card-wall.md`

> **怎麼看可信度**
> - 每項說法後面都附上來源網址。來源是**廠商自家網站或部落格**（Dewey、ContextBolt、saner.ai 這類同時在賣競品的）會標「（廠商來源）」。
> - 標「（推論）」或「（猜測）」的是我自己的判斷，沒有直接來源。
> - 沒能直接打開的頁面：`better.raindrop.io`（這個環境的網路擋掉了）、Google Play 商店頁（404）、alternativeto.net 與 apkmirror 部分頁面（403）。這些頁面的內容只能從搜尋摘要轉述，引用時會註明「（搜尋摘要）」。
> - 沒有找到 PTT／Dcard 上直接討論「收藏整理 App」的討論串。台灣使用者行為主要依據數位時代與 TVBS 的報導。

---

## 0. 重點摘要

1. **Threads 內建的收藏只是一整堆，不能分類**，台灣使用者在用土法整理：到貼文底下留言「存」當書籤、開「一人群組」照主題轉傳、存到 iPhone 備忘錄（[數位時代 2026-09-15](https://www.bnext.com.tw/article/92244/threads-save-post-organize-tips)）。Instagram 收藏到 2026 年 8 月仍然**不能搜尋**（[Kontentino 2026-08-25，引述 Mosseri 7 月的問答](https://www.kontentino.com/q-and-a/search-instagram-saved-posts/)）。這正是我們的切入點。
2. **只存連結的書籤會「變空」**：原作者刪文，IG／Threads 的收藏就跟著消失（[ContextBolt](https://contextbolt.com/blog/instagram-saved-posts/)、[Dewey](https://getdewey.co/blog/how-to-use-saved-posts-threads/)，兩者皆為廠商來源）。Threads 在 2025-10-27 推出 24 小時限時貼文（ghost posts）（[GIGAZINE](https://gigazine.net/gsc_news/en/20251028-threads-disappearing-posts)）。Meta CDN 的圖片網址本身也會過期，到期時間寫在 `oe` 參數裡（[DEV](https://dev.to/alex97po/pre-signed-url-expiry-how-to-detect-when-your-media-urls-will-break-4g74)）。**「收藏時就把封面原圖和文字存在本機」是這個產品最重要的護城河。** mymind 在 2025-10 也做了同樣的事：IG 多圖貼文存成私人副本，原文刪了也看得到（[AlternativeTo，搜尋摘要](https://alternativeto.net/news/2025/10/mymind-introduces-saving-and-search-for-instagram-gallery-posts)）。
3. **「先存、之後再整理」是好產品的共同做法**。GoodLinks 有「快速儲存」開關（[MacStories](https://www.macstories.net/reviews/goodlinks-review-a-flexible-read-it-later-link-manager-packed-with-automation-options/)）。Raindrop 有 Unsorted 收件匣和「Without tags」篩選（[Raindrop 說明](https://help.raindrop.io/collections)）。Cosmos 在 2026-01 把「必須選 cluster」改成「直接存」（[Pulse2](https://pulse2.com/cosmos-15-million-series-a-closed-as-it-expands-social-discovery-and-attribution-features/)）。反過來，Pinterest 2026 年被大量抱怨「一定要選 board」（[Pinterest 社群](https://community.pinterest.biz/t/why-cant-i-post-pin-without-selecting-a-board/45707.md?page=3)）。我們規格中「面板出現時就已收藏」的方向是對的。
4. **服務關閉會連資料一起帶走，台灣使用者經歷過**：LINE Keep 雲端儲存在 2024-08-28 結束（[TVBS](https://supertaste.tvbs.com.tw/hot/348243)），Pocket 在 2025-07-08 關閉、之後刪除全部資料（[Engadget](https://www.engadget.com/apps/mozilla-is-shutting-down-its-read-it-later-app-pocket-183247576.html)）。資料存在本機加上可匯出，可以當成賣點寫出來。
5. **只收藏不回頭看，是這類產品最常見的失敗**。mymind 的 Serendipity（每次 2 分鐘，逐張選「保留／忘掉」）是評價最好的功能之一（[mymind 說明](https://mymind.helpscoutdocs.com/article/44-rediscovering-things-with-serendipity)、[Creative Boom](https://www.creativeboom.com/tools/why-mymind-is-the-visual-inspiration-tool-designers-have-been-crying-out-for/)）。
6. **AI 自動標籤目前還不可靠**：mymind 的自動標籤「對文章很好，其他類型常失準」，評論者最後還是手動加標籤（[Hyperquest](https://hyperquest.digitalpress.blog/how-mymind-fulfilled-and-fell-short-of-its-promise/)）。第一版用使用者自己的標籤，再加上「依作者建議」這類規則式建議就夠了。
7. **最接近的直接競品**：
   - **Choeae**：只有 iOS，K-pop 粉絲向，可以從 IG／Threads 分享收藏，做成相簿與拼貼（[hunted.space](https://hunted.space/product/choeae)）。
   - **Tget – Threads Downloader**：Android，分享就下載，會一起存內文與作者，可離線看；12.5 萬次以上安裝、4.79 星（[AppGoblin](https://appgoblin.info/apps/ru.codeluck.threads.downloader)）。
   - 兩者都沒有「兩層標籤＋卡片牆」這個組合。

---

## 1. 競品比較表

### 1.1 主要比較（12 個）

| 產品 | 收藏流程 | 整理模型 | 瀏覽與再發現 | 亮點 | 弱點 |
| --- | --- | --- | --- | --- | --- |
| **Threads 內建「已儲存／我的珍藏」** | 貼文 ⋯ 選單 →「儲存」，或長按（行動版）；存好不會離開 Threads（[Dewey，廠商](https://getdewey.co/blog/how-to-use-saved-posts-threads/)） | 沒有分類，「all saved posts … in one pile, from newest to oldest」（同上） | 依時間的單一列表。開過一次之後可離線看（同上） | 零摩擦、私密 | 不能分類、找不回舊內容，所以使用者會留言「存」、開一人群組（[數位時代](https://www.bnext.com.tw/article/92244/threads-save-post-organize-tips)）。作者刪文或封鎖你，收藏就消失（[Dewey](https://getdewey.co/blog/how-to-use-saved-posts-threads/)） |
| **Instagram 收藏＋收藏集** | 點書籤＝存到「所有貼文」；**長按書籤**＝直接選收藏集或新增（[Instagram 官方](https://about.instagram.com/blog/announcements/introducing-new-ways-to-organize-your-saved-posts)） | 收藏集是「標籤」不是資料夾：移出或刪除收藏集，貼文仍留在「所有貼文」（[ContextBolt，廠商](https://contextbolt.com/blog/instagram-saved-posts/)）。一層、不能巢狀 | 格狀縮圖，逐個收藏集捲動 | 單擊快存＋長按細分，兩種速度都照顧到 | **沒有搜尋**，到 2026-07 還在「實驗中」（[Kontentino](https://www.kontentino.com/q-and-a/search-instagram-saved-posts/)）。原文刪除，收藏就變空白。匯出只有連結與時間，「No caption, no photo」（[ContextBolt](https://contextbolt.com/blog/instagram-saved-posts/)） |
| **X 書籤資料夾** | 書籤 → 加入資料夾（[ContextBolt，廠商](https://contextbolt.com/blog/x-bookmark-folders/)） | 資料夾**付費限定**。一則可以放多個資料夾（同上） | 時間列表。據稱只顯示最近約 800–1,000 則（同上，第三方觀察） | 一則可放多個資料夾 | 搜尋只比對完整詞，**也搜不到資料夾裡面**；基本整理功能要付費（同上） |
| **Pinterest 圖版＋分區** | 存 Pin → 選 board。2026 年改成自動存到「建議的 board」，而且「無法回到舊流程」（[Pinterest 社群](https://community.pinterest.biz/t/why-cant-i-post-pin-without-selecting-a-board/45707.md?page=3)） | **兩層：board → section**，section 就是子圖版（[Pinterest 說明](https://help.pinterest.com/en/article/create-a-board-section)） | 典型的瀑布流。2025-10 圖版加了「All saves」等分頁與 AI 拼貼（[Pinterest Newsroom](https://newsroom.pinterest.com/news/pinterest-boards-get-ai-powered-upgrade-for-personalized-experience/)） | 瀑布流的原型；兩層結構和我們的大／小標籤很像 | 被迫選 board 惹怒使用者（同上社群串，2026-06～09 持續抱怨）。AI 生成圖充斥，2025-10 才加「減少 AI 內容」開關（[TechCrunch](https://techcrunch.com/2025/04/30/pinterest-launches-new-tools-to-fight-ai-slop)、[9to5Mac](https://9to5mac.com/2025/10/16/pinterest-adds-a-less-ai-slop-toggle-but-all-apps-need-an-off-button-poll)） |
| **mymind** | 瀏覽器擴充、iOS／Android／macOS App，「Save anything with a click」（[mymind](https://mymind.com/)）。從 iOS 分享有時會存成整頁截圖而不是卡片（[arslan.io](https://arslan.io/2023/01/30/a-review-of-my-mind-a-second-brain-tool/)） | **沒有資料夾**（「Folders are dead」），靠 AI 自動標籤加 Smart Spaces（[mymind](https://mymind.com/)） | **Serendipity**：隨機翻舊卡片選「保留／忘掉」，2 分鐘（[說明](https://mymind.helpscoutdocs.com/article/44-rediscovering-things-with-serendipity)）；「Top of Mind」置頂區；「Same Vibe」找相似圖 | 卡片依類型呈現：「a tweet looks like a tweet, a book shows up as a book cover」（[Creative Boom](https://www.creativeboom.com/tools/why-mymind-is-the-visual-inspiration-tool-designers-have-been-crying-out-for/)）；自然語言＋顏色搜尋 | 自動標籤對非文章內容不可靠（[Hyperquest](https://hyperquest.digitalpress.blog/how-mymind-fulfilled-and-fell-short-of-its-promise/)）；沒有匯入（同上）；免費版只有 100 則（[saner.ai，競品撰寫](https://www.saner.ai/blogs/mymind-reviews)） |
| **Raindrop.io** | Android 分享選單直接出現，用過一次會往前排；**存新書籤要有網路**（[Raindrop 說明](https://help.raindrop.io/mobile-app.md)）。iOS 有「Add to Unsorted」一鍵動作（同上） | 每則**只屬於一個收藏集**（可巢狀）＋多個標籤；沒選的進 **Unsorted 收件匣**（[說明](https://help.raindrop.io/collections)）。標籤可以有 AI 建議（選用），改名會套用到全部書籤；手機可批次加減標籤（[說明](https://help.raindrop.io/tags)） | 每個收藏集各自設定 List／Grid／Headlines／**Moodboard（不等高馬賽克）**（[說明](https://help.raindrop.io/collections)）。有「Without tags」篩選 | 資料夾＋標籤雙軌、四種檢視 | Instagram 連結的封面／預覽壞掉（[回報頁，搜尋摘要](https://better.raindrop.io/bugs/p/instagram-links-previews-are-broken)）；卡片檢視裁掉太多畫面，Moodboard 遇到不同解析度會很亂、也不能手動排（[功能請求，搜尋摘要](https://better.raindrop.io/feature-requests/p/vertical-thumbnail-proportion-for-cards-view)）；iOS／Mac「慢」（[App Store 評論，搜尋摘要](https://apps.apple.com/ph/app/raindrop-io/id1021913807)） |
| **Are.na** | iOS 分享延伸一次最多 50 項（[App Store](https://apps.apple.com/us/app/id1299153149)）；Android 版在 2025-11 重做並加入分享延伸（[Are.na 電子報 2026-01-16](https://buttondown.com/aredotna/archive/new-merch-january-events-app-updates-and-more)） | Block 可以同時「connect」到多個 channel（[Pratt IxD](https://ixd.prattsi.org/2025/02/design-critique-are-na-ios-app/)、[Adobe](https://www.adobe.com/express/learn/blog/how-use-arena)） | 沒有演算法、沒有按讚。2025 年底加了顯示密度設定與 index 檢視（[App Store](https://apps.apple.com/us/app/id1299153149)） | 安靜、沒有社群數字；文字 block 和圖片地位相同 | connect 流程「步驟多、要等，截圖還比較快」（[App Store 評論，搜尋摘要](https://apps.apple.com/us/app/id1299153149)）；存好後只有一行純文字確認，「lacks visual reinforcement」；視覺「plain—even dull」（[Pratt IxD](https://ixd.prattsi.org/2025/02/design-critique-are-na-ios-app/)） |
| **Cosmos** | Chrome 擴充、iOS 分享延伸（App 內有教學）（[screensdesign](https://screensdesign.com/showcase/cosmos-curated-inspiration)）。**2026-01 起直接存到個人頁，cluster 改成選用**（[Pulse2](https://pulse2.com/cosmos-15-million-series-a-closed-as-it-expands-social-discovery-and-attribution-features/)） | Clusters（比 board 有彈性）（[Creative Bloq，搜尋摘要](https://creativebloq.com/design/social-media/what-is-cosmos-the-pinterest-alternative-for-creatives)） | 深色介面讓圖片跳出來；AI 視覺標籤點了可以找相關內容；**顏色選擇器搜尋**（[screensdesign](https://screensdesign.com/showcase/cosmos-curated-inspiration)） | 沒有廣告、沒有按讚（[TechRadar，搜尋摘要](https://techradar.com/computing/websites-apps/this-app-is-like-pinterest-if-it-were-cooler-and-ad-free)）；自動標出原創作者 | 註冊共 9 步，太長（[screensdesign](https://screensdesign.com/showcase/cosmos-curated-inspiration)）；偏設計師取向 |
| **GoodLinks**（iOS／Mac） | 分享延伸預設會開表單（可加標籤、星號）；**Quick Save 開關**打開後只閃一下「Saved」，點那個提示才開表單（[MacStories](https://www.macstories.net/reviews/goodlinks-review-a-flexible-read-it-later-link-manager-packed-with-automation-options/)） | 標籤＝「buckets that can overlap」＋星號＋已讀；**「untagged」當收件匣**（同上） | 列表；靠 Shortcuts 隨機開一則（同上） | Quick Save 是「a terrific touch that accounts for different styles of link saving」（同上）；iCloud 同步、不用帳號；可匯出純文字／Markdown／PDF（[App Store](https://apps.apple.com/gb/app/id1474335294)） | 評論者要求專門的標籤管理介面和**標籤自動完成**（[MacStories](https://www.macstories.net/reviews/goodlinks-review-a-flexible-read-it-later-link-manager-packed-with-automation-options/)）；沒有 Android |
| **Readwise Reader** | 分享選單可以加標籤；曾把分享面板的標籤載入速度改成「10-100x faster」（[App Store 更新紀錄，搜尋摘要](https://apps.apple.com/us/app/id1567599761?l=en-us)） | Inbox／Later／Archive 分流＋標籤（同上） | 多來源（RSS、PDF、X 討論串）、可離線（[Readwise](https://readwise.io/read)） | 整理流程（triage）完整 | 需要訂閱（[web-highlights](https://web-highlights.com/blog/the-5-best-rated-read-it-later-apps-for-android.md)）；偏重度閱讀者 |
| **Choeae**（K-pop，iOS） | iOS 分享選單一鍵存 IG Reels、貼文與 **Threads**（[hunted.space](https://hunted.space/product/choeae)） | 主題相簿；AI 標籤；可以把多本相簿「Blend」成一個播放清單（[stork.ai](https://www.stork.ai/en/choeae)） | 3D 卡片輪播＋觸覺回饋（同上） | 拼貼、貼紙牆、匯出 9:16、模板分享碼，粉絲創作取向 | 只有 iOS；2026-09 時 App Store 只有 1 則評分（[stork.ai](https://www.stork.ai/en/choeae)），市場還沒驗證 |
| **Tget – Threads Downloader**（Android） | 分享進來就**自動開始下載**；同時存內文與作者（[AppGoblin](https://appgoblin.info/apps/ru.codeluck.threads.downloader)） | 頁面沒提到分類或歷史 | 內建圖片／影片檢視器、可離線看、可開回原貼文 | 12.5 萬次以上安裝、4.79★（7.3K 則評分）；強調「never … intrusive full-screen ads」 | 只是下載器，沒有整理功能。這是我們從「下載」升級到「收藏」的差異點 |

### 1.2 其他參考（篇幅較短）

| 產品 | 一句話重點 | 來源 |
| --- | --- | --- |
| **Pocket**（已關閉） | 2025-05-22 停止新下載，07-08 關閉，資料可匯出到 10-08（Mozilla 說明頁另寫到 11-12 才停止匯出）。理由是「the way people save and consume content has changed」，要專心做 Firefox。使用者多半轉到 Instapaper、Raindrop、Wallabag、Readwise、mymind | [Engadget](https://www.engadget.com/apps/mozilla-is-shutting-down-its-read-it-later-app-pocket-183247576.html)、[OMG! Ubuntu](https://www.omgubuntu.co.uk/2025/05/mozilla-kills-pocket-so-it-can-focus-on-firefox)、[Mozilla 支援頁（搜尋摘要）](https://support.mozilla.org/en-US/kb/future-of-pocket)、[webnots（搜尋摘要）](https://www.webnots.com/mozilla-shuts-down-pocket-leaving-users-to-seek-alternatives/) |
| **LINE Keep**（台灣） | 雲端儲存在 2024-08-28 下午結束，Keep 筆記保留。網友的替代做法之一就是「一人群組」 | [TVBS](https://supertaste.tvbs.com.tw/hot/348243)、[TVBS 救援備份](https://supertaste.tvbs.com.tw/esg/351043) |
| **딸깍**（韓） | 主打取代 KakaoTalk「傳給自己」：分享時選資料夾＋寫備註；AI 標籤；把多個連結打包成「分享卡」 | [App Store](https://apps.apple.com/app/id6670229348) |
| **짤카이브**（韓，梗圖） | 只存 URL、不存檔案，所以輕快。（推論）但連結過期後就會壞，剛好是反例 | [App Store](https://apps.apple.com/us/app/jjalkaibeu/id6464375270?l=en) |
| **オシカツ／推しログ**（日，推し活） | 把活動日期、地點、拍立得、セトリ、SNS 貼文集中管理，照片可寫當時的心情；推しログ用時間軸與地圖記錄 | [gamer.ne.jp（搜尋摘要）](https://www.gamer.ne.jp/press/1000004895/)、[App Store 推しログ](https://apps.apple.com/us/app/%E6%8E%A8%E3%81%97%E3%83%AD%E3%82%B0-%E3%81%82%E3%81%AA%E3%81%9F%E3%81%AE%E6%8E%A8%E3%81%97%E6%B4%BB%E3%82%92%E6%8E%A8%E3%81%97%E3%81%8C%E5%BF%9C%E6%8F%B4%E3%81%97%E3%81%A6%E3%81%8F%E3%82%8C%E3%82%8B%E3%82%A2%E3%83%97%E3%83%AA/id6746085816?l=ko) |
| **K-pop 小卡冊 App**（Kpop Collect、Pocadex、Bias Room） | 數位「卡冊」：9 格頁面、透明貼紙裝飾、資料只存裝置＋私人 iCloud | [Kpop Collect](https://apps.apple.com/us/app/id6749152606)、[Pocadex](https://common-legume-c99.notion.site/Pocadex-Support-373fb55d2567810e9874c655807d7e6c)、[Bias Room](https://biasroom.vercel.app/kpop-photocard-collector) |
| **Dewey**（擴充功能） | 同步 Threads／IG／X 的收藏，提供資料夾、巢狀資料夾、標籤、搜尋、匯出 CSV／PDF／Google Sheet。（推論）它的存在說明有人需要「把平台收藏搬出來整理」 | [Dewey Threads](https://getdewey.co/how-to-use/threads-saved-posts/)、[Firefox Add-on](https://addons.mozilla.org/firefox/addon/dewey/) |
| **Eagle**（桌面） | 資料夾＋標籤＋智慧資料夾（條件 AND／OR，可依顏色、標籤、日期）；自動抽出圖片顏色供篩選 | [Eagle 說明（搜尋摘要）](https://en.eagle.cool/article/559-smart-folders) |
| **Google Keep** | 分享連結到 Keep 會建立一則筆記（標題自動帶入）；有標籤和筆記顏色，但**沒有子標籤**，有使用者抱怨標籤一多就不夠用 | [Phonescoop（搜尋摘要）](https://www.phonescoop.com/articles/article.php?a=17568)、[Wikipedia](https://en.wikipedia.org/wiki/Google_Keep)、[Firefox 擴充評論（搜尋摘要）](https://addons.mozilla.org/en-US/firefox/addon/category-tabs-for-keep/reviews/1032042/) |
| **Notion Web Clipper** | 用原生分享選單，但**每次都要選目的頁面或資料庫**，既有資料庫可能還要另外搜尋 | [Notion 說明](https://www.notion.com/help/web-clipper) |
| **Matter** | 文字解析與 TTS 受好評，但以 iOS 為主、沒有 Android，2026 年有人說它停滯（第三方說法） | [MacStories](https://www.macstories.net/reviews/matter-a-fresh-take-on-read-later-apps/)、[DEV（第三方）](https://dev.to/fisher_shenfisher_1c32/matter-app-alternative-2026-6-read-later-apps-compared-after-matter-stopped-updating-11m0) |

---

## 2. 反覆出現的好模式與反模式

### 2.1 好產品的共同模式

| # | 模式 | 誰這樣做 | 和我們的規格 |
| --- | --- | --- | --- |
| P1 | **先存、後整理**：存的動作和分類分開；沒分類的進收件匣 | Raindrop Unsorted＋「Without tags」篩選（[說明](https://help.raindrop.io/collections)、[說明](https://help.raindrop.io/tags)）；GoodLinks「untagged 當 inbox」（[MacStories](https://www.macstories.net/reviews/goodlinks-review-a-flexible-read-it-later-link-manager-packed-with-automation-options/)）；IG 單擊存全部、長按才選收藏集（[IG](https://about.instagram.com/blog/announcements/introducing-new-ways-to-organize-your-saved-posts)）；Cosmos 2026-01 改成直接存（[Pulse2](https://pulse2.com/cosmos-15-million-series-a-closed-as-it-expands-social-discovery-and-attribution-features/)） | **已有**（面板出現＝已收藏、未分類）。可再補「待整理」入口 |
| P2 | **兩種存法**：快速存（只閃一下提示），或要細分時打開表單 | GoodLinks Quick Save；Raindrop iOS「Add to Unsorted」；IG 單擊或長按 | 部分已有（按「完成」或下滑關閉都算存）。可加「完全不開面板」的模式 |
| P3 | **自己留一份副本**，不依賴原平台 | mymind IG 多圖存成私人副本（[AlternativeTo，搜尋摘要](https://alternativeto.net/news/2025/10/mymind-introduces-saving-and-search-for-instagram-gallery-posts)）；Tget 存內文＋作者、可離線（[AppGoblin](https://appgoblin.info/apps/ru.codeluck.threads.downloader)）；Iframely 建議拿到 IG／TikTok 圖就立刻下載自存（[Iframely](https://iframely.com/help/015914-how-to-deal-with-expiring-images-of-tik-tok-and-instagram)） | **已有**（本機封面＋文字）。研究顯示這是核心差異點，要寫進對外說明 |
| P4 | **卡片依內容類型長得不一樣** | mymind「a tweet looks like a tweet」（[Creative Boom](https://www.creativeboom.com/tools/why-mymind-is-the-visual-inspiration-tool-designers-have-been-crying-out-for/)）；Are.na 文字 block 和圖片並列 | **已有**（media、quote）。可以再強化引言卡的辨識度 |
| P5 | **容器加標籤，或兩層結構** | Pinterest board → section（[說明](https://help.pinterest.com/en/article/create-a-board-section)）；Raindrop 單一收藏集＋多標籤；X 一則可放多資料夾；Are.na 一個 block 多個 channel | **已有**（兩層、可多選）。Google Keep 沒有子標籤被抱怨，反過來證明兩層有需求 |
| P6 | **主動推回舊收藏** | mymind Serendipity（[說明](https://mymind.helpscoutdocs.com/article/44-rediscovering-things-with-serendipity)）；Readdit Later 每日「For You」、ResurfX 用 widget 推 X 書籤、Unearth 寄 email 提醒（[搜尋摘要：GitHub Unearth](https://github.com/tryunearth/api)、[Peerlist](https://peerlist.io/sanjhai_18/project/readdit-later)） | **沒有**，建議新增 |
| P7 | **多種找回方式**：作者、內文、日期，甚至顏色與自然語言 | mymind 用顏色、品牌、日期搜尋（[mymind](https://mymind.com/)）；Cosmos 顏色選擇器；Eagle 顏色篩選；Dewey 依作者、內容、標籤搜尋 | 第二階段已有作者＋內文。可補日期與標籤名稱 |
| P8 | **安靜、沒有社群數字** | Are.na 沒有按讚與演算法（[Pratt](https://ixd.prattsi.org/2025/02/design-critique-are-na-ios-app/)）；mymind 宣言排除社群、虛榮指標與廣告（[mymind](https://mymind.com/)）；Cosmos 沒有按讚 | **已有**（不顯示讚數） |
| P9 | **資料可帶走** | GoodLinks 匯出 MD／PDF；Dewey 匯出 CSV／PDF；Raindrop 匯出 zip | 第三階段 |
| P10 | **每個收藏集有自己的檢視方式或密度** | Raindrop 四種檢視；Are.na 顯示密度設定 | 之後 |

### 2.2 使用者常抱怨的反模式

| # | 反模式 | 證據 | 我們要怎麼避開 |
| --- | --- | --- | --- |
| A1 | **收藏是一整堆、不能搜尋** | Threads 收藏不能分類，台灣使用者只好留言「存」、開一人群組（[數位時代](https://www.bnext.com.tw/article/92244/threads-save-post-organize-tips)）；IG 沒有搜尋（[Kontentino](https://www.kontentino.com/q-and-a/search-instagram-saved-posts/)）；X 搜不到資料夾內、只比對完整詞（[ContextBolt，廠商](https://contextbolt.com/blog/x-bookmark-folders/)） | 標籤篩選＋搜尋（作者、內文、標籤名） |
| A2 | **存的時候強迫分類** | Pinterest 社群 2026-06～09 的抱怨串：「unmotivated to use pinterest」（[社群](https://community.pinterest.biz/t/why-cant-i-post-pin-without-selecting-a-board/45707.md?page=3)）；Are.na connect 步驟多，截圖還比較快（[App Store，搜尋摘要](https://apps.apple.com/us/app/id1299153149)）；Notion 每次都要選目的地（[Notion](https://www.notion.com/help/web-clipper)） | 維持「關閉面板＝已收藏」 |
| A3 | **書籤只指向原貼文，原文消失就沒了** | IG、Threads 原作者刪文，收藏就消失；IG 匯出「describes your saves. It does not contain them」（[ContextBolt](https://contextbolt.com/blog/instagram-saved-posts/)）；Threads ghost posts 24 小時消失（[GIGAZINE](https://gigazine.net/gsc_news/en/20251028-threads-disappearing-posts)） | 本機封面＋文字；標示「原貼文已刪除」 |
| A4 | **封面壞掉或過期** | Raindrop 的 Instagram 預覽壞掉（[回報，搜尋摘要](https://better.raindrop.io/bugs/p/instagram-links-previews-are-broken)）；Meta CDN `oe` 到期（[DEV](https://dev.to/alex97po/pre-signed-url-expiry-how-to-detect-when-your-media-urls-will-break-4g74)、[Zapier 社群](https://community.zapier.com/how-do-i-3/instagram-to-rss-image-url-expires-10513)）；有一份觀察是約 4.5 天（[SociaVault，單一觀察](https://sociavault.com/blog/profile-picture-url-expired)） | 收藏當下就把圖下載下來，不要存 CDN 網址 |
| A5 | **AI 自動分類失準，使用者反而要回頭修** | mymind 自動標籤「not reliable enough」（[Hyperquest](https://hyperquest.digitalpress.blog/how-mymind-fulfilled-and-fell-short-of-its-promise/)）；手動加了標籤之後自動標籤就不顯示（同上）；卡片類型判斷錯誤又不能手動改（[arslan.io](https://arslan.io/2023/01/30/a-review-of-my-mind-a-second-brain-tool/)） | 只「建議」、不自動套用；類型可以手動改 |
| A6 | **卡片裁切過頭，或瀑布流凌亂、會跳動** | Raindrop 卡片檢視裁掉太多，Moodboard 遇到不同解析度很亂（[功能請求，搜尋摘要](https://better.raindrop.io/feature-requests/p/vertical-thumbnail-proportion-for-cards-view)）；mymind 卡片重疊要重開才好（[arslan.io](https://arslan.io/2023/01/30/a-review-of-my-mind-a-second-brain-tool/)）；Pinterest Gestalt 文件提醒「第一次排版後高度要穩定」「預留媒體尺寸」（[Gestalt Masonry](https://gestalt.pinterest.systems/web/masonry)） | 規格已有高寬比 0.75–1.6 的限制；另外要在收藏時就存下封面寬高 |
| A7 | **存好之後回饋太弱** | Are.na 只有一行純文字「connected X to Y」（[Pratt](https://ixd.prattsi.org/2025/02/design-critique-are-na-ios-app/)） | 規格已有觸覺回饋＋提示文字 |
| A8 | **基本整理功能放在付費牆後面** | X 資料夾要付費；mymind 免費版 100 則（[saner.ai，競品撰寫](https://www.saner.ai/blogs/mymind-reviews)） | （推論）標籤、搜尋不要收費 |
| A9 | **服務關閉時資料跟著消失** | Pocket（[Engadget](https://www.engadget.com/apps/mozilla-is-shutting-down-its-read-it-later-app-pocket-183247576.html)）；LINE Keep（[TVBS](https://supertaste.tvbs.com.tw/hot/348243)） | 資料存本機＋公開格式匯出 |
| A10 | **廣告太多** | FanPlus 評論：「Too many Ads」「forced to watch ad」（[App Store TW](https://apps.apple.com/tw/app/fanplus/id1448805815)） | （推論）卡片牆不放插頁廣告 |
| A11 | **存的時候需要網路** | Raindrop：「An internet connection is required to … save new bookmarks」（[說明](https://help.raindrop.io/mobile-app.md)） | 離線時先存連結，之後再補抓（見建議 R6） |

---

## 3. 給我們 App 的建議（依優先順序）

工作量：小＝1–2 天；中＝3–7 天；大＝超過 1 週（都是粗估）。
「規格」欄：**已有**＝研究支持現有規格；**補強**＝現有規格加一點；**新增**＝規格沒有。

| 優先 | 建議 | 階段 | 工作量 | 規格 | 證據 |
| --- | --- | --- | --- | --- | --- |
| **R1** | **收藏當下就下載封面原圖、存下寬高**，不存 Meta CDN 網址。下載失敗要排進重試佇列（App 回到前景時重試），並標記「封面待補」。卡片版面用存下的寬高預留空間，避免跳動 | 1 | 中 | 補強 | `oe` 會過期（[DEV](https://dev.to/alex97po/pre-signed-url-expiry-how-to-detect-when-your-media-urls-will-break-4g74)、[Iframely](https://iframely.com/help/015914-how-to-deal-with-expiring-images-of-tik-tok-and-instagram)）；Raindrop 的 IG 封面壞掉（[搜尋摘要](https://better.raindrop.io/bugs/p/instagram-links-previews-are-broken)）；Gestalt「reserve media dimensions」（[Gestalt](https://gestalt.pinterest.systems/web/masonry)） |
| **R2** | **維持「面板出現＝已收藏」**，再加一個設定「快速收藏：不開面板，只顯示『已收藏 · 加標籤』提示後立刻回 Threads」。點提示可以回 App 補標籤 | 1 | 小 | 已有＋補強 | GoodLinks Quick Save（[MacStories](https://www.macstories.net/reviews/goodlinks-review-a-flexible-read-it-later-link-manager-packed-with-automation-options/)）；IG 單擊或長按（[IG](https://about.instagram.com/blog/announcements/introducing-new-ways-to-organize-your-saved-posts)）；Pinterest 被迫選 board 的抱怨（[社群](https://community.pinterest.biz/t/why-cant-i-post-pin-without-selecting-a-board/45707.md?page=3)）；Cosmos 改成直接存（[Pulse2](https://pulse2.com/cosmos-15-million-series-a-closed-as-it-expands-social-discovery-and-attribution-features/)） |
| **R3** | **收藏面板的標籤列要瞬間出現**：標籤從本機 SQLite 同步讀取，不等網路，也不等貼文讀取完成 | 1 | 小 | 已有（規格寫「選標籤不必等讀取完成」） | Readwise 特別把分享面板的標籤載入改成「10-100x faster」（[App Store，搜尋摘要](https://apps.apple.com/us/app/id1567599761?l=en-us)） |
| **R4** | **「未分類」當收件匣**：標籤列最前面固定顯示「未分類 N」（N>0 才出現）；點了只看沒標籤的卡片 | 1 | 小 | 補強 | Raindrop Unsorted＋「Without tags」（[說明](https://help.raindrop.io/tags)）；GoodLinks「untagged 當 inbox」（[MacStories](https://www.macstories.net/reviews/goodlinks-review-a-flexible-read-it-later-link-manager-packed-with-automation-options/)） |
| **R5** | **限時貼文與原文刪除**：讀取時偵測到 ghost post 就提示「這是限時貼文，24 小時後會消失」，並把「同時下載」預設打開；之後讀取失敗（404）就標「原貼文已刪除」 | 1（角標）／2（偵測） | 小／中 | 補強 | Ghost posts（[GIGAZINE](https://gigazine.net/gsc_news/en/20251028-threads-disappearing-posts)、[Dewey 2026-01](https://getdewey.co/blog/save-thread-posts-disappearing/)）；IG／Threads 收藏會變空（[ContextBolt](https://contextbolt.com/blog/instagram-saved-posts/)）。（推論）能不能從頁面資料判斷 ghost post 要實測 |
| **R6** | **離線收藏**：沒網路時照樣建卡片（只有網址，狀態「等待讀取」），連上線後自動補抓 | 1 | 中 | 新增 | Raindrop 存書籤需要網路（[說明](https://help.raindrop.io/mobile-app.md)）。規格原則 4「離線也看得到」可以延伸到「離線也存得了」 |
| **R7** | **首次使用教學：教怎麼從 Threads 分享**。空狀態放 3 步驟圖（Threads → 分享 → 選本 App），並提醒 Android 分享選單會把常用的 App 往前排 | 1 | 小 | 補強 | Cosmos 的分享延伸教學被稱讚「well explained」（[screensdesign](https://screensdesign.com/showcase/cosmos-curated-inspiration)）；Raindrop：「After the first use, it moves toward the top」（[說明](https://help.raindrop.io/mobile-app.md)） |
| **R8** | **搜尋**：作者、內文、標籤名稱、**備註**，中文用子字串比對；有「最近搜尋」；搜尋可以和標籤篩選並用 | 2 | 中 | 已有＋補強 | IG 沒有搜尋（[Kontentino](https://www.kontentino.com/q-and-a/search-instagram-saved-posts/)）；X 搜不到資料夾內（[ContextBolt](https://contextbolt.com/blog/x-bookmark-folders/)）；數位時代：重點是「讓收藏過的內容，之後真的找得到」（[數位時代](https://www.bnext.com.tw/article/92244/threads-save-post-organize-tips)）；mymind 自然語言搜尋受好評（[arslan.io](https://arslan.io/2023/01/30/a-review-of-my-mind-a-second-brain-tool/)）。（推論）實作可以評估 SQLite FTS5 的 trigram tokenizer 處理中文子字串 |
| **R9** | **標籤管理**：改名（套用到全部）、合併、搬到別的大標籤底下、換顏色；新增標籤時有自動完成，避免「某團A」「某團 A」重複 | 2 | 中 | 已有＋補強 | Raindrop 改名會套用全部（[說明](https://help.raindrop.io/tags)）；GoodLinks 評論要求專門的標籤管理介面和自動完成（[MacStories](https://www.macstories.net/reviews/goodlinks-review-a-flexible-read-it-later-link-manager-packed-with-automation-options/)）；Google Keep 沒有子標籤被抱怨（[搜尋摘要](https://addons.mozilla.org/en-US/firefox/addon/category-tabs-for-keep/reviews/1032042/)） |
| **R10** | **批次操作**：多選卡片 → 加或移除標籤、下載、刪除 | 2 | 中 | 新增 | Raindrop 手機版可批次加減標籤（[說明](https://help.raindrop.io/tags)）；딸깍 可一次搬多個項目（[App Store](https://apps.apple.com/app/id6670229348)） |
| **R11** | **依作者建議標籤**：收藏同一個作者的貼文時，「最近用過」那排優先放這個作者上次用的標籤（只建議，不自動套用） | 2 | 小 | 新增 | （推論）粉絲帳號通常固定發同一團，規則式建議比 AI 可靠；mymind AI 標籤不可靠（[Hyperquest](https://hyperquest.digitalpress.blog/how-mymind-fulfilled-and-fell-short-of-its-promise/)）；Raindrop 的 AI 建議也是「選用」（[說明](https://help.raindrop.io/tags)） |
| **R12** | **再發現**：卡片牆頂端偶爾出現「重溫」橫幅（例如「一年前的今天」或隨機 1 張），加上一個「整理 2 分鐘」模式：逐張看，按鈕選「保留／加標籤／刪除」。**用按鈕不用左右滑**，因為規格禁止主要內容區的水平手勢 | 2（橫幅）／later（整理模式） | 中 | 新增 | mymind Serendipity（[說明](https://mymind.helpscoutdocs.com/article/44-rediscovering-things-with-serendipity)、[Creative Boom](https://www.creativeboom.com/tools/why-mymind-is-the-visual-inspiration-tool-designers-have-been-crying-out-for/)）；ResurfX 作者：「saving is easy, but rediscovering is the hard part」（搜尋摘要，原頁未直接開啟；同批結果見 [Product Hunt](https://www.producthunt.com/products/bookmark-memory/alternatives)）；「收藏者悖論」（[T 客邦](https://www.techbang.com/posts/51505-collector-paradox-a-large-collection-of-articles-but-dont-read-them-you-may-be-addicted)） |
| **R13** | **卡片備註**：每張卡片可以寫一行自己的話（例如「演唱會 D2 安可」「要去吃」），可以搜尋 | 2 | 小 | 新增 | 딸깍 分享時可寫備註（[App Store](https://apps.apple.com/app/id6670229348)）；オシカツ 照片可記當時心情（[搜尋摘要](https://www.gamer.ne.jp/press/1000004895/)）；數位時代建議收藏時「順手加上關鍵字摘要」（[數位時代](https://www.bnext.com.tw/article/92244/threads-save-post-organize-tips)） |
| **R14** | **精選＝置頂意圖**：精選卡固定在牆上方（而不是照時間散落各處），可以一鍵取消 | 2 | 小 | 補強 | mymind「Top of Mind」置頂區（[mymind](https://mymind.com/)），評論者還希望能依標籤自動置頂（[arslan.io](https://arslan.io/2023/01/30/a-review-of-my-mind-a-second-brain-tool/)）。（推論）要和「依時間排列」的規則一起決定 |
| **R15** | **匯出與備份**：一鍵匯出 ZIP（`collection.json`＋封面圖＋已下載的媒體），格式公開，也能匯入；顯示「上次備份時間」；匯出完要驗證，**失敗要明確提示**，不能悄悄失敗 | 3 | 中～大 | 已有方向 | Pocket 關閉、資料刪除（[Engadget](https://www.engadget.com/apps/mozilla-is-shutting-down-its-read-it-later-app-pocket-183247576.html)）；LINE Keep 結束（[TVBS](https://supertaste.tvbs.com.tw/hot/348243)）；IG 匯出只有連結（[ContextBolt](https://contextbolt.com/blog/instagram-saved-posts/)）；Raindrop zip 匯出有時「fails silently」（[Trustpilot，搜尋摘要](https://nz.trustpilot.com/review/raindrop.io)）；GoodLinks 可匯出 MD／PDF（[App Store](https://apps.apple.com/gb/app/id1474335294)） |
| **R16** | **對外說明打出「原文刪了你還看得到」「資料在你手機、隨時可匯出」** | 3（上架文案） | 小 | 新增 | 同 A3、A9 的證據。Tget 的商店說明也強調「access the content even when there is no internet」（[AppGoblin](https://appgoblin.info/apps/ru.codeluck.threads.downloader)） |
| R17 | **檢視密度切換**：瀑布流或「緊湊列表」（只有文字和小縮圖，適合梗圖或文字貼文多的人） | later | 中 | 新增 | Raindrop 四種檢視含 Headlines（[說明](https://help.raindrop.io/collections)）；Are.na 新增顯示密度設定（[App Store](https://apps.apple.com/us/app/id1299153149)） |
| R18 | **把篩選存成捷徑**（例如「追星 + 有影片 + 未下載」） | later | 中 | 新增 | Eagle 智慧資料夾（[搜尋摘要](https://en.eagle.cool/article/559-smart-folders)）；GoodLinks 評論者要求「Smart categories」（[MacStories](https://www.macstories.net/reviews/goodlinks-review-a-flexible-read-it-later-link-manager-packed-with-automation-options/)） |
| R19 | **Android 分享選單直接列出常用標籤**（Sharing Shortcuts，例如「收藏到 追星 › 某團A」，一步完成收藏＋標籤） | later | 大 | 新增 | （推論）Android 平台本身有這個能力，但 Expo 需要原生模組；Raindrop 只提到 App 會自動往前排（[說明](https://help.raindrop.io/mobile-app.md)）。沒找到競品實作的證據 |
| R20 | **從 Threads「已儲存」匯入舊收藏** | later | 大 | 新增 | Dewey、Social Saver 都在做「把平台收藏搬出來」（[Dewey](https://getdewey.co/how-to-use/threads-saved-posts/)、[Chrome Web Store](https://chromewebstore.google.com/detail/hiadbejkoaoagncpdgjhjenpkndhiinb)）。（推論）牽涉登入狀態與平台條款，風險高，要先評估 |
| R21 | **分享成拼貼或卡片**（例如 9:16 小卡拼貼） | later | 大 | 新增 | Choeae 拼貼與匯出 9:16（[hunted.space](https://hunted.space/product/choeae)）；딸깍 分享卡。（推論）有轉載他人作品的著作權疑慮，要謹慎 |

**不建議（至少第一版不做）**
- **AI 自動套用標籤**：失準時使用者要回頭修，反而更累（A5）。
- **社群功能、追蹤、按讚**：和 Are.na、mymind、Cosmos 這類受好評的「安靜」定位衝突，也違反規格的「不顯示讚數」（P8）。
- **收藏時強迫選標籤**（A2）。

---

## 4. 視覺設計參考：讓卡片牆有辨識度，不像通用模板

下表每一列都把**有來源的觀察**和**給我們的具體做法**（推論）分開寫。

| 參考 | 觀察（有來源） | 可以借用的做法（推論） |
| --- | --- | --- |
| **mymind：依類型設計卡片** | 「a website homepage looks like a homepage, a tweet looks like a tweet, a book shows up as a book cover」（[Creative Boom](https://www.creativeboom.com/tools/why-mymind-is-the-visual-inspiration-tool-designers-have-been-crying-out-for/)）；評論者也提醒不要做得「只像 Pinterest 複製品」（[arslan.io](https://arslan.io/2023/01/30/a-review-of-my-mind-a-second-brain-tool/)） | 把**引言卡**做成真正的雜誌引言：大號 serif、左上一個大引號（用 `muted` 色）、作者 handle 放在右下像署名，和圖片卡在牆上形成節奏。純文字貼文在 Threads 很多，這是我們比 Pinterest 型產品更有特色的地方 |
| **Are.na：安靜、文字和圖片並列** | 沒有按讚與演算法；但被批評「plain—even dull」、像舊 HTML 網站（[Pratt IxD](https://ixd.prattsi.org/2025/02/design-critique-are-na-ios-app/)） | 保留克制的版面，用**暖紙白底＋琥珀**避開「冷灰極簡」的無聊感（規格的色票已經往這個方向）。收藏成功要有一個小小的確定感（卡片落進牆上的淡入＋觸覺回饋） |
| **Cosmos：深色讓圖片跳出來、可點的視覺標籤** | 深色主題讓內容突出；AI 標籤可以點；有顏色搜尋（[screensdesign](https://screensdesign.com/showcase/cosmos-curated-inspiration)） | 深色模式不要只是反轉：卡片邊框幾乎消失、讓圖片本身當邊界（規格的暖色深色已經是對的方向）。卡片上的標籤設計成可以點（在內容頁點了就篩選） |
| **Pinterest／Gestalt Masonry：圖片優先、高度穩定** | Gestalt：第一次排版後高度要穩定，要預留媒體尺寸（[Gestalt](https://gestalt.pinterest.systems/web/masonry)）。Pin 卡片是否不帶文字、圓角幾 px，第三方說法不一致，**未驗證** | 媒體卡把「內文 2 行＋作者列」做成固定高度的頁尾，讓不同比例的圖底下有一致的基線，解決 Raindrop Moodboard「很亂」的問題（[搜尋摘要](https://better.raindrop.io/feature-requests/p/vertical-thumbnail-proportion-for-cards-view)） |
| **Raindrop Moodboard 的教訓** | 卡片檢視裁太多、Moodboard 遇到不同解析度很亂、不能手動排（[搜尋摘要](https://better.raindrop.io/feature-requests/p/vertical-thumbnail-proportion-for-cards-view)） | 規格的高寬比限制 0.75–1.6 和精選卡打破節奏，正是解法。長圖（例如梗圖長截圖）可以在超過 1.6 時於底部加「長圖」角標，提示點進去看完整 |
| **K-pop 小卡冊（Kpop Collect、Pocadex、Bias Room）** | 9 格卡冊頁、透明貼紙裝飾、本機加私人 iCloud（[Kpop Collect](https://apps.apple.com/us/app/id6749152606)、[Pocadex](https://common-legume-c99.notion.site/Pocadex-Support-373fb55d2567810e9874c655807d7e6c)、[Bias Room](https://biasroom.vercel.app/kpop-photocard-collector)） | （猜測，later）「追星」類標籤可以切成**小卡冊檢視**：固定小卡比例（約 55×85mm，**未查證**）、三欄、圓角大一點、外圈留白像卡套。這是目標族群一眼就懂、別人沒有的畫面。只做成「某個標籤的另一種檢視」，不要變成主畫面 |
| **Choeae：剪貼簿、3D 輪播** | 相框、貼紙、9:16 拼貼；3D 卡片輪播加觸覺回饋（[stork.ai](https://www.stork.ai/en/choeae)） | 規格禁止 3D 和裝飾，所以不照抄。可以借「**精選卡＝封面故事**」：整排、圖片滿版、底部 `scrim` 上放作者與一行引言，像雜誌封面 |
| **標籤色的位置** | Raindrop 每個收藏集有自訂圖示，「makes it much easier to spot at a glance」（[說明](https://help.raindrop.io/collections)） | （推論）大標籤色只出現在作者頭像圓點和標籤 chip（規格已是這樣），不要整張卡片上色，避免牆面變成彩虹；篩選某個大標籤時，可以讓頂部列標題旁出現同色小圓點，提示「目前在哪一區」 |

**一句話總結**：卡片牆的辨識度應該來自三件事：
1. **引言卡的雜誌感**（Threads 的文字貼文多，這是我們獨有的素材）。
2. **暖紙色系**（和冷灰的 Pinterest、Are.na 區隔）。
3. **精選卡的封面感**（打破瀑布流的單調）。

不要靠陰影、漸層或 3D。

---

## 附錄：台灣市場背景（供參考）

- 天下雜誌估計台灣約 350 萬人使用 Threads，是美國以外的第二大市場（天下，搜尋摘要，出自以下兩篇之一：[5131823](https://www.cw.com.tw/article/5131823)、[5131412](https://www.cw.com.tw/article/5131412)）。Statista 依 SimilarWeb 資料，指 2025 年 9 月台灣是 Threads 網頁流量占比最高的國家，但實際數字需付費才看得到（[Statista，搜尋摘要](https://de.statista.com/statistik/daten/studie/1429505/umfrage/ranking-laender-meiste-active-users-threads)）。
- MIT Technology Review 在 2024 年報導 Threads 在台灣成為年輕人最熱門的平台（[MIT TR](https://www.technologyreview.com/2024/04/02/1090518/threads-taiwan-election-politics-popular/)）。
- 台灣使用者的收藏土法：留言「存」、開一人群組、存到 iPhone 備忘錄（[數位時代](https://www.bnext.com.tw/article/92244/threads-save-post-organize-tips)）；LINE Keep 結束後也有人改用一人群組（[TVBS](https://supertaste.tvbs.com.tw/hot/348243)）。這些都是我們要取代的行為，可以拿來寫上架文案或首次使用說明，例如：「不用再留言『存』了」。
