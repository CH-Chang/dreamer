# Rate Limit System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add daily/monthly rate limits for video and comic generation per user with system-wide defaults.

**Architecture:** New `rate_limits` sheet + `RateLimitRepository` for CRUD + `RateLimitService` for checking usage against limits. GenerateMediaButton checks limits before creating records. Settings page gets admin quota management UI.

**Tech Stack:** Google Sheets (appendSheetRow/updateSheetRow/fetchSheetAsRows), AlaSQL (query), Zustand (settingsStore), React + Tailwind v4

## Global Constraints
- All user-facing text in Traditional Chinese
- Follow existing repository pattern: sheets + AlaSQL dual-write
- Use `generateId()` from `src/utils/idGenerator` for IDs
- All rate limit types use ISO date strings in AlaSQL queries (date() and strftime)
- Follow existing code style: no JSX comments, concise

---

### Task 1: Type + Interface + Sheet Registration

**Files:**
- Create: `src/types/rateLimit.ts`
- Create: `src/repositories/interfaces/IRateLimitRepository.ts`
- Modify: `src/lib/alaSqlService.ts:10`
- Modify: `src/lib/googleSheetsClient.ts:142-155`

**Interfaces:**
- Produces: `RateLimit` type, `IRateLimitRepository` interface

- [ ] **Step 1: Create `src/types/rateLimit.ts`**

```ts
export type RateLimitType = 'video' | 'comic'
export type RateLimitScope = 'system' | string

export interface RateLimit {
  id: string
  type: RateLimitType
  scope: RateLimitScope
  daily_limit: number
  monthly_limit: number
  created_at: string
  updated_at?: string
}

export interface CreateRateLimitInput {
  type: RateLimitType
  scope: RateLimitScope
  daily_limit: number
  monthly_limit: number
}

export interface UpdateRateLimitInput {
  daily_limit?: number
  monthly_limit?: number
}
```

- [ ] **Step 2: Create `src/repositories/interfaces/IRateLimitRepository.ts`**

```ts
import type { RateLimit, RateLimitType, RateLimitScope, CreateRateLimitInput, UpdateRateLimitInput } from '../../types/rateLimit'

export interface IRateLimitRepository {
  findByTypeAndScope(type: RateLimitType, scope: RateLimitScope): Promise<RateLimit | null>
  findAll(): Promise<RateLimit[]>
  create(input: CreateRateLimitInput): Promise<RateLimit>
  update(id: string, input: UpdateRateLimitInput): Promise<RateLimit>
  delete(id: string): Promise<void>
}
```

- [ ] **Step 3: Add `rate_limits` to SHEET_NAMES in `src/lib/alaSqlService.ts`**

Change line 10 from:
```ts
const SHEET_NAMES = ['users', 'dreams', 'videos', 'categories', 'comics'] as const
```
to:
```ts
const SHEET_NAMES = ['users', 'dreams', 'videos', 'categories', 'comics', 'rate_limits'] as const
```

- [ ] **Step 4: Add rate_limits headers in `src/lib/googleSheetsClient.ts`**

Add before the closing `}` of `getHeadersForSheet`:
```ts
    rate_limits: [
      'id', 'type', 'scope', 'daily_limit', 'monthly_limit', 'created_at', 'updated_at',
    ],
```

- [ ] **Step 5: Run build to verify**

```bash
npm run build
```
Expected: clean, no errors

- [ ] **Step 6: Commit**

```bash
git add src/types/rateLimit.ts src/repositories/interfaces/IRateLimitRepository.ts src/lib/alaSqlService.ts src/lib/googleSheetsClient.ts
git commit -m "feat: add rate limit type, interface, and sheet registration"
```

---

### Task 2: RateLimitRepository

**Files:**
- Create: `src/repositories/sheets/RateLimitRepository.ts`
- Modify: `src/repositories/factory.ts`

**Interfaces:**
- Consumes: `IRateLimitRepository`, `RateLimit`, `CreateRateLimitInput`, `UpdateRateLimitInput`
- Produces: `RateLimitRepository` class

- [ ] **Step 1: Create `src/repositories/sheets/RateLimitRepository.ts`**

