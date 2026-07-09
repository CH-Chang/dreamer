# Comic Generation Design

## Summary
Add comic (manga-style illustration) generation alongside existing video generation. Comics stored in a new `comics` sheet/table. UI uses an Instagram-style feed merging videos and comics in reverse chronological order, with a single generate button that offers a choice.

## Data Model

```ts
// src/types/comic.ts
export type ComicStatus = 'pending' | 'generating' | 'done' | 'failed'

export interface Comic {
  id: string
  dream_id: string
  email: string
  status: ComicStatus
  image_url?: string
  created_at: string
  updated_at?: string
}
```

## Sheets / AlaSQL
- New sheet `comics` with headers: `id, dream_id, email, status, image_url, created_at, updated_at`
- Added to `SHEET_NAMES` in `alaSqlService.ts`
- Repository pattern matching `VideoRepository`: `ComicRepository` with `create` / `updateStatus` / `findAllByDreamId`

## API — Imagen

Vertex AI Imagen 3.0, synchronous (no polling):

```
POST https://aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models/imagen-3.0-generate-001:predict
Authorization: Bearer {token}
{
  "instances": [{ "prompt": "夢境漫畫風格: {description}" }],
  "parameters": { "sampleCount": 1 }
}
```

Response:
```json
{
  "predictions": [{
    "bytesBase64Encoded": "...",
    "mimeType": "image/png"
  }]
}
```

Flow:
1. Create Comic row (status: pending)
2. Update status to generating
3. Call Imagen API → get base64 image
4. Upload to Drive via `uploadImage()` (analogous to `uploadVideo()`)
5. Update status to done with `drive://{fileId}`
6. On error: status = failed

## UI — DreamMediaFeed

Replaces `VideoSection` on `DreamDetailPage`:

```
DreamDetailPage
  └─ DreamContent
  └─ DreamMediaFeed
       ├─ Loads both videos and comics
       ├─ Merges by created_at DESC
       ├─ Renders each item:
       │   ├─ Header: 生成 #N · [status badge]
       │   ├─ Video → VideoPlayer (existing)
       │   └─ Comic → ComicViewer (new, simple image display)
       └─ Generate FAB → Dropdown:
            ├─ 「生成影片」
            └─ 「生成漫畫」
```

Components:
- `DreamMediaFeed.tsx` — new, replaces VideoSection in DreamDetailPage
- `ComicViewer.tsx` — new, simple image display (loads from Drive, shows img)
- `GenerateMediaButton.tsx` — new, replace GenerateVideoButton, dropdown for video/comic choice
- Remove `VideoSection.tsx` and `GenerateVideoButton.tsx` (replaced by new components)

## ComicViewer
- Loads image from Drive via fetch + blob → object URL (same pattern as VideoPlayer)
- No controls, no progress bar needed (images are small)
- Renders `width: 100%` with automatic height
- Retry on load error

## GenerateMediaButton
- Single button: 「生成」
- Dropdown on click with two options:
  - 「生成影片」（calls Veo API via veoApiClient）
  - 「生成漫畫」（calls Imagen API via new imagenApiClient）
- Both follow same pattern: create row → generating → API call → upload → done/failed

## Factory
- Add `getComicRepository()` returning singleton `ComicRepository`

## imgenApiClient
- `src/lib/imgenApiClient.ts`
- Singleton class with `generateImage(prompt: string): Promise<{ bytesBase64Encoded: string; mimeType: string }>`
- Uses same auth token and settings (gcpProjectId, gcpLocation) as veoApiClient

## Google Drive
- `uploadImage()` in `googleDriveClient.ts` — same as `uploadVideo()` but for images
- Or reuse `uploadVideo()` with generic signature (both upload base64 to Drive)

## Files Changed / Created
- `src/types/comic.ts` — new
- `src/repositories/interfaces/IComicRepository.ts` — new
- `src/repositories/sheets/ComicRepository.ts` — new
- `src/repositories/factory.ts` — add getComicRepository
- `src/lib/alaSqlService.ts` — add 'comics' to SHEET_NAMES
- `src/lib/imgenApiClient.ts` — new
- `src/components/Comic/ComicViewer.tsx` — new
- `src/components/Dream/DreamMediaFeed.tsx` — new (replaces VideoSection)
- `src/components/Dream/GenerateMediaButton.tsx` — new (replaces GenerateVideoButton)
- `src/components/Dream/DreamDetailPage.tsx` — replace VideoSection with DreamMediaFeed
- Delete `src/components/Video/VideoSection.tsx` (replaced)
- Delete `src/components/Video/GenerateVideoButton.tsx` (replaced)
