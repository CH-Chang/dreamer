# Character Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users optionally include their profile photo as a character reference when generating videos (Veo) or comics (Gemini), with 2x rate limit consumption when enabled.

**Architecture:** Add `with_character` boolean to Video/Comic records, weighted rate limit counting, avatar base64 cache in auth store, upgraded API models for reference image support, and a toggle UI in GenerateMediaButton.

**Tech Stack:** React 19, TypeScript, Zustand, Google Vertex AI (Veo 3.1 Fast, Gemini 3.1 Flash Image), Google Sheets, AlaSQL

## Global Constraints

- `with_character` defaults to `false` for all existing records
- Avatar base64 is cached in Zustand + localStorage, not synced to sheets
- Rate limit `getUsage` uses `SUM(CASE WHEN with_character THEN 2 ELSE 1 END)`
- Veo model upgrades from `veo-3.1-lite-generate-001` to `veo-3.1-fast-generate-001`
- Gemini model upgrades from `gemini-3.1-flash-lite-image` to `gemini-3.1-flash-image`
- Toggle disabled with tooltip when user has no avatar
- API calls include `referenceImages` only when toggle is on

---
### Task 1: Type changes — add `with_character` to Video and Comic

**Files:**
- Modify: `src/types/video.ts:3-10`
- Modify: `src/types/comic.ts:3-9`

- [ ] **Step 1: Update Video type**

```ts
// src/types/video.ts
export type VideoStatus = 'pending' | 'generating' | 'done' | 'failed'

export interface Video {
  id: string
  dream_id: string
  email: string
  status: VideoStatus
  video_url?: string
  with_character: boolean
  created_at: string
  updated_at?: string
}
```

- [ ] **Step 2: Update Comic type**

```ts
// src/types/comic.ts
export type ComicStatus = 'pending' | 'generating' | 'done' | 'failed'

export interface Comic {
  id: string
  dream_id: string
  email: string
  status: ComicStatus
  image_url?: string
  with_character: boolean
  created_at: string
  updated_at?: string
}
```
---

### Task 2: Auth store — add avatarBase64 cache

**Files:**
- Modify: `src/stores/authStore.ts`

- [ ] **Step 1: Update PersistedAuth and AuthState**

```ts
// src/stores/authStore.ts
import { create } from 'zustand'
import type { User } from '../types/user'

const STORAGE_KEY = 'dreamer_auth'

interface PersistedAuth {
  user: User
  token: string
  avatarBase64: string | null
}

function loadPersistedAuth(): PersistedAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persistAuth(user: User, token: string, avatarBase64: string | null) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token, avatarBase64 }))
}

function clearPersistedAuth() {
  localStorage.removeItem(STORAGE_KEY)
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  avatarBase64: string | null
  setSession: (user: User, token: string, avatarBase64?: string | null) => void
  setAvatarBase64: (base64: string) => void
  logout: () => void
}

const persisted = loadPersistedAuth()

export const useAuthStore = create<AuthState>((set) => ({
  user: persisted?.user ?? null,
  token: persisted?.token ?? null,
  isAuthenticated: !!persisted,
  avatarBase64: persisted?.avatarBase64 ?? null,
  setSession: (user, token, avatarBase64) => {
    const ab = avatarBase64 ?? undefined
    persistAuth(user, token, ab ?? null)
    set({ user, token, isAuthenticated: true, avatarBase64: ab ?? null })
  },
  setAvatarBase64: (base64) => {
    const state = useAuthStore.getState()
    if (state.user && state.token) {
      persistAuth(state.user, state.token, base64)
    }
    set({ avatarBase64: base64 })
  },
  logout: () => {
    clearPersistedAuth()
    set({ user: null, token: null, isAuthenticated: false, avatarBase64: null })
  },
}))
```
---

### Task 3: Sheets schema — add with_character column

**Files:**
- Modify: `src/lib/googleSheetsClient.ts:150-155`

- [ ] **Step 1: Update headers**

