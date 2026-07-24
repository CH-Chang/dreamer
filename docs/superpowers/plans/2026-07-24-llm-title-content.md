# LLM 自動標題與內文潤飾 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add LLM-powered title candidate generation on dream save and content polishing in edit mode.

**Architecture:** A new `GeminiTextClient` wraps Vertex AI Gemini text API (reusing existing auth/GCP config patterns). Dream type gains a `title_candidates` field persisted as JSON in both SQLite and Google Sheets. DreamForm triggers title generation after save; DreamContent gets candidate title pills and a polish button.

**Tech Stack:** TypeScript, React, Vertex AI Gemini API, SQLite (alasql), Google Sheets API, Vitest

## Global Constraints

- Follow existing code patterns: `useAuthStore` for token, `useSettingsStore` for `gcpProjectId`
- New Gemini model: `gemini-2.0-flash-001`
- `title_candidates` stored as JSON string in Sheets/SQLite, typed as `string[]`
- LLM failures never block user flow — log and continue
- No new npm dependencies (use native `fetch` like veoApiClient/imgenApiClient)
- Existing tests must continue to pass

---

### Task 1: Data Model + LLM Text Client

**Files:**
- Modify: `src/types/dream.ts`
- Create: `src/lib/geminiTextClient.ts`
- Create: `src/lib/__tests__/geminiTextClient.test.ts`

**Interfaces:**
- Consumes: `useAuthStore` (token), `useSettingsStore` (gcpProjectId) — existing
- Produces: `GeminiTextClient.generate(prompt: string, systemPrompt?: string): Promise<string>`

- [ ] **Step 1: Add `title_candidates` to Dream type**

Edit `src/types/dream.ts`:

```typescript
export interface Dream {
  id: string
  email: string
  date: string
  description: string
  title?: string
  title_candidates?: string[]
  tags: string[]
  visibility: 'public' | 'private'
  edit_log?: string
  created_at: string
  updated_at: string
}
```

No changes needed to `CreateDreamInput` (title_candidates not set on create) or `UpdateDreamInput` (will be set via update).

- [ ] **Step 2: Create `src/lib/geminiTextClient.ts`**

```typescript
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'

interface GeminiTextResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
}

class GeminiTextClient {
  private model = 'gemini-2.0-flash-001'

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const token = useAuthStore.getState().token
    if (!token) throw new Error('Not authenticated')
    const { gcpProjectId } = useSettingsStore.getState().settings
    if (!gcpProjectId) throw new Error('GCP Project ID not configured')

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
      { role: 'user', parts: [{ text: prompt }] },
    ]

    const body: Record<string, unknown> = { contents }
    if (systemPrompt) {
      body.system_instruction = { parts: [{ text: systemPrompt }] }
    }

    const res = await fetch(
      `https://aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/us-central1/publishers/google/models/${this.model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      },
    )

    if (!res.ok) {
      const bodyText = await res.text()
      throw new Error(`Gemini API request failed: ${bodyText}`)
    }

    const data: GeminiTextResponse = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Gemini returned no text')

    return text
  }
}

export const geminiTextClient = new GeminiTextClient()
```

- [ ] **Step 3: Create LLM client tests**

Create `src/lib/__tests__/geminiTextClient.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
})

// Mock the stores
vi.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ token: 'test-token' }),
  },
}))

vi.mock('../../stores/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      settings: { gcpProjectId: 'test-project' },
    }),
  },
}))

