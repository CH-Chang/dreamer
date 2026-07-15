# Feed — 短影音瀏覽功能

## 概述

TikTok 風格的垂直滑動 feed，展示所有使用者的公開夢境貼文（影片與漫畫），提供沉浸式全螢幕瀏覽體驗。

## Route

- `/feed` — 全螢幕 feed 頁面，不包在 MainLayout 內，無 header
- 從 Header 新增 feed icon 進入
- 右上角 ✕ 按鈕或 swipe down 返回上一頁

## 資料流

### Repository 新增

`IDreamRepository` 新增：

```typescript
findPublicPage(cursor?: string, limit?: number): Promise<{
  items: Dream[]
  nextCursor?: string
}>
```

SQL：

```sql
-- 第一頁
SELECT * FROM dreams
WHERE visibility = 'public'
  AND (id IN (SELECT dream_id FROM videos WHERE status = 'done')
    OR id IN (SELECT dream_id FROM comics WHERE status = 'done'))
ORDER BY created_at DESC
LIMIT 10

-- 後續頁面
SELECT * FROM dreams
WHERE visibility = 'public'
  AND created_at < ?
  AND (id IN (...videos...) OR id IN (...comics...))
ORDER BY created_at DESC
LIMIT 10
```

### FeedService（新檔案 `src/lib/feedService.ts`）

負責將 raw data 組裝成 feed items：

```
findPublicPage(cursor?)
  → DreamRepository.findPublicPage(cursor)
  → 對每則 dream 平行查詢 media + author
  → 扁平化成 FeedItem[]
  → 回傳 { items: FeedItem[], nextCursor? }
```

### FeedItem 型別

```typescript
interface FeedItem {
  id: string
  type: 'video' | 'comic'
  mediaUrl: string         // 可能為 drive:// 或一般 URL
  dream: {
    id: string
    title?: string
    description: string
    created_at: string
    email: string
  }
  author: {
    name: string
    avatar_url?: string
  }
}
```

單一 dream 可能產出多個 FeedItem（一個 done video + 一個 done comic）。

## UI 架構

### FeedPage (`src/components/Feed/FeedPage.tsx`)

- 全螢幕 `h-screen w-screen bg-black`
- `AnimatePresence` + framer-motion `drag="y"` 實作 vertical swipe
- 用 `cursor` state 追蹤當前 feed item index
- 預載前後各一筆 media
- 切換時 auto-pause / auto-play video

### Swipe 邏輯

- `onDragEnd` 判斷 drag delta Y 是否超過 threshold（80px）
- 向下滑 → 上一則（index - 1）
- 向上滑 → 下一則（index + 1）
- 到底時自動觸發 `loadMore()` 載入下一頁
- 到達邊界不再滑動（無循環）

### 單則貼文佈局

```
┌──────────────────────┐
│                       │
│    Video / Image      │ ← object-cover (video) / object-contain (comic)
│    全螢幕顯示          │
│                       │
├──────────────────────┤
│  overlay 資訊區        │ ← 半透明黑底漸層
│  ◉ 作者頭像  作者名稱  │
│  夢境標題             │
│  夢境敘述（2行截斷）   │
│  日期                │
│  [ more › ]          │ ← 點擊跳 /dream/:id
├──────────────────────┤
│  ✕ top-left           │ ← 返回
└──────────────────────┘
```

### FeedItem 組件 (`src/components/Feed/FeedItem.tsx`)

根據 `type` 渲染：
- `'video'` → `<video>` element，autoplay + loop + muted
- `'comic'` → `<img>` element，object-contain
- `drive://` URL 處理：`drive://` 開頭的影片沿用 `VideoPlayer` 的 `videoBlobCache` + Drive API 邏輯

## 修改檔案清單

| 檔案 | 變更 |
|------|------|
| `src/repositories/interfaces/IDreamRepository.ts` | 新增 `findPublicPage` |
| `src/repositories/sheets/DreamRepository.ts` | 實作 `findPublicPage` |
| `src/lib/feedService.ts` | **新檔案** — feed 資料組裝 |
| `src/components/Feed/FeedPage.tsx` | **新檔案** — feed 主頁面 |
| `src/components/Feed/FeedItem.tsx` | **新檔案** — 單則貼文 |
| `src/App.tsx` | 新增 `/feed` route |
| `src/components/Layout/Header.tsx` | 新增 feed 入口 icon |

## 邊界情況

- 無公開夢境時顯示空狀態提示
- 所有公開夢境都無 done media 時顯示「尚無公開貼文」
- 網路錯誤或 DB 未初始化時顯示錯誤提示
- `drive://` URL 的漫畫圖片沿用 ComicViewer 的 Drive API 邏輯