```ts
// src/lib/googleSheetsClient.ts lines 150-155
videos: [
  'id', 'dream_id', 'email', 'status', 'video_url', 'with_character', 'created_at', 'updated_at',
],
comics: [
  'id', 'dream_id', 'email', 'status', 'image_url', 'with_character', 'created_at', 'updated_at',
],
```
---

### Task 4: Repository interfaces — update signatures

**Files:**
- Modify: `src/repositories/interfaces/IVideoRepository.ts`
- Modify: `src/repositories/interfaces/IComicRepository.ts`

- [ ] **Step 1: Update IVideoRepository create input**

```ts
// src/repositories/interfaces/IVideoRepository.ts
import type { Video, VideoStatus } from '../../types/video'

export interface IVideoRepository {
  findByDreamId(dreamId: string): Promise<Video | null>
  findAllByDreamId(dreamId: string): Promise<Video[]>
  create(video: { dream_id: string; email: string; with_character?: boolean }): Promise<Video>
  updateStatus(id: string, status: VideoStatus, videoUrl?: string): Promise<Video>
}
```

- [ ] **Step 2: Update IComicRepository create input**

```ts
// src/repositories/interfaces/IComicRepository.ts
import type { Comic, ComicStatus } from '../../types/comic'

export interface IComicRepository {
  findAllByDreamId(dreamId: string): Promise<Comic[]>
  create(input: { dream_id: string; email: string; with_character?: boolean }): Promise<Comic>
  updateStatus(id: string, status: ComicStatus, imageUrl?: string): Promise<Comic>
}
```
---

### Task 5: VideoRepository — add with_character support

**Files:**
- Modify: `src/repositories/sheets/VideoRepository.ts`

- [ ] **Step 1: Update create method**