```ts
import type { RateLimit, RateLimitType, RateLimitScope, CreateRateLimitInput, UpdateRateLimitInput } from '../../types/rateLimit'
import type { IRateLimitRepository } from '../interfaces/IRateLimitRepository'
import { query } from '../../lib/alaSqlService'
import { appendSheetRow, updateSheetRow, fetchSheetAsRows } from '../../lib/googleSheetsClient'
import { generateId } from '../../utils/idGenerator'

export class RateLimitRepository implements IRateLimitRepository {
  async findByTypeAndScope(type: RateLimitType, scope: RateLimitScope): Promise<RateLimit | null> {
    const rows = await query<RateLimit>(
      'SELECT * FROM rate_limits WHERE type = ? AND scope = ? LIMIT 1',
      [type, scope],
    )
    return rows[0] || null
  }

  async findAll(): Promise<RateLimit[]> {
    return query<RateLimit>('SELECT * FROM rate_limits ORDER BY type, scope')
  }

  async create(input: CreateRateLimitInput): Promise<RateLimit> {
    const now = new Date().toISOString()
    const item: RateLimit = {
      id: generateId(),
      type: input.type,
      scope: input.scope,
      daily_limit: input.daily_limit,
      monthly_limit: input.monthly_limit,
      created_at: now,
    }
    await appendSheetRow('rate_limits', [[
      item.id, item.type, item.scope, String(item.daily_limit), String(item.monthly_limit), item.created_at, '',
    ]])
    await query(
      'INSERT INTO rate_limits (id, type, scope, daily_limit, monthly_limit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [item.id, item.type, item.scope, item.daily_limit, item.monthly_limit, item.created_at, ''],
    )
    return item
  }

  async update(id: string, input: UpdateRateLimitInput): Promise<RateLimit> {
    const rows = await fetchSheetAsRows('rate_limits')
    if (rows.length < 2) throw new Error('Rate limit not found')
    const headers = rows[0]
    const rowIdx = rows.findIndex((r, i) => i > 0 && r[0]?.trim() === id)
    if (rowIdx === -1) throw new Error('Rate limit not found')

    const now = new Date().toISOString()
    const newValues = [...rows[rowIdx]]
    const colIndex = (name: string) => headers.findIndex((h) => h.trim() === name)
    if (input.daily_limit !== undefined) {
      const col = colIndex('daily_limit')
      if (col !== -1) newValues[col] = String(input.daily_limit)
    }
    if (input.monthly_limit !== undefined) {
      const col = colIndex('monthly_limit')
      if (col !== -1) newValues[col] = String(input.monthly_limit)
    }
    const updatedAtCol = colIndex('updated_at')
    if (updatedAtCol !== -1) newValues[updatedAtCol] = now

    await updateSheetRow('rate_limits', rowIdx + 1, newValues)

    const updateFields: string[] = []
    const updateValues: unknown[] = []
    if (input.daily_limit !== undefined) {
      updateFields.push('daily_limit = ?')
      updateValues.push(input.daily_limit)
    }
    if (input.monthly_limit !== undefined) {
      updateFields.push('monthly_limit = ?')
      updateValues.push(input.monthly_limit)
    }
    if (updateFields.length > 0) {
      updateFields.push('updated_at = ?')
      updateValues.push(now)
      updateValues.push(id)
      await query(`UPDATE rate_limits SET ${updateFields.join(', ')} WHERE id = ?`, updateValues)
    }

    const item: RateLimit = {
      id: newValues[colIndex('id')] || id,
      type: newValues[colIndex('type')] as RateLimitType || input.type,
      scope: newValues[colIndex('scope')] || '',
      daily_limit: Number(newValues[colIndex('daily_limit')]) || input.daily_limit || 0,
      monthly_limit: Number(newValues[colIndex('monthly_limit')]) || input.monthly_limit || 0,
      created_at: newValues[colIndex('created_at')] || '',
      updated_at: now,
    }
    return item
  }

  async delete(id: string): Promise<void> {
    await query('DELETE FROM rate_limits WHERE id = ?', [id])
  }
}
```

- [ ] **Step 2: Register factory in `src/repositories/factory.ts`**

Add imports:
```ts
import type { IRateLimitRepository } from './interfaces/IRateLimitRepository'
import { RateLimitRepository } from './sheets/RateLimitRepository'
```

Add after `let comicRepo`:
```ts
let rateLimitRepo: IRateLimitRepository
```

Add before closing `}`:
```ts
export function getRateLimitRepository(): IRateLimitRepository {
  if (!rateLimitRepo) rateLimitRepo = new RateLimitRepository()
  return rateLimitRepo
}
```

- [ ] **Step 3: Run build**

