# Character Reference for Media Generation

## Overview

讓使用者在產生影片（Veo）或漫畫（Gemini）時，選擇是否帶入個人頭像作為角色參考（character reference）。開啟時，AI 生成的作品中會出現使用者的臉/形象，且額度消耗加倍。

## Data Model

### Video & Comic

新增 `with_character` 欄位：

```ts
// types/video.ts
export interface Video {
  id: string
  dream_id: string
  email: string
  status: VideoStatus
  video_url?: string
  with_character: boolean    // ← 新增
  created_at: string
  updated_at?: string
}

// types/comic.ts
export interface Comic {
  id: string
  dream_id: string
  email: string
  status: ComicStatus
  image_url?: string
  with_character: boolean    // ← 新增
  created_at: string
  updated_at?: string
}
```

Google Sheets 對應欄位：`with_character`（TRUE / FALSE）

### Auth Store (Avatar Cache)

```ts
// stores/authStore.ts
interface AuthState {
  user: User | null
  token: string | null
  avatarBase64: string | null  // ← 新增，上傳時快取
  // ...
}
```

- `avatarBase64` 存 base64 string（不含 data: URI prefix）
- 上傳 avatar 完成後寫入，同步存到 localStorage
- 登入時若已有 `avatar_url` 且無快取，背景 fetch 後補快取

## Rate Limit

### Usage Counting

`getUsage` 的 SQL 從：

```sql
SELECT COUNT(*) as cnt FROM videos WHERE email = ? ...
```

改成：

```sql
SELECT SUM(CASE WHEN with_character THEN 2 ELSE 1 END) as cnt
FROM videos WHERE email = ? AND status != 'failed' ...
```

comics 比照辦理。

### checkAndThrow

簽章不變，因加權已在 `getUsage` 內處理。

### ProfilePage Quota

顯示不需變更，因為 `getUsage` 已回傳加權後數字。

## UI: GenerateMediaButton

dropdown 內新增一行 toggle（在兩個生成選項下方）：

```
┌─────────────────────┐
│ 🎬 生成影片          │
│ 📄 生成漫畫          │
│ ─────────────────── │
│ ☐ 帶入主角形象   ～2 │
└─────────────────────┘
```

狀態邏輯：

| 條件 | 顯示 |
|------|------|
| 無 avatar | disabled，tooltip「上傳大頭照即可使用主角形象」 |
| 有 avatar，關閉 | 可切換，消費 1 額度 |
| 有 avatar，開啟 | 可切換，消費 2 額度，API 帶入 reference image |

～2 標示表示開啟時消耗 2 倍額度。

## API Integration

### Veo (Video)

模型從 `veo-3.1-lite-generate-001` 升級為 `veo-3.1-fast-generate-001`
（Lite 不支援 reference images）

Request body 新增 `referenceImages`：

```json
{
  "instances": [{
    "prompt": "Dream-like cinematic scene: ...",
    "referenceImages": [{
      "image": {
        "bytesBase64Encoded": "<avatar_base64>",
        "mimeType": "image/jpeg"
      },
      "referenceType": "asset"
    }]
  }],
  "parameters": {
    "aspectRatio": "16:9",
    "resolution": "720p",
    "personGeneration": "allow"
  }
}
```

### Gemini (Comic)

模型從 `gemini-3.1-flash-lite-image` 升級為 `gemini-3.1-flash-image`
（Lite 不支援 character consistency）

Request body 將 avatar 作為 reference image 加入：

```json
{
  "contents": {
    "role": "user",
    "parts": [
      { "text": "夢境漫畫風格: ..." },
      { "inlineData": { "mimeType": "image/jpeg", "data": "<avatar_base64>" } }
    ]
  },
  "generation_config": {
    "response_modalities": ["TEXT", "IMAGE"]
  }
}
```

## Avatar Base64 Cache

### 寫入快取（上傳時）

```ts
// ProfilePage handleFileChange
const base64 = await resizeImage(file, 400)
// ... upload to Drive ...
setSession({ ...user, avatar_url: driveUrl, avatarBase64: base64 }, token)
```

### 讀取快取（生成時）

```ts
const { user, avatarBase64 } = useAuthStore()
if (withCharacter && avatarBase64) {
  // 直接使用
} else if (withCharacter && !avatarBase64 && user?.avatar_url) {
  // 從 Drive fetch 並補快取（背景）
}
```

### 登入補快取

在 `useAuth` login 流程中，若 `user.avatar_url` 存在且無快取，背景 fetch image 後寫入。

## Files Changed

| File | Change |
|------|--------|
| `src/types/video.ts` | 加 `with_character: boolean` |
| `src/types/comic.ts` | 加 `with_character: boolean` |
| `src/types/rateLimit.ts` | 無變更 |
| `src/lib/rateLimitService.ts` | `getUsage` SQL 改 SUM + CASE |
| `src/lib/veoApiClient.ts` | 接受 reference image 參數，model 改 fast |
| `src/lib/imgenApiClient.ts` | 接受 reference image 參數，model 改 flash |
| `src/stores/authStore.ts` | 加 `avatarBase64` |
| `src/components/Dream/GenerateMediaButton.tsx` | 加 switch、avatar state、帶入 API |
| `src/components/Profile/ProfilePage.tsx` | 上傳 avatar 後寫入快取 |
| `src/hooks/useAuth.ts` | 登入時補 avatar base64 快取 |
| Repository + sheets schema | Video/Comic repository 新增 with_character 欄位 |
