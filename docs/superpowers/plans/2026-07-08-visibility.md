# Dream Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add public/private visibility toggle to dreams with a minimalist switch UI.

**Architecture:** Add `visibility` field to Dream type, propagate through repository (sheets + AlaSQL), add Switch component, wire into DreamForm and DreamContent edit mode, show "公開" label in DreamPreview.

**Tech Stack:** React, TypeScript, Google Sheets API, AlaSQL

## Global Constraints
- All user-facing copy in Traditional Chinese
- Switch styling: yokanka minimalist — 32×16px pill, gray tones only (no blue/green), `rounded-full`
- Existing dreams default to `'private'`
- `visibility` in AlaSQL is stored as string, same as other fields

---

### Task 1: Type + Repository

**Files:**
- Modify: `src/types/dream.ts`
- Modify: `src/repositories/sheets/DreamRepository.ts`

**Interfaces:**
- Consumes: existing `Dream`, `CreateDreamInput`, `UpdateDreamInput` types
- Produces: `Dream.visibility: 'public' | 'private'`, `UpdateDreamInput.visibility?: 'public' | 'private'`

- [ ] **Step 1: Update `src/types/dream.ts`**

Add `visibility` field to `Dream`:
```ts
export interface Dream {
  id: string
  email: string
  date: string
  description: string
  title?: string
  tags: string[]
  visibility: 'public' | 'private'
  edit_log?: string
  created_at: string
  updated_at: string
}
```

Add `visibility` to `UpdateDreamInput`:
```ts
export interface UpdateDreamInput {
  title?: string
  tags?: string[]
  visibility?: 'public' | 'private'
  description?: string
}
```

- [ ] **Step 2: Update `DreamRepository.ts` — `create()`**

Add `visibility: 'private'` to the new dream object (after `tags: []`):
```ts
const dream: Dream = {
  id: generateId(),
  email: input.email,
  date: input.date,
  description: input.description,
  tags: [],
  visibility: 'private',
  edit_log: '',
  created_at: now,
  updated_at: now,
}
```

Update the `appendSheetRow` call to include `dream.visibility` after the tags column:
```ts
await appendSheetRow('dreams', [[
  dream.id, dream.email, dream.date, dream.description,
  dream.title || '', JSON.stringify(dream.tags), dream.visibility,
  dream.edit_log || '',
  dream.created_at, dream.updated_at,
]])
```

Update the `INSERT INTO dreams` query to include `visibility`:
```ts
await query(
  `INSERT INTO dreams (id, email, date, description, title, tags, visibility, edit_log, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [dream.id, dream.email, dream.date, dream.description, dream.title || '', JSON.stringify(dream.tags), dream.visibility, dream.edit_log || '', dream.created_at, dream.updated_at],
)
```

- [ ] **Step 3: Update `DreamRepository.ts` — `update()`**

After the tags handling block (around line 88), add visibility handling:
```ts
if (data.visibility !== undefined) {
  const ci = colIndex('visibility')
  if (ci !== -1 && newValues[ci] !== data.visibility) {
    changes.visibility = { from: newValues[ci] || '', to: data.visibility }
    newValues[ci] = data.visibility
  }
}
```

In the AlaSQL sync section, add visibility to the update fields:
```ts
if (data.visibility !== undefined) { updateFields.push("visibility = ?"); updateValues.push(data.visibility) }
```

In the dream object construction at the end, add:
```ts
visibility: (newValues[colIndex('visibility')] || 'private') as 'public' | 'private',
```

- [ ] **Step 4: Run build and tests**

```bash
npm run build
npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add src/types/dream.ts src/repositories/sheets/DreamRepository.ts
git commit -m "feat: add visibility field to dream type and repository"
```

---

### Task 2: Switch component

**Files:**
- Create: `src/components/ui/Switch.tsx`

- [ ] **Step 1: Create `src/lib/__tests__/Switch.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Switch } from '../Switch'