```ts
// replace create method (lines 20-36)
async create(input: { dream_id: string; email: string; with_character?: boolean }): Promise<Video> {
  const now = new Date().toISOString()
  const withCharacter = input.with_character ?? false
  const video: Video = {
    id: generateId(),
    dream_id: input.dream_id,
    email: input.email,
    status: 'pending',
    with_character: withCharacter,
    created_at: now,
  }
  await appendSheetRow('videos', [[
    video.id, video.dream_id, video.email, video.status, '', withCharacter ? 'TRUE' : 'FALSE', video.created_at, '',
  ]])
  await query(
    `INSERT INTO videos (id, dream_id, email, status, video_url, with_character, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [video.id, video.dream_id, video.email, video.status, '', withCharacter, video.created_at, ''],
  )
  return video
}
```

- [ ] **Step 2: Update updateStatus read-back of video (line 80)**

```ts
const video: Video = {
  id: newValues[colIndex('id')] || id,
  dream_id: newValues[colIndex('dream_id')] || '',
  email: newValues[colIndex('email')] || '',
  status: (newValues[colIndex('status')] as VideoStatus) || 'pending',
  video_url: newValues[colIndex('video_url')] || undefined,
  with_character: newValues[colIndex('with_character')] === 'TRUE',
  created_at: newValues[colIndex('created_at')] || '',
  updated_at: newValues[colIndex('updated_at')] || undefined,
}
```
---

### Task 6: ComicRepository — add with_character support

**Files:**
- Modify: `src/repositories/sheets/ComicRepository.ts`

- [ ] **Step 1: Update create method**

```ts
// replace create method (lines 15-31)
async create(input: { dream_id: string; email: string; with_character?: boolean }): Promise<Comic> {
  const now = new Date().toISOString()
  const withCharacter = input.with_character ?? false
  const comic: Comic = {
    id: generateId(),
    dream_id: input.dream_id,
    email: input.email,
    status: 'pending',
    with_character: withCharacter,
    created_at: now,
  }
  await appendSheetRow('comics', [[
    comic.id, comic.dream_id, comic.email, comic.status, '', withCharacter ? 'TRUE' : 'FALSE', comic.created_at, '',
  ]])
  await query(
    'INSERT INTO comics (id, dream_id, email, status, image_url, with_character, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [comic.id, comic.dream_id, comic.email, comic.status, '', withCharacter, comic.created_at, ''],
  )
  return comic
}
```

- [ ] **Step 2: Update updateStatus read-back of comic (line 62)**

```ts
const comic: Comic = {
  id: newValues[colIndex('id')] || id,
  dream_id: newValues[colIndex('dream_id')] || '',
  email: newValues[colIndex('email')] || '',
  status: (newValues[colIndex('status')] as ComicStatus) || 'pending',
  image_url: newValues[colIndex('image_url')] || undefined,
  with_character: newValues[colIndex('with_character')] === 'TRUE',
  created_at: newValues[colIndex('created_at')] || '',
  updated_at: newValues[colIndex('updated_at')] || undefined,
}
```
---

### Task 7: Rate limit service — weighted counting

**Files:**
- Modify: `src/lib/rateLimitService.ts`

- [ ] **Step 1: Update getUsage SQL**

```ts
// src/lib/rateLimitService.ts lines 18-31
async getUsage(email: string, type: RateLimitType): Promise<{ daily: number; monthly: number }> {
  const table = type === 'video' ? 'videos' : 'comics'
  const dailyResult = await query<{ cnt: number }>(
    `SELECT SUM(CASE WHEN with_character THEN 2 ELSE 1 END) as cnt FROM ${table} WHERE email = ? AND status != 'failed' AND strftime('%Y-%m-%d', created_at) = strftime('%Y-%m-%d', 'now')`,
    [email],
  )
  const monthlyResult = await query<{ cnt: number }>(
    `SELECT SUM(CASE WHEN with_character THEN 2 ELSE 1 END) as cnt FROM ${table} WHERE email = ? AND status != 'failed' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
    [email],
  )
  return {
    daily: dailyResult[0]?.cnt || 0,
    monthly: monthlyResult[0]?.cnt || 0,
  }
}
```
---

### Task 8: Veo API client — add reference image support

**Files:**
- Modify: `src/lib/veoApiClient.ts`

- [ ] **Step 1: Update GenerateVideoOptions and generateVideo method**

```ts
// src/lib/veoApiClient.ts
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'

interface VeoGenerateResponse {
  name: string
}

interface VeoOperationResponse {
  name?: string
  done: boolean
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{
        video?: {
          uri: string
        }
      }>
    }
    videos?: Array<{
      bytesBase64Encoded: string
      mimeType: string
    }>
  }
  error?: { message: string }
}

interface ReferenceImage {
  bytesBase64Encoded: string
  mimeType: string
}

interface GenerateVideoOptions {
  prompt: string
  aspectRatio?: string
  resolution?: string
  referenceImage?: ReferenceImage
}

class VeoApiClient {
  private model = 'veo-3.1-fast-generate-001'

  async generateVideo(options: GenerateVideoOptions): Promise<VeoGenerateResponse> {
    const token = useAuthStore.getState().token
    if (!token) throw new Error('Not authenticated')

    const { gcpProjectId, gcpLocation } = useSettingsStore.getState().settings
    if (!gcpProjectId) throw new Error('GCP Project ID not configured')

    const parameters: Record<string, string> = {}
    if (options.aspectRatio) parameters.aspectRatio = options.aspectRatio
    if (options.resolution) parameters.resolution = options.resolution

    const instance: Record<string, unknown> = { prompt: options.prompt }

    if (options.referenceImage) {
      instance.referenceImages = [{
        referenceType: 'asset',
        image: {
          bytesBase64Encoded: options.referenceImage.bytesBase64Encoded,
          mimeType: options.referenceImage.mimeType,
        },
      }]
      parameters.personGeneration = 'allow'
    }

    const res = await fetch(
      `https://aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/publishers/google/models/${this.model}:predictLongRunning`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          instances: [instance],
          parameters,
        }),
      },
    )

    if (!res.ok) {
      const bodyText = await res.text()
      throw new Error(`Veo API request failed: ${bodyText}`)
    }
    return res.json()
  }

  // getOperation stays the same
  async getOperation(name: string): Promise<VeoOperationResponse> {
    const token = useAuthStore.getState().token
    if (!token) throw new Error('Not authenticated')

    const { gcpProjectId, gcpLocation } = useSettingsStore.getState().settings

    const url = `https://${gcpLocation}-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/publishers/google/models/${this.model}:fetchPredictOperation`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ operationName: name }),
    })
    if (!res.ok) throw new Error('Failed to get operation status')
    return res.json()
  }
}