```bash
npm run build
```
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add src/repositories/sheets/RateLimitRepository.ts src/repositories/factory.ts
git commit -m "feat: add RateLimitRepository"
```

---

### Task 3: RateLimitService

**Files:**
- Create: `src/lib/rateLimitService.ts`

**Interfaces:**
- Consumes: `getRateLimitRepository()`, `query()` from alaSqlService
- Produces: `RateLimitService` class, `RateLimitError` class

- [ ] **Step 1: Write `src/lib/rateLimitService.ts`**

```ts
import type { RateLimitType } from '../types/rateLimit'
import { query } from './alaSqlService'
import { getRateLimitRepository } from '../repositories/factory'

export class RateLimitError extends Error {
  remaining: { daily: number; monthly: number }
  type: RateLimitType

  constructor(type: RateLimitType, remaining: { daily: number; monthly: number }) {
    const parts: string[] = []
    if (remaining.daily <= 0) parts.push(`今日`)
    if (remaining.monthly <= 0) parts.push(`本月`)
    super(`已達上限`)
    this.name = 'RateLimitError'
    this.remaining = remaining
    this.type = type
  }
}

class RateLimitService {
  async getUsage(email: string, type: RateLimitType): Promise<{ daily: number; monthly: number }> {
    const table = type === 'video' ? 'videos' : 'comics'
    const dailyResult = await query<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM ${table} WHERE email = ? AND status != 'failed' AND date(created_at) = date('now')`,
      [email],
    )
    const monthlyResult = await query<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM ${table} WHERE email = ? AND status != 'failed' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
      [email],
    )
    return {
      daily: dailyResult[0]?.cnt || 0,
      monthly: monthlyResult[0]?.cnt || 0,
    }
  }

  async getLimit(email: string, type: RateLimitType): Promise<{ daily: number; monthly: number }> {
    const repo = getRateLimitRepository()

    const userLimit = await repo.findByTypeAndScope(type, email)
    if (userLimit) {
      return { daily: userLimit.daily_limit, monthly: userLimit.monthly_limit }
    }

    const systemLimit = await repo.findByTypeAndScope(type, 'system')
    if (systemLimit) {
      return { daily: systemLimit.daily_limit, monthly: systemLimit.monthly_limit }
    }

    const defaults: Record<RateLimitType, { daily: number; monthly: number }> = {
      video: { daily: 5, monthly: 30 },
      comic: { daily: 10, monthly: 60 },
    }
    return defaults[type]
  }

  async getRemaining(email: string, type: RateLimitType): Promise<{ daily: number; monthly: number }> {
    const [usage, limit] = await Promise.all([
      this.getUsage(email, type),
      this.getLimit(email, type),
    ])
    return {
      daily: Math.max(0, limit.daily - usage.daily),
      monthly: Math.max(0, limit.monthly - usage.monthly),
    }
  }

  async checkAndThrow(email: string, type: RateLimitType): Promise<void> {
    const [usage, limit] = await Promise.all([
      this.getUsage(email, type),
      this.getLimit(email, type),
    ])
    const remaining = {
      daily: Math.max(0, limit.daily - usage.daily),
      monthly: Math.max(0, limit.monthly - usage.monthly),
    }
    if (remaining.daily <= 0 || remaining.monthly <= 0) {
      throw new RateLimitError(type, {
        daily: remaining.daily,
        monthly: remaining.monthly,
      })
    }
  }

  async initDefaults(): Promise<void> {
    const repo = getRateLimitRepository()
    const existing = await repo.findByTypeAndScope('video', 'system')
    if (!existing) {
      await repo.create({ type: 'video', scope: 'system', daily_limit: 5, monthly_limit: 30 })
    }
    const existingComic = await repo.findByTypeAndScope('comic', 'system')
    if (!existingComic) {
      await repo.create({ type: 'comic', scope: 'system', daily_limit: 10, monthly_limit: 60 })
    }
  }
}

export const rateLimitService = new RateLimitService()
```

- [ ] **Step 2: Run build**

```bash
npm run build
```
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add src/lib/rateLimitService.ts
git commit -m "feat: add RateLimitService"
```

---

### Task 4: RateLimitService Tests

**Files:**
- Create: `src/lib/__tests__/rateLimitService.test.ts`

- [ ] **Step 1: Write tests**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as alaSqlService from '../alaSqlService'
import * as factory from '../../repositories/factory'

vi.mock('../alaSqlService', async () => {
  const actual = await vi.importActual('../alaSqlService')
  return {
    ...actual,
    query: vi.fn(),
    isInitialized: vi.fn().mockReturnValue(true),
  }
})

vi.mock('../../repositories/factory', async () => {
  const actual = await vi.importActual('../../repositories/factory')
  return {
    ...actual,
    getRateLimitRepository: vi.fn(),
  }
})

const mockQuery = vi.mocked(alaSqlService.query)
const mockGetRepo = vi.mocked(factory.getRateLimitRepository)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('rateLimitService', () => {
  describe('getUsage', () => {
    it('returns daily and monthly counts excluding failed records', async () => {
      mockQuery
        .mockResolvedValueOnce([{ cnt: 3 }])
        .mockResolvedValueOnce([{ cnt: 15 }])
      const { rateLimitService } = await import('../rateLimitService')
      const usage = await rateLimitService.getUsage('a@b.com', 'video')
      expect(usage).toEqual({ daily: 3, monthly: 15 })
      expect(mockQuery).toHaveBeenCalledTimes(2)
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("status != 'failed' AND date(created_at) = date('now')"),
        ['a@b.com'],
      )
    })

    it('queries comics table for comic type', async () => {
      mockQuery
        .mockResolvedValueOnce([{ cnt: 1 }])
        .mockResolvedValueOnce([{ cnt: 5 }])
      const { rateLimitService } = await import('../rateLimitService')
      const usage = await rateLimitService.getUsage('a@b.com', 'comic')
      expect(usage).toEqual({ daily: 1, monthly: 5 })
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM comics'),
        ['a@b.com'],
      )
    })
  })

  describe('getLimit', () => {
    it('returns user-specific limit when exists', async () => {
      const mockRepo = {
        findByTypeAndScope: vi.fn().mockResolvedValue({ daily_limit: 10, monthly_limit: 50 }),
      }
      mockGetRepo.mockReturnValue(mockRepo as any)
      const { rateLimitService } = await import('../rateLimitService')
      const limit = await rateLimitService.getLimit('a@b.com', 'video')
      expect(limit).toEqual({ daily: 10, monthly: 50 })
      expect(mockRepo.findByTypeAndScope).toHaveBeenCalledWith('video', 'a@b.com')
    })

    it('falls back to system limit when no user override', async () => {
      const mockRepo = {
        findByTypeAndScope: vi.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ daily_limit: 5, monthly_limit: 30 }),
      }
      mockGetRepo.mockReturnValue(mockRepo as any)
      const { rateLimitService } = await import('../rateLimitService')
      const limit = await rateLimitService.getLimit('a@b.com', 'video')
      expect(limit).toEqual({ daily: 5, monthly: 30 })
      expect(mockRepo.findByTypeAndScope).toHaveBeenNthCalledWith(1, 'video', 'a@b.com')
      expect(mockRepo.findByTypeAndScope).toHaveBeenNthCalledWith(2, 'video', 'system')
    })

    it('returns hardcoded defaults when no limit exists at all', async () => {
      const mockRepo = {
        findByTypeAndScope: vi.fn().mockResolvedValue(null),
      }
      mockGetRepo.mockReturnValue(mockRepo as any)
      const { rateLimitService } = await import('../rateLimitService')
      const videoLimit = await rateLimitService.getLimit('a@b.com', 'video')
      expect(videoLimit).toEqual({ daily: 5, monthly: 30 })
      const comicLimit = await rateLimitService.getLimit('a@b.com', 'comic')
      expect(comicLimit).toEqual({ daily: 10, monthly: 60 })
    })
  })

  describe('checkAndThrow', () => {
    it('passes when usage is under limits', async () => {
      mockQuery
        .mockResolvedValueOnce([{ cnt: 2 }])
        .mockResolvedValueOnce([{ cnt: 10 }])
      const mockRepo = {
        findByTypeAndScope: vi.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ daily_limit: 5, monthly_limit: 30 }),
      }
      mockGetRepo.mockReturnValue(mockRepo as any)
      const { rateLimitService } = await import('../rateLimitService')
      await expect(rateLimitService.checkAndThrow('a@b.com', 'video')).resolves.toBeUndefined()
    })

    it('throws when daily limit exceeded', async () => {
      mockQuery
        .mockResolvedValueOnce([{ cnt: 5 }])
        .mockResolvedValueOnce([{ cnt: 10 }])
      const mockRepo = {
        findByTypeAndScope: vi.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ daily_limit: 5, monthly_limit: 30 }),
      }
      mockGetRepo.mockReturnValue(mockRepo as any)
      const { rateLimitService, RateLimitError } = await import('../rateLimitService')
      await expect(rateLimitService.checkAndThrow('a@b.com', 'video')).rejects.toThrow(RateLimitError)
    })

    it('throws when monthly limit exceeded', async () => {
      mockQuery
        .mockResolvedValueOnce([{ cnt: 2 }])
        .mockResolvedValueOnce([{ cnt: 30 }])
      const mockRepo = {
        findByTypeAndScope: vi.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ daily_limit: 5, monthly_limit: 30 }),
      }
      mockGetRepo.mockReturnValue(mockRepo as any)
      const { rateLimitService, RateLimitError } = await import('../rateLimitService')
      await expect(rateLimitService.checkAndThrow('a@b.com', 'video')).rejects.toThrow(RateLimitError)
    })
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npm test src/lib/__tests__/rateLimitService.test.ts
```
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/rateLimitService.test.ts
git commit -m "test: add rate limit service tests"
```

---

### Task 5: Initialize Default Limits on Startup

**Files:**
- Modify: `src/lib/alaSqlService.ts`

- [ ] **Step 1: Call `rateLimitService.initDefaults()` after database init**

Add at top:
```ts
import { rateLimitService } from './rateLimitService'
```

Add after `dbInited = true`:
```ts
try {
  await rateLimitService.initDefaults()
} catch {
  // Non-critical
}
```

- [ ] **Step 2: Run build**

```bash
npm run build
```
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add src/lib/alaSqlService.ts
git commit -m "feat: initialize default rate limits on startup"
```

---

### Task 6: GenerateMediaButton Integration

**Files:**
- Modify: `src/components/Dream/GenerateMediaButton.tsx`

**Interfaces:**
- Consumes: `RateLimitService`, `RateLimitError`

- [ ] **Step 1: Add rate limit check + UI state**

Add imports:
```ts
import { rateLimitService, RateLimitError } from '../../lib/rateLimitService'
```

Add state for per-type remaining:
```ts
const [videoRemaining, setVideoRemaining] = useState<{ daily: number; monthly: number } | null>(null)
const [comicRemaining, setComicRemaining] = useState<{ daily: number; monthly: number } | null>(null)
```

Add load effect:
```ts
useEffect(() => {
  if (!user) return
  Promise.all([
    rateLimitService.getRemaining(user.email, 'video'),
    rateLimitService.getRemaining(user.email, 'comic'),
  ]).then(([v, c]) => {
    setVideoRemaining(v)
    setComicRemaining(c)
  })
}, [user])
```

- [ ] **Step 2: Modify `handleGenerateVideo` and `handleGenerateComic`**

Wrap each handler's body in a try/catch for RateLimitError:

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
  // ... rest unchanged
}
```

Same pattern for `handleGenerateComic`.

- [ ] **Step 3: Add `loadLimits` call after each `onCreated`**

Replace each `onCreated()` call with:
```ts
onCreated()
const [v, c] = await Promise.all([
  rateLimitService.getRemaining(user.email, 'video').catch(() => null),
  rateLimitService.getRemaining(user.email, 'comic').catch(() => null),
])
setVideoRemaining(v)
setComicRemaining(c)
```

- [ ] **Step 4: Modify dropdown buttons**

"生成影片" button:
```tsx
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
```

Same pattern for "生成漫畫".

- [ ] **Step 5: Run build**

```bash
npm run build
```
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add src/components/Dream/GenerateMediaButton.tsx
git commit -m "feat: integrate rate limit checks in media generation"
```

---

### Task 7: Settings Page — Quota Management

**Files:**
- Modify: `src/components/Settings/SettingsPage.tsx`

- [ ] **Step 1: Add quota management UI section**

Add imports:
```ts
import { getRateLimitRepository } from '../../repositories/factory'
import type { RateLimit } from '../../types/rateLimit'
```

Add state:
```ts
const [rateLimits, setRateLimits] = useState<RateLimit[]>([])
const [editingId, setEditingId] = useState<string | null>(null)
const [editDaily, setEditDaily] = useState('')
const [editMonthly, setEditMonthly] = useState('')
const [newUserEmail, setNewUserEmail] = useState('')
const [newType, setNewType] = useState<'video' | 'comic'>('video')
const [newDaily, setNewDaily] = useState('')
const [newMonthly, setNewMonthly] = useState('')
```

Add load function:
```ts
const loadRateLimits = useCallback(async () => {
  const repo = getRateLimitRepository()
  setRateLimits(await repo.findAll())
}, [])

useEffect(() => { loadRateLimits() }, [loadRateLimits])
```

Add the UI section after the existing settings fields (before the buttons section), in the `space-y-8` div:

```tsx
<m.div variants={slideUp}>
  <h2 className="text-sm tracking-wider text-gray-500 mb-4">配額管理</h2>
  {rateLimits.filter(r => r.scope === 'system').map(r => (
    <div key={r.id} className="mb-6 p-4 bg-gray-50 rounded">
      <p className="text-xs tracking-wider text-gray-400 mb-3">{r.type === 'video' ? '影片' : '漫畫'} — 系統預設</p>
      {editingId === r.id ? (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">每日</label>
          <input type="number" value={editDaily} onChange={e => setEditDaily(e.target.value)}
            className="w-20 px-2 py-1 text-xs border border-gray-200 rounded" />
          <label className="text-xs text-gray-400">每月</label>
          <input type="number" value={editMonthly} onChange={e => setEditMonthly(e.target.value)}
            className="w-20 px-2 py-1 text-xs border border-gray-200 rounded" />
          <button onClick={async () => {
            const repo = getRateLimitRepository()
            await repo.update(r.id, { daily_limit: Number(editDaily), monthly_limit: Number(editMonthly) })
            setEditingId(null)
            loadRateLimits()
          }} className="px-3 py-1 text-xs bg-gray-800 text-white rounded">更新</button>
          <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-gray-400">取消</button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">每日 {r.daily_limit} · 每月 {r.monthly_limit}</span>
          <button onClick={() => { setEditingId(r.id); setEditDaily(String(r.daily_limit)); setEditMonthly(String(r.monthly_limit)) }}
            className="text-xs text-gray-400 hover:text-gray-600">編輯</button>
        </div>
      )}
    </div>
  ))}

  {rateLimits.filter(r => r.scope !== 'system').map(r => (
    <div key={r.id} className="mb-3 flex items-center gap-3">
      <span className="text-xs text-gray-500 w-40 truncate">{r.scope}</span>
      <span className="text-xs text-gray-400 w-8">{r.type === 'video' ? '影片' : '漫畫'}</span>
      <span className="text-xs text-gray-400">每日 {r.daily_limit} · 每月 {r.monthly_limit}</span>
      <button onClick={async () => {
        const repo = getRateLimitRepository()
        await repo.delete(r.id)
        loadRateLimits()
      }} className="text-xs text-red-300 hover:text-red-500">刪除</button>
    </div>
  ))}

  <div className="mt-4 pt-4 border-t border-gray-200">
    <p className="text-xs text-gray-400 mb-2">新增使用者覆寫</p>
    <div className="flex items-center gap-2 flex-wrap">
      <input type="email" placeholder="user@email.com" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)}
        className="px-2 py-1 text-xs border border-gray-200 rounded w-44" />
      <select value={newType} onChange={e => setNewType(e.target.value as 'video' | 'comic')}
        className="px-2 py-1 text-xs border border-gray-200 rounded">
        <option value="video">影片</option>
        <option value="comic">漫畫</option>
      </select>
      <input type="number" placeholder="每日" value={newDaily} onChange={e => setNewDaily(e.target.value)}
        className="px-2 py-1 text-xs border border-gray-200 rounded w-16" />
      <input type="number" placeholder="每月" value={newMonthly} onChange={e => setNewMonthly(e.target.value)}
        className="px-2 py-1 text-xs border border-gray-200 rounded w-16" />
      <button onClick={async () => {
        if (!newUserEmail || !newDaily || !newMonthly) return
        const repo = getRateLimitRepository()
        await repo.create({ type: newType, scope: newUserEmail, daily_limit: Number(newDaily), monthly_limit: Number(newMonthly) })
        setNewUserEmail(''); setNewDaily(''); setNewMonthly('')
        loadRateLimits()
      }} className="px-3 py-1 text-xs bg-gray-800 text-white rounded">新增</button>
    </div>
  </div>
</m.div>
```

- [ ] **Step 2: Run build**

```bash
npm run build
```
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add src/components/Settings/SettingsPage.tsx
git commit -m "feat: add quota management UI to settings page"
```