describe('geminiTextClient', () => {
  it('sends request with correct URL and headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'title1\ntitle2\ntitle3' }] } }],
      }),
    })

    const { geminiTextClient } = await import('../geminiTextClient')
    const result = await geminiTextClient.generate('test prompt', 'test system prompt')

    expect(result).toBe('title1\ntitle2\ntitle3')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const callUrl = mockFetch.mock.calls[0][0]
    expect(callUrl).toContain('test-project')
    expect(callUrl).toContain('gemini-2.0-flash-001')
    expect(callUrl).toContain('generateContent')
  })

  it('throws when not authenticated', async () => {
    const authMock = await import('../../stores/authStore')
    vi.mocked(authMock.useAuthStore.getState).mockReturnValueOnce({ token: null })

    const { geminiTextClient } = await import('../geminiTextClient')
    await expect(geminiTextClient.generate('test')).rejects.toThrow('Not authenticated')
  })

  it('throws when API returns error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'API error',
    })

    const { geminiTextClient } = await import('../geminiTextClient')
    await expect(geminiTextClient.generate('test')).rejects.toThrow('Gemini API request failed')
  })

  it('throws when no text in response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidates: [] }),
    })

    const { geminiTextClient } = await import('../geminiTextClient')
    await expect(geminiTextClient.generate('test')).rejects.toThrow('Gemini returned no text')
  })

  it('includes system_instruction when systemPrompt provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'result' }] } }],
      }),
    })

    const { geminiTextClient } = await import('../geminiTextClient')
    await geminiTextClient.generate('prompt', 'system')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.system_instruction).toEqual({ parts: [{ text: 'system' }] })
  })
})
```

- [ ] **Step 4: Run tests to verify**

```bash
npx vitest run src/lib/__tests__/geminiTextClient.test.ts
```

Expected: all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/types/dream.ts src/lib/geminiTextClient.ts src/lib/__tests__/geminiTextClient.test.ts
git commit -m "feat: add title_candidates to Dream type, create GeminiTextClient"
```

---

### Task 2: Repository & Storage — Persist `title_candidates`

**Files:**
- Modify: `src/lib/googleSheetsClient.ts`
- Modify: `src/repositories/sheets/DreamRepository.ts`
- Modify: `src/repositories/__tests__/DreamRepository.test.ts`

**Interfaces:**
- Consumes: Dream type with `title_candidates`
- Produces: DreamRepository handles `title_candidates` in create/update

- [ ] **Step 1: Update Google Sheets headers**

In `src/lib/googleSheetsClient.ts`, add `title_candidates` to the `dreams` schema:

```typescript
dreams: [
  'id', 'email', 'date', 'description',
  'title', 'tags', 'title_candidates', 'edit_log', 'created_at', 'updated_at',
],
```

- [ ] **Step 2: Update DreamRepository.create**

In `src/repositories/sheets/DreamRepository.ts`, add `title_candidates` to the created dream object. Note: title_candidates is not set during creation, but we need to include it as empty in the sheet row:

```typescript
const dream: Dream = {
  id: generateId(),
  email: input.email,
  date: input.date,
  description: input.description,
  title_candidates: [],
  tags: [],
  visibility: input.visibility ?? 'private',
  edit_log: '',
  created_at: now,
  updated_at: now,
}
// ...
await appendSheetRow('dreams', [[
  dream.id, dream.email, dream.date, dream.description,
  dream.title || '', JSON.stringify(dream.tags), JSON.stringify(dream.title_candidates || []),
  dream.edit_log || '',
  dream.created_at, dream.updated_at,
]])
await query(
  `INSERT INTO dreams (id, email, date, description, title, tags, title_candidates, visibility, edit_log, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [dream.id, dream.email, dream.date, dream.description, dream.title || '', JSON.stringify(dream.tags), JSON.stringify(dream.title_candidates || []), dream.visibility, dream.edit_log || '', dream.created_at, dream.updated_at],
)
```

- [ ] **Step 3: Update DreamRepository.update**

In the `update` method, add handling for `title_candidates` after the existing `description` block:

```typescript
if (data.title_candidates !== undefined) {
  const ci = colIndex('title_candidates')
  if (ci !== -1) {
    const oldVal = newValues[ci] || '[]'
    const newVal = JSON.stringify(data.title_candidates)
    if (oldVal !== newVal) {
      changes.title_candidates = { from: oldVal, to: newVal }
      newValues[ci] = newVal
    }
  }
}
```

And in the SQL update section:

```typescript
if (data.title_candidates !== undefined) {
  updateFields.push("title_candidates = ?")
  updateValues.push(JSON.stringify(data.title_candidates))
}
```

And in the return dream object construction:

```typescript
dream.title_candidates = (() => {
  try {
    return JSON.parse(newValues[colIndex('title_candidates')] || '[]')
  } catch {
    return []
  }
})()
```

(Place this after the `tags` line in the return object.)

- [ ] **Step 4: Update DreamRepository test**

In `src/repositories/__tests__/DreamRepository.test.ts`, update the existing mock data to include `title_candidates`:

In the "creates a new dream" test, verify the append call includes `title_candidates`:

```typescript
it('creates a new dream with title_candidates', async () => {
  mockAppend.mockResolvedValue(undefined)

  const result = await repo.create({
    email: 'a@b.com',
    date: '2026-07-05',
    description: 'new dream',
  })

  expect(result.title_candidates).toEqual([])
  expect(mockAppend).toHaveBeenCalledWith('dreams', expect.any(Array))
  const appendArg = mockAppend.mock.calls[0][1][0]
  const candidatesIdx = 6  // index of title_candidates in headers
  expect(JSON.parse(appendArg[candidatesIdx])).toEqual([])
})
```

Update the update test headers:

```typescript
const headers = ['id', 'email', 'date', 'description', 'title', 'tags', 'title_candidates', 'edit_log', 'created_at', 'updated_at']
const existingRow = ['1', 'a@b.com', '2026-07-05', 'original', 'original title', '[]', '[]', '', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z']
```

Add a test for updating title_candidates:

```typescript
it('updates title_candidates', async () => {
  const headers = ['id', 'email', 'date', 'description', 'title', 'tags', 'title_candidates', 'edit_log', 'created_at', 'updated_at']
  const existingRow = ['1', 'a@b.com', '2026-07-05', 'dream desc', '', '[]', '[]', '', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z']
  mockFetchRows.mockResolvedValue([headers, existingRow])
  mockUpdateSheet.mockResolvedValue(undefined)

  const result = await repo.update('1', { title_candidates: ['夢境標題A', '夢境標題B'] })

  expect(result.title_candidates).toEqual(['夢境標題A', '夢境標題B'])
  expect(mockUpdateSheet).toHaveBeenCalledWith('dreams', 2, expect.arrayContaining([JSON.stringify(['夢境標題A', '夢境標題B'])]))
})
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/googleSheetsClient.ts src/repositories/sheets/DreamRepository.ts src/repositories/__tests__/DreamRepository.test.ts
git commit -m "feat: persist title_candidates in Sheets and SQLite"
```

---

### Task 3: DreamForm — Generate Title Candidates on Save

**Files:**
- Modify: `src/components/Dream/DreamForm.tsx`

**Interfaces:**
- Consumes: `geminiTextClient`, `getDreamRepository`
- Produces: Dreams saved with `title_candidates` populated

- [ ] **Step 1: Modify DreamForm to generate titles after save**

Replace the `handleSave` function in `src/components/Dream/DreamForm.tsx`:

```typescript
import { geminiTextClient } from '../../lib/geminiTextClient'

export function DreamForm({ date }: Props) {
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [generatingTitles, setGeneratingTitles] = useState(false)
  const [visibility, setVisibility] = useState<'public' | 'private'>('private')
  const { user } = useAuthStore()
  const { addDream } = useDreamStore()

  const handleSave = async () => {
    if (!description.trim() || !user || saving) return
    setSaving(true)
    try {
      const repo = getDreamRepository()
      const dream = await repo.create({
        email: user.email,
        date,
        description: description.trim(),
        visibility,
      })
      addDream(dream)

      setGeneratingTitles(true)
      try {
        const systemPrompt = '你是一個為夢境筆記產生標題的助手。根據以下夢境描述，產生 3 個簡潔、有意境的繁體中文標題（每個不超過 15 字），以換行分隔。只回傳標題，不需要編號。'
        const result = await geminiTextClient.generate(description.trim(), systemPrompt)
        const candidates = result.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3)
        if (candidates.length > 0) {
          const updated = await repo.update(dream.id, { title_candidates: candidates })
          addDream(updated)
        }
      } catch (err) {
        console.error('Failed to generate title candidates:', err)
      }
      setGeneratingTitles(false)

      setDescription('')
    } catch (err) {
      console.error('Failed to save dream:', err)
    } finally {
      setSaving(false)
    }
  }

  // ... rest of component
```

Update the save button text to reflect the generating state:

```typescript
<button
  whileTap={{ scale: 0.97 }}
  onClick={handleSave}
  disabled={saving || !description.trim()}
  className="px-6 py-2 bg-gray-800 text-white text-xs tracking-[0.2em] hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
>
  {saving && generatingTitles ? '生成標題中...' : saving ? '儲存中...' : '儲存'}
</button>
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/Dream/DreamForm.tsx
git commit -m "feat: generate title candidates on dream save"
```

---

### Task 4: DreamContent — Show and Select Title Candidates

**Files:**
- Modify: `src/components/Dream/DreamContent.tsx`

**Interfaces:**
- Consumes: Dream with `title_candidates`
- Produces: Title pills in edit mode, click-to-fill behavior

- [ ] **Step 1: Add candidate title pills to edit mode**

In the editing section of `DreamContent.tsx`, add candidate pills after the title input:

```typescript
// After the title input (after className="w-full font-serif...")
{dream.title_candidates && dream.title_candidates.length > 0 && (
  <div className="flex flex-wrap gap-1.5 mb-4 mt-1">
    {dream.title_candidates.map((candidate, i) => (
      <button
        key={i}
        type="button"
        onClick={() => setTitle(candidate)}
        className={`text-xs tracking-wider px-2 py-0.5 rounded-full border transition-colors ${
          title === candidate
            ? 'border-gray-800 bg-gray-800 text-white'
            : 'border-gray-200 text-gray-400 hover:border-gray-400'
        }`}
      >
        {candidate}
      </button>
    ))}
  </div>
)}
```

Place this between the title input and the `TagInput`/`Switch` row. Also ensure `dream` prop is accessible in the editing branch (it is already passed as prop).

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/Dream/DreamContent.tsx
git commit -m "feat: show title candidate pills in edit mode"
```

---

### Task 5: DreamContent — Content Polish Button

**Files:**
- Modify: `src/components/Dream/DreamContent.tsx`

**Interfaces:**
- Consumes: `geminiTextClient`
- Produces: Polish button that rewrites description text

- [ ] **Step 1: Add polish button to edit mode**

In `DreamContent.tsx`, add a state variable and a polish handler:

```typescript
import { geminiTextClient } from '../../lib/geminiTextClient'

// Inside the component:
const [polishing, setPolishing] = useState(false)

const handlePolish = async () => {
  if (!description.trim() || polishing) return
  setPolishing(true)
  try {
    const systemPrompt = '你是一個夢境日記的編輯助手。請潤飾以下夢境內文，保持原意、改善流暢度與可讀性，使用繁體中文。只回傳潤飾後的內文。'
    const result = await geminiTextClient.generate(description.trim(), systemPrompt)
    setDescription(result.trim())
  } catch (err) {
    console.error('Failed to polish description:', err)
  } finally {
    setPolishing(false)
  }
}
```

Add the button next to the description textarea:

```typescript
// After the textarea, before the cancel/save buttons
<div className="flex justify-between items-center mt-2">
  <button
    onClick={handlePolish}
    disabled={polishing || !description.trim()}
    className="text-xs tracking-wider text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
  >
    {polishing ? '潤飾中...' : '✨ 潤飾'}
  </button>
  <div className="flex gap-3">
    <button
      onClick={handleCancel}
      className="px-4 py-2 text-xs tracking-wider text-gray-400 hover:text-gray-600 transition-colors"
    >
      取消
    </button>
    <m.button
      whileTap={{ scale: 0.97 }}
      onClick={handleSave}
      disabled={saving}
      className="px-6 py-2 bg-gray-800 text-white text-xs tracking-[0.2em] hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {saving ? '儲存中...' : '儲存'}
    </m.button>
  </div>
</div>
```

Replace the existing `.flex justify-end gap-3 mt-4` block with this.

- [ ] **Step 2: Run all tests and build**

```bash
npx vitest run && npx tsc -b
```

Expected: all tests pass, TypeScript compiles without errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dream/DreamContent.tsx
git commit -m "feat: add content polish button in edit mode"
```