export const veoApiClient = new VeoApiClient()
```
---

### Task 9: Gemini API client — add reference image support

**Files:**
- Modify: `src/lib/imgenApiClient.ts`

- [ ] **Step 1: Update generateImage method to accept optional reference image**

```ts
// src/lib/imgenApiClient.ts
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'

interface GeminiImagePart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string
  }
  inline_data?: {
    mime_type: string
    data: string
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiImagePart[]
    }
  }>
}

interface ReferenceImage {
  bytesBase64Encoded: string
  mimeType: string
}

class ImagenApiClient {
  private model = 'gemini-3.1-flash-image'

  async generateImage(prompt: string, referenceImage?: ReferenceImage): Promise<{ bytesBase64Encoded: string; mimeType: string }> {
    const token = useAuthStore.getState().token
    if (!token) throw new Error('Not authenticated')
    const { gcpProjectId } = useSettingsStore.getState().settings
    if (!gcpProjectId) throw new Error('GCP Project ID not configured')

    const parts: GeminiImagePart[] = [{ text: prompt }]

    if (referenceImage) {
      parts.push({
        inlineData: {
          mimeType: referenceImage.mimeType,
          data: referenceImage.bytesBase64Encoded,
        },
      })
    }

    const res = await fetch(
      `https://aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/global/publishers/google/models/${this.model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          contents: {
            role: 'user',
            parts,
          },
          generation_config: {
            response_modalities: ['TEXT', 'IMAGE'],
          },
        }),
      },
    )

    if (!res.ok) {
      const bodyText = await res.text()
      throw new Error(`Imagen API request failed: ${bodyText}`)
    }

    const data: GeminiResponse = await res.json()
    const partsResult = data.candidates?.[0]?.content?.parts || []
    let bytesBase64Encoded = ''
    let mimeType = ''

    for (const p of partsResult) {
      if (p.inlineData) {
        bytesBase64Encoded = p.inlineData.data
        mimeType = p.inlineData.mimeType
        break
      }
      if (p.inline_data) {
        bytesBase64Encoded = p.inline_data.data
        mimeType = p.inline_data.mime_type
        break
      }
    }

    if (!bytesBase64Encoded) throw new Error('Gemini returned no image data')

    return { bytesBase64Encoded, mimeType: mimeType || 'image/png' }
  }
}

export const imagenApiClient = new ImagenApiClient()
```
---

### Task 10: GenerateMediaButton — add character reference toggle

**Files:**
- Modify: `src/components/Dream/GenerateMediaButton.tsx`

**Interfaces:**
- Consumes: `veoApiClient.generateVideo({ prompt, aspectRatio, resolution, referenceImage? })` from Task 8
- Consumes: `imagenApiClient.generateImage(prompt, referenceImage?)` from Task 9
- Consumes: `useAuthStore` (user, avatarBase64) from Task 2
- Consumes: `getVideoRepository().create({ dream_id, email, with_character })` from Task 5
- Consumes: `getComicRepository().create({ dream_id, email, with_character })` from Task 6

- [ ] **Step 1: Update imports and add toggle state**

```ts
import { useState, useRef, useEffect } from 'react'
import { motion as m } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { getVideoRepository } from '../../repositories/factory'
import { getComicRepository } from '../../repositories/factory'
import { veoApiClient } from '../../lib/veoApiClient'
import { imagenApiClient } from '../../lib/imgenApiClient'
import { uploadVideo, uploadImage } from '../../lib/googleDriveClient'
import type { VideoStatus } from '../../types/video'
import { rateLimitService, RateLimitError } from '../../lib/rateLimitService'
```

- [ ] **Step 2: Add `withCharacter` state**

Inside the component, after existing state hooks:
```ts
const [withCharacter, setWithCharacter] = useState(false)
const { user, avatarBase64 } = useAuthStore()
```
Also change the existing `const { user } = useAuthStore()` destructuring to include `avatarBase64`.

- [ ] **Step 3: Update handleGenerateVideo to pass with_character and reference image**

```ts
const handleGenerateVideo = async () => {
  if (!user || loading) return
  try {
    await rateLimitService.checkAndThrow(user.email, 'video')
  } catch (err) {
    if (err instanceof RateLimitError) return
    throw err
  }
  setOpen(false)
  setLoading('video')
  const repo = getVideoRepository()
  let video!: Awaited<ReturnType<typeof repo.create>>
  try {
    video = await repo.create({ dream_id: dreamId, email: user.email, with_character: withCharacter })
    await repo.updateStatus(video.id, 'generating')
    onCreated()
    const [v1, c1] = await Promise.all([
      rateLimitService.getRemaining(user.email, 'video').catch(() => null),
      rateLimitService.getRemaining(user.email, 'comic').catch(() => null),
    ])
    setVideoRemaining(v1)
    setComicRemaining(c1)
    const veoOptions: Parameters<typeof veoApiClient.generateVideo>[0] = {
      prompt: `Dream-like cinematic scene: ${description}`,
      aspectRatio: '16:9',
      resolution: '720p',
    }
    if (withCharacter && avatarBase64) {
      veoOptions.referenceImage = { bytesBase64Encoded: avatarBase64, mimeType: 'image/jpeg' }
    }
    const { name } = await veoApiClient.generateVideo(veoOptions)
    const pollResult = await pollVideoOperation(name, async (status) => { await repo.updateStatus(video.id, status); onCreated() }, dreamId, useSettingsStore.getState().settings.driveFolderName)
    await repo.updateStatus(video.id, pollResult.videoUrl ? 'done' : 'failed', pollResult.videoUrl)
    onCreated()
    const [v2, c2] = await Promise.all([
      rateLimitService.getRemaining(user.email, 'video').catch(() => null),
      rateLimitService.getRemaining(user.email, 'comic').catch(() => null),
    ])
    setVideoRemaining(v2)
    setComicRemaining(c2)
  } catch (err) {
    console.error('Failed to generate video:', err)
    try { await repo.updateStatus(video.id, 'failed') } catch {}
    onCreated()
    const [v3, c3] = await Promise.all([
      rateLimitService.getRemaining(user.email, 'video').catch(() => null),
      rateLimitService.getRemaining(user.email, 'comic').catch(() => null),
    ])
    setVideoRemaining(v3)
    setComicRemaining(c3)
  } finally { setLoading(null) }
}
```

- [ ] **Step 4: Update handleGenerateComic to pass with_character and reference image**

```ts
const handleGenerateComic = async () => {
  if (!user || loading) return
  try {
    await rateLimitService.checkAndThrow(user.email, 'comic')
  } catch (err) {
    if (err instanceof RateLimitError) return
    throw err
  }
  setOpen(false)
  setLoading('comic')
  const repo = getComicRepository()
  let comic!: Awaited<ReturnType<typeof repo.create>>
  try {
    comic = await repo.create({ dream_id: dreamId, email: user.email, with_character: withCharacter })
    await repo.updateStatus(comic.id, 'generating')
    onCreated()
    const [v1, c1] = await Promise.all([
      rateLimitService.getRemaining(user.email, 'video').catch(() => null),
      rateLimitService.getRemaining(user.email, 'comic').catch(() => null),
    ])
    setVideoRemaining(v1)
    setComicRemaining(c1)
    const refImage = withCharacter && avatarBase64
      ? { bytesBase64Encoded: avatarBase64, mimeType: 'image/jpeg' }
      : undefined
    const imageUrl = await generateComic(dreamId, description, refImage)
    await repo.updateStatus(comic.id, 'done', imageUrl)
    onCreated()
    const [v2, c2] = await Promise.all([
      rateLimitService.getRemaining(user.email, 'video').catch(() => null),
      rateLimitService.getRemaining(user.email, 'comic').catch(() => null),
    ])
    setVideoRemaining(v2)
    setComicRemaining(c2)
  } catch (err) {
    console.error('Failed to generate comic:', err)
    try { await repo.updateStatus(comic.id, 'failed') } catch {}
    onCreated()
    const [v3, c3] = await Promise.all([
      rateLimitService.getRemaining(user.email, 'video').catch(() => null),
      rateLimitService.getRemaining(user.email, 'comic').catch(() => null),
    ])
    setVideoRemaining(v3)
    setComicRemaining(c3)
  } finally { setLoading(null) }
}
```

- [ ] **Step 5: Update generateComic helper to accept reference image**

```ts
async function generateComic(dreamId: string, description: string, referenceImage?: { bytesBase64Encoded: string; mimeType: string }): Promise<string> {
  const { driveFolderName } = useSettingsStore.getState().settings
  const result = await imagenApiClient.generateImage(`夢境漫畫風格: ${description}`, referenceImage)
  const fileId = await uploadImage(result.bytesBase64Encoded, result.mimeType, `comic-${dreamId}-${Date.now()}.png`, driveFolderName)
  return `drive://${fileId}`
}
```

- [ ] **Step 6: Update the JSX to include toggle**

Replace the dropdown content (lines 178-201):

```tsx
{open && (
  <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-sm min-w-[140px] overflow-hidden">
    <button
      onClick={handleGenerateVideo}
      disabled={loading === 'video' || (videoRemaining !== null && (videoRemaining.daily <= 0 || videoRemaining.monthly <= 0))}
      className="w-full text-left px-4 py-2 text-xs tracking-wider text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {videoRemaining !== null && videoRemaining.daily <= 0
        ? '生成影片 · 今日已達上限'
        : videoRemaining !== null && videoRemaining.monthly <= 0
        ? '生成影片 · 本月已達上限'
        : '生成影片'}
    </button>
    <button
      onClick={handleGenerateComic}
      disabled={loading === 'comic' || (comicRemaining !== null && (comicRemaining.daily <= 0 || comicRemaining.monthly <= 0))}
      className="w-full text-left px-4 py-2 text-xs tracking-wider text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {comicRemaining !== null && comicRemaining.daily <= 0
        ? '生成漫畫 · 今日已達上限'
        : comicRemaining !== null && comicRemaining.monthly <= 0
        ? '生成漫畫 · 本月已達上限'
        : '生成漫畫'}
    </button>
    <div className="border-t border-gray-100" />
    <div className="relative group">
      <label
        className={`flex items-center justify-between px-4 py-2 text-xs tracking-wider text-gray-400 select-none ${!user?.avatar_url ? 'opacity-40' : 'cursor-pointer hover:bg-gray-50'}`}
      >
        <span>帶入主角形象 ～2</span>
        <input
          type="checkbox"
          checked={withCharacter}
          onChange={(e) => setWithCharacter(e.target.checked)}
          disabled={!user?.avatar_url}
          className="accent-gray-800"
        />
      </label>
      {!user?.avatar_url && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          上傳大頭照即可使用主角形象
        </div>
      )}
    </div>
  </div>
)}
```
---

### Task 11: ProfilePage — write avatarBase64 cache on upload

**Files:**
- Modify: `src/components/Profile/ProfilePage.tsx`

- [ ] **Step 1: Update handleFileChange to store base64 in auth store**

```ts
const { user, setSession, token } = useAuthStore()
```
Change to:
```ts
const { user, setSession, setAvatarBase64, token } = useAuthStore()
```

And update the setSession call at the end of handleFileChange:
```ts
const driveUrl = `drive://${fileId}`
const repo = getUserRepository()
await repo.update(user.email, { avatar_url: driveUrl })
setSession({ ...user, avatar_url: driveUrl }, token, base64)
setAvatarBase64(base64)
```
Wait - `setSession` now accepts `avatarBase64` as third parameter (from Task 2), and `base64` is already computed before upload. So we just need to pass it. Also call `setAvatarBase64` for extra safety.

The variable `base64` is already available in scope at line 98:
```ts
const base64 = await resizeImage(file, 400)
```
---

### Task 12: useAuth — background cache fill on login

**Files:**
- Modify: `src/hooks/useAuth.ts`

- [ ] **Step 1: After login, if user has avatar_url and no cache, fetch and cache**

```ts
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getUserRepository } from '../repositories/factory'
import { initDatabase } from '../lib/alaSqlService'