describe('Switch', () => {
  it('renders unchecked state with label 私有', () => {
    render(<Switch checked={false} onChange={() => {}} />)
    expect(screen.getByText('私有')).toBeInTheDocument()
  })

  it('renders checked state with label 公開', () => {
    render(<Switch checked={true} onChange={() => {}} />)
    expect(screen.getByText('公開')).toBeInTheDocument()
  })

  it('calls onChange when clicked', () => {
    const onChange = vi.fn()
    render(<Switch checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('calls onChange with false when currently checked', () => {
    const onChange = vi.fn()
    render(<Switch checked={true} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/Switch.test.tsx 2>&1
```
Expected: FAIL (module not found)

- [ ] **Step 3: Create `src/components/ui/Switch.tsx`**

```tsx
interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Switch({ checked, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-xs tracking-wider text-gray-400"
    >
      <span
        className={[
          'relative inline-block w-8 h-4 rounded-full transition-colors duration-200',
          checked ? 'bg-gray-300' : 'border border-gray-300',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </span>
      {checked ? '公開' : '私有'}
    </button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/Switch.test.tsx 2>&1
```
Expected: PASS (4 tests)

- [ ] **Step 5: Run full suite**

```bash
npx vitest run
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Switch.tsx src/lib/__tests__/Switch.test.tsx
git commit -m "feat: add Switch component"
```

---

### Task 3: DreamForm visibility switch

**Files:**
- Modify: `src/components/Dream/DreamForm.tsx`

- [ ] **Step 1: Update `src/components/Dream/DreamForm.tsx`**

Add import:
```tsx
import { Switch } from '../ui/Switch'
```

Add state:
```tsx
const [visibility, setVisibility] = useState<'public' | 'private'>('private')
```

Update the `handleSave` to pass visibility:
```tsx
const dream = await repo.create({
  email: user.email,
  date,
  description: description.trim(),
  visibility,
})
```

Update the save button area to include the switch before the button:
```tsx
<div className="flex items-center justify-between mt-3">
  <Switch checked={visibility === 'public'} onChange={(v) => setVisibility(v ? 'public' : 'private')} />
  <m.button
    whileTap={{ scale: 0.97 }}
    onClick={handleSave}
    disabled={saving || !description.trim()}
    className="px-6 py-2 bg-gray-800 text-white text-xs tracking-[0.2em] hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
    {saving ? '儲存中...' : '儲存'}
  </m.button>
</div>
```

- [ ] **Step 2: Run build and tests**

```bash
npm run build
npx vitest run
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Dream/DreamForm.tsx
git commit -m "feat: add visibility toggle to DreamForm"
```

---

### Task 4: DreamContent visibility switch

**Files:**
- Modify: `src/components/Dream/DreamContent.tsx`

- [ ] **Step 1: Update `src/components/Dream/DreamContent.tsx`**

Add import:
```tsx
import { Switch } from '../ui/Switch'
```

Add state for visibility:
```tsx
const [visibility, setVisibility] = useState<'public' | 'private'>(dream.visibility || 'private')
```

Update `handleCancel` to reset visibility:
```tsx
setVisibility(dream.visibility || 'private')
```

In edit mode, add the switch after the title input, inside the same div as TagInput:

Replace:
```tsx
<div className="mb-4">
  <TagInput selected={tags} onChange={setTags} />
</div>
```

With:
```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex-1">
    <TagInput selected={tags} onChange={setTags} />
  </div>
  <Switch checked={visibility === 'public'} onChange={(v) => setVisibility(v ? 'public' : 'private')} />
</div>
```

Update `handleSave` to include visibility:
```tsx
const data: UpdateDreamInput = {}
if (title !== (dream.title || '')) data.title = title
if (JSON.stringify(tags) !== JSON.stringify(dream.tags || [])) data.tags = tags
if (visibility !== (dream.visibility || 'private')) data.visibility = visibility
if (description !== dream.description) data.description = description
```

- [ ] **Step 2: Run build and tests**

```bash
npm run build
npx vitest run
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Dream/DreamContent.tsx
git commit -m "feat: add visibility toggle to DreamContent edit mode"
```

---

### Task 5: DreamPreview visibility label

**Files:**
- Modify: `src/components/Dream/DreamPreview.tsx`

- [ ] **Step 1: Update `src/components/Dream/DreamPreview.tsx`**

Change the date line from:
```tsx
<p className="text-xs text-gray-400 tracking-wider mb-2">
  {dream.date}
</p>
```

To:
```tsx
<p className="text-xs text-gray-400 tracking-wider mb-2">
  {dream.date}
  {dream.visibility === 'public' && <span className="ml-2">· 公開</span>}
</p>
```

- [ ] **Step 2: Run build and tests**

```bash
npm run build
npx vitest run
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Dream/DreamPreview.tsx
git commit -m "feat: show 公開 label for public dreams in preview"
```