export function useAuth() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()

  const onLoginSuccess = async (accessToken: string) => {
    const userInfoRes = await fetch(
      'https://www.googleapis.com/oauth2/v1/userinfo',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    const userInfo: { email: string; name: string; picture?: string } =
      await userInfoRes.json()

    useAuthStore.getState().setSession({ email: userInfo.email, name: userInfo.name, avatar_url: userInfo.picture ?? '', role: 'user', created_at: '' }, accessToken)

    await initDatabase(true)

    const repo = getUserRepository()
    let existingUser = await repo.findByEmail(userInfo.email)
    if (!existingUser) {
      const count = await repo.findCount()
      existingUser = await repo.create({
        email: userInfo.email,
        name: userInfo.name,
        avatar_url: userInfo.picture,
        role: count === 0 ? 'admin' : 'user',
      })
    }
    useAuthStore.getState().setSession(existingUser, accessToken)

    // Background: fetch avatar base64 if avatar_url exists but not cached
    const state = useAuthStore.getState()
    if (existingUser.avatar_url && !state.avatarBase64) {
      const avatarUrl = existingUser.avatar_url
      if (avatarUrl.startsWith('drive://')) {
        try {
          const fileId = avatarUrl.replace('drive://', '')
          const res = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          )
          const blob = await res.blob()
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = reader.result as string
            const base64 = result.split(',')[1]
            if (base64) {
              useAuthStore.getState().setAvatarBase64(base64)
            }
          }
          reader.readAsDataURL(blob)
        } catch (err) {
          console.warn('Failed to prefetch avatar cache:', err)
        }
      } else if (avatarUrl.startsWith('http')) {
        try {
          const res = await fetch(avatarUrl)
          const blob = await res.blob()
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = reader.result as string
            const base64 = result.split(',')[1]
            if (base64) {
              useAuthStore.getState().setAvatarBase64(base64)
            }
          }
          reader.readAsDataURL(blob)
        } catch (err) {
          console.warn('Failed to prefetch avatar cache:', err)
        }
      }
    }

    navigate('/calendar')
  }

  return { user, isAuthenticated, onLoginSuccess, logout }
}
```
---

## Self-Review Checklist

1. **Spec coverage:** 
   - ✅ Types: Video and Comic gain `with_character` (Task 1)
   - ✅ Auth store: `avatarBase64` cache (Task 2)
   - ✅ Sheets: headers updated (Task 3)
   - ✅ Repos: interfaces and implementations updated (Tasks 4-6)
   - ✅ Rate limit: weighted `SUM` (Task 7)
   - ✅ Veo API: reference image + model upgrade (Task 8)
   - ✅ Gemini API: reference image + model upgrade (Task 9)
   - ✅ UI: toggle + tooltip (Task 10)
   - ✅ ProfilePage: cache write on upload (Task 11)
   - ✅ useAuth: cache fill on login (Task 12)
2. **Placeholders scan:** No TBD, TODO, or incomplete code.
3. **Type consistency:** `with_character: boolean` used consistently across all tasks. `avatarBase64: string | null` consistent. `setSession(user, token, avatarBase64?)` consistent with Task 2.
