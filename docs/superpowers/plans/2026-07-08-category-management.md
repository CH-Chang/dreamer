# Category Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build category CRUD management and multi-tag selection on dreams.

**Architecture:** Categories stored in a new Google Sheets tab (`categories`). Dreams hold an array of category IDs in a `tags` column (JSON). AlaSQL in-memory tables synced on every write. A `#`-triggered TagInput replaces the free-text category field.

**Tech Stack:** Zustand, Google Sheets API, AlaSQL, React + TypeScript

## Global Constraints
- `generateId()` from `src/utils/idGenerator` for all IDs
- follow existing repository pattern: interface → sheets implementation → factory singleton
- AlaSQL in-memory table must be written in every `create`/`update`/`delete` (same pattern as VideoRepository after the fix)
- no backend server; all writes go to Google Sheets via OAuth Bearer token
- Tailwind v4 styling, existing color palette (#fcfcf9 base, serif headings)
- All user-facing copy in Traditional Chinese

---

### Task 1: Category + Dream type changes

**Files:**
- Create: `src/types/category.ts`
- Modify: `src/types/dream.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `Category`, `CreateCategoryInput`, `UpdateCategoryInput`, updated `Dream` type (category → tags)

- [ ] **Step 1: Create `src/types/category.ts`**

```ts
export interface Category {
  id: string
  name: string
  color: string
  icon: string
  email: string
  sort_order: number
  created_at: string
}

export interface CreateCategoryInput {
  name: string
  color: string
  icon: string
  email: string
}

export interface UpdateCategoryInput {
  name?: string
  color?: string
  icon?: string
  sort_order?: number
}
```

- [ ] **Step 2: Update `src/types/dream.ts`**

Replace `category?: string` with `tags: string[]`. Update `CreateDreamInput` and `UpdateDreamInput`:

```ts
export interface Dream {
  id: string
  email: string
  date: string
  description: string
  title?: string
  tags: string[]
  edit_log?: string
  created_at: string
  updated_at: string
}

export interface CreateDreamInput {
  email: string
  date: string
  description: string
}

export interface UpdateDreamInput {
  title?: string
  tags?: string[]
  description?: string
}
```

- [ ] **Step 3: Run build to verify types are valid**

```bash
npm run build
```
Expected: succeeds (other files that reference Dream.category may fail — those get fixed in later tasks)

- [ ] **Step 4: Commit**

```bash
git add src/types/category.ts src/types/dream.ts
git commit -m "feat: add Category type, update Dream.tags to string[]"
```

---

### Task 2: Category Repository Interface + Implementation + Factory

**Files:**
- Create: `src/repositories/interfaces/ICategoryRepository.ts`
- Create: `src/repositories/sheets/CategoryRepository.ts`
- Modify: `src/repositories/factory.ts`

**Interfaces:**
- Consumes: `Category`, `CreateCategoryInput`, `UpdateCategoryInput` (Task 1)
- Produces: `ICategoryRepository`, `SheetsCategoryRepository`, `getCategoryRepository()` factory function

- [ ] **Step 1: Add 'categories' to SHEET_NAMES in `src/lib/alaSqlService.ts`**

Change `const SHEET_NAMES = ['users', 'dreams', 'videos'] as const` to:
```ts
const SHEET_NAMES = ['users', 'dreams', 'videos', 'categories'] as const
```

- [ ] **Step 2: Create `src/repositories/interfaces/ICategoryRepository.ts`**

```ts
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../types/category'

export interface ICategoryRepository {
  findAll(email: string): Promise<Category[]>
  create(input: CreateCategoryInput): Promise<Category>
  update(id: string, data: UpdateCategoryInput): Promise<Category>
  delete(id: string): Promise<void>
}
```

- [ ] **Step 2: Create `src/repositories/sheets/CategoryRepository.ts`**

Follow the sheet tab pattern: headers `id, name, color, icon, email, sort_order, created_at`.

```ts
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../types/category'
import type { ICategoryRepository } from '../interfaces/ICategoryRepository'
import { query } from '../../lib/alaSqlService'
import { appendSheetRow, updateSheetRow, fetchSheetAsRows } from '../../lib/googleSheetsClient'
import { generateId } from '../../utils/idGenerator'

export class CategoryRepository implements ICategoryRepository {
  async findAll(email: string): Promise<Category[]> {
    return query<Category>('SELECT * FROM categories WHERE email = ? ORDER BY sort_order ASC', [email])
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const now = new Date().toISOString()
    const existing = await query<{ max_order: number }>('SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM categories WHERE email = ?', [input.email])
      .catch(() => [{ max_order: 0 }])
    const sortOrder = (existing[0]?.max_order ?? 0) + 1
    const category: Category = {
      id: generateId(),
      name: input.name,
      color: input.color,
      icon: input.icon,
      email: input.email,
      sort_order: sortOrder,
      created_at: now,
    }
    await appendSheetRow('categories', [[
      category.id, category.name, category.color, category.icon,
      category.email, category.sort_order, category.created_at,
    ]])
    await query(
      'INSERT INTO categories (id, name, color, icon, email, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [category.id, category.name, category.color, category.icon, category.email, category.sort_order, category.created_at],
    )
    return category
  }

  async update(id: string, data: UpdateCategoryInput): Promise<Category> {
    const rows = await fetchSheetAsRows('categories')
    if (rows.length < 2) throw new Error('Category not found')
    const headers = rows[0]
    const rowIdx = rows.findIndex((r, i) => i > 0 && r[0]?.trim() === id)
    if (rowIdx === -1) throw new Error('Category not found')
    const newValues = [...rows[rowIdx]]
    const colIndex = (name: string) => headers.findIndex((h) => h.trim() === name)
    if (data.name !== undefined) newValues[colIndex('name')] = data.name
    if (data.color !== undefined) newValues[colIndex('color')] = data.color
    if (data.icon !== undefined) newValues[colIndex('icon')] = data.icon
    if (data.sort_order !== undefined) newValues[colIndex('sort_order')] = data.sort_order

    await updateSheetRow('categories', rowIdx + 1, newValues)

    const updateFields: string[] = []
    const updateValues: unknown[] = []
    if (data.name !== undefined) { updateFields.push('name = ?'); updateValues.push(data.name) }
    if (data.color !== undefined) { updateFields.push('color = ?'); updateValues.push(data.color) }
    if (data.icon !== undefined) { updateFields.push('icon = ?'); updateValues.push(data.icon) }
    if (data.sort_order !== undefined) { updateFields.push('sort_order = ?'); updateValues.push(data.sort_order) }
    if (updateFields.length > 0) {
      updateValues.push(id)
      await query(`UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`, updateValues)
    }

    const ci = (name: string) => colIndex(name)
    return {
      id: newValues[ci('id')] || id,
      name: newValues[ci('name')] || '',
      color: newValues[ci('color')] || '#6B7280',
      icon: newValues[ci('icon')] || '',
      email: newValues[ci('email')] || '',
      sort_order: parseInt(newValues[ci('sort_order')]) || 0,
      created_at: newValues[ci('created_at')] || '',
    }
  }

  async delete(id: string): Promise<void> {
    const rows = await fetchSheetAsRows('categories')
    if (rows.length < 2) return
    const headers = rows[0]
    const rowIdx = rows.findIndex((r, i) => i > 0 && r[0]?.trim() === id)
    if (rowIdx === -1) return
    const newValues = [...rows[rowIdx]]
    const colIndex = (name: string) => headers.findIndex((h) => h.trim() === name)

    await updateSheetRow('categories', rowIdx + 1, newValues.map((_, i) => ''))
    await query('DELETE FROM categories WHERE id = ?', [id])
  }
}
```

- [ ] **Step 3: Update `src/repositories/factory.ts`**

```ts
import type { ICategoryRepository } from './interfaces/ICategoryRepository'
import { CategoryRepository } from './sheets/CategoryRepository'

let categoryRepo: ICategoryRepository

export function getCategoryRepository(): ICategoryRepository {
  if (!categoryRepo) categoryRepo = new CategoryRepository()
  return categoryRepo
}
```

Add the import block at top (after existing imports):
```ts
import type { ICategoryRepository } from './interfaces/ICategoryRepository'
import { CategoryRepository } from './sheets/CategoryRepository'
```

- [ ] **Step 4: Run build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/repositories/interfaces/ICategoryRepository.ts src/repositories/sheets/CategoryRepository.ts src/repositories/factory.ts
git commit -m "feat: add CategoryRepository + factory"
```

---

### Task 3: Category Store

**Files:**
- Create: `src/stores/categoryStore.ts`

**Interfaces:**
- Consumes: `Category`, `ICategoryRepository`
- Produces: `useCategoryStore`

- [ ] **Step 1: Create `src/stores/categoryStore.ts`**

```ts
import { create } from 'zustand'
import type { Category } from '../types/category'
import { getCategoryRepository } from '../repositories/factory'
import { useAuthStore } from './authStore'

interface CategoryState {
  categories: Category[]
  loading: boolean
  loadCategories: () => Promise<void>
  createCategory: (name: string, color: string, icon: string) => Promise<void>
  updateCategory: (id: string, data: { name?: string; color?: string; icon?: string }) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  loading: false,
  loadCategories: async () => {
    const user = useAuthStore.getState().user
    if (!user) return
    set({ loading: true })
    const repo = getCategoryRepository()
    const categories = await repo.findAll(user.email)
    set({ categories, loading: false })
  },
  createCategory: async (name, color, icon) => {
    const user = useAuthStore.getState().user
    if (!user) return
    const repo = getCategoryRepository()
    const category = await repo.create({ name, color, icon, email: user.email })
    set((s) => ({ categories: [...s.categories, category] }))
  },
  updateCategory: async (id, data) => {
    const repo = getCategoryRepository()
    const updated = await repo.update(id, data)
    set((s) => ({
      categories: s.categories.map((c) => (c.id === id ? updated : c)),
    }))
  },
  deleteCategory: async (id) => {
    await getCategoryRepository().delete(id)
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }))
  },
}))
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/categoryStore.ts
git commit -m "feat: add categoryStore"
```

---

### Task 4: Update DreamRepository for tags

**Files:**
- Modify: `src/repositories/sheets/DreamRepository.ts`

**Interfaces:**
- Consumes: updated `Dream` type with `tags: string[]` (Task 1)
- Produces: repository methods that read/write `tags` from sheets + AlaSQL

- [ ] **Step 1: Update DreamRepository.create to write tags**

In the `create` method, after initializing `dream`, add `tags: []` to the object. Update the `appendSheetRow` call to include `tags` column after `category`:

Current sheet headers: `id, email, date, description, title, category, edit_log, created_at, updated_at`
New headers: `id, email, date, description, title, tags, edit_log, created_at, updated_at`

In `create`:
```ts
const dream: Dream = {
  id: generateId(),
  email: input.email,
  date: input.date,
  description: input.description,
  tags: [],
  edit_log: '',
  created_at: now,
  updated_at: now,
}
await appendSheetRow('dreams', [[
  dream.id, dream.email, dream.date, dream.description,
  dream.title || '', JSON.stringify(dream.tags), dream.edit_log || '',
  dream.created_at, dream.updated_at,
]])
await query(
  `INSERT INTO dreams (id, email, date, description, title, tags, edit_log, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [dream.id, dream.email, dream.date, dream.description, dream.title || '', JSON.stringify(dream.tags), dream.edit_log || '', dream.created_at, dream.updated_at],
)
```

Replace `category` with `tags` in the sheet row and AlaSQL insert.

- [ ] **Step 2: Update DreamRepository.update to handle tags**

In the `update` method, add `tags` handling alongside existing `title`, `category`, `description`:

```ts
const colIndex = (name: string) => headers.findIndex((h) => h.trim() === name)

const newValues = [...oldValues]
if (data.title !== undefined) {
  const ci = colIndex('title')
  if (ci !== -1 && newValues[ci] !== data.title) {
    changes.title = { from: newValues[ci] || '', to: data.title }
    newValues[ci] = data.title
  }
}
if (data.tags !== undefined) {
  const ci = colIndex('tags')
  if (ci !== -1) {
    const oldTags = newValues[ci] || '[]'
    const newTags = JSON.stringify(data.tags)
    if (oldTags !== newTags) {
      changes.tags = { from: oldTags, to: newTags }
      newValues[ci] = newTags
    }
  }
}
```

In the AlaSQL sync block after `updateSheetRow`:
```ts
const updateFields: string[] = ["updated_at = ?"]
const updateValues: unknown[] = [now]
if (data.title !== undefined) { updateFields.push("title = ?"); updateValues.push(data.title) }
if (data.tags !== undefined) { updateFields.push("tags = ?"); updateValues.push(JSON.stringify(data.tags)) }
if (data.description !== undefined) { updateFields.push("description = ?"); updateValues.push(data.description) }
updateValues.push(id)
if (updateFields.length > 1) {
  await query(`UPDATE dreams SET ${updateFields.join(", ")} WHERE id = ?`, updateValues)
}
```

Remove `category` references where they appear (the old `COLUMNS` was already removed in a prior fix, but check for any remaining `category` usage in the file).

In the `dream` object returned (after updateSheetRow), replace `category` with `tags`:
```ts
const dream: Dream = {
  id: newValues[colIndex('id')] || id,
  email: newValues[colIndex('email')] || '',
  date: newValues[colIndex('date')] || '',
  description: newValues[colIndex('description')] || '',
  title: newValues[colIndex('title')] || undefined,
  tags: JSON.parse(newValues[colIndex('tags')] || '[]'),
  edit_log: newValues[colIndex('edit_log')] || undefined,
  created_at: newValues[colIndex('created_at')] || '',
  updated_at: newValues[colIndex('updated_at')] || '',
}
```

- [ ] **Step 3: Run build**

```bash
npm run build
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add src/repositories/sheets/DreamRepository.ts
git commit -m "feat: DreamRepository handles tags instead of category"
```

---

### Task 5: TagInput Component

**Files:**
- Create: `src/components/ui/TagInput.tsx`

**Interfaces:**
- Consumes: `Category[]` from store, `getCategoryRepository()`
- Produces: `<TagInput selected={string[]} onChange={(ids: string[]) => void} />`

- [ ] **Step 1: Create `src/components/ui/TagInput.tsx`**

```tsx
import { useState, useRef, useEffect } from 'react'
import { motion as m, AnimatePresence } from 'framer-motion'
import type { Category } from '../../types/category'
import { getCategoryRepository } from '../../repositories/factory'
import { useAuthStore } from '../../stores/authStore'

interface Props {
  selected: string[]
  onChange: (ids: string[]) => void
}

export function TagInput({ selected, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const user = useAuthStore.getState().user
    if (!user) return
    getCategoryRepository().findAll(user.email).then(setCategories)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = categories.filter(
    (c) => !selected.includes(c.id) && c.name.includes(query.replace(/^#/, '')),
  )

  const select = (cat: Category) => {
    onChange([...selected, cat.id])
    setQuery('')
    inputRef.current?.focus()
  }

  const remove = (catId: string) => {
    onChange(selected.filter((id) => id !== catId))
  }

  const selectedCats = categories.filter((c) => selected.includes(c.id))

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {selectedCats.map((cat) => (
          <span
            key={cat.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] tracking-wider"
            style={{ backgroundColor: cat.color + '20', color: cat.color }}
          >
            {cat.icon} {cat.name}
            <button
              onClick={() => remove(cat.id)}
              className="ml-0.5 hover:opacity-60 transition-opacity"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={selected.length === 0 ? '# 輸入標籤名稱...' : ''}
        className="w-full text-xs tracking-wider text-gray-500 bg-transparent border-b border-gray-200 pb-1 focus:outline-none focus:border-gray-400 transition-colors placeholder-gray-200"
      />
      <AnimatePresence>
        {open && filtered.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto"
          >
            {filtered.map((cat) => (
              <button
                key={cat.id}
                onClick={() => select(cat)}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <span>{cat.icon}</span>
                <span style={{ color: cat.color }}>{cat.name}</span>
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/TagInput.tsx
git commit -m "feat: add TagInput component"
```

---

### Task 6: DreamContent + DreamPreview integration

**Files:**
- Modify: `src/components/Dream/DreamContent.tsx`
- Modify: `src/components/Dream/DreamPreview.tsx`

**Interfaces:**
- Consumes: `TagInput`, updated `Dream` type
- Produces: updated edit/view components using TagInput + tag chips

- [ ] **Step 1: Update DreamContent.tsx edit mode**

Replace category input with TagInput. Add import:
```tsx
import { TagInput } from '../ui/TagInput'
```

Replace `const [category, setCategory] = useState(dream.category || '')` with:
```tsx
const [tags, setTags] = useState<string[]>(dream.tags || [])
```

Replace the category `<input>` block:
```tsx
<div className="mb-4">
  <TagInput selected={tags} onChange={setTags} />
</div>
```

In `handleSave`, change:
```tsx
if (JSON.stringify(tags) !== JSON.stringify(dream.tags || [])) data.tags = tags
```

In `handleCancel`, change:
```tsx
setTags(dream.tags || [])
```

- [ ] **Step 2: Update DreamContent.tsx view mode to display tag chips**

The view mode shows `{dream.category && (...)}`. Replace with tag chips:

```tsx
{dream.tags && dream.tags.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-2">
    {dream.tags.map((tagId) => {
      const cat = categories.find((c) => c.id === tagId)
      return cat ? (
        <span
          key={tagId}
          className="inline-flex items-center gap-0.5 text-[10px] tracking-wider px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: cat.color + '20', color: cat.color }}
        >
          {cat.icon} {cat.name}
        </span>
      ) : (
        <span key={tagId} className="inline-flex items-center gap-0.5 text-[10px] tracking-wider px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-300">
          ???
        </span>
      )
    })}
  </div>
)}
```

Add import at top:
```tsx
import { useCategoryStore } from '../../stores/categoryStore'
```

Inside component:
```tsx
const { categories } = useCategoryStore()
```

- [ ] **Step 3: Run build**

```bash
npm run build
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

- [ ] **Step 5: Commit DreamContent changes**

```bash
git add src/components/Dream/DreamContent.tsx
git commit -m "feat: DreamContent uses TagInput + tag chips"
```

- [ ] **Step 6: Update DreamPreview.tsx to display tag chips**

Replace the category display with same pattern as DreamContent view mode:

```tsx
import { useCategoryStore } from '../../stores/categoryStore'
```

Inside component add:
```tsx
const { categories } = useCategoryStore()
```

Replace:
```tsx
{dream.category && (
  <span className="inline-block mt-2 text-[10px] tracking-wider text-gray-300">
    {dream.category}
  </span>
)}
```
With:
```tsx
{dream.tags && dream.tags.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-2">
    {dream.tags.map((tagId) => {
      const cat = categories.find((c) => c.id === tagId)
      return cat ? (
        <span
          key={tagId}
          className="inline-flex items-center gap-0.5 text-[10px] tracking-wider px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: cat.color + '20', color: cat.color }}
        >
          {cat.icon} {cat.name}
        </span>
      ) : (
        <span key={tagId} className="inline-flex items-center gap-0.5 text-[10px] tracking-wider px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-300">
          ???
        </span>
      )
    })}
  </div>
)}
```

- [ ] **Step 7: Run build**

```bash
npm run build
```

- [ ] **Step 8: Run tests**

```bash
npx vitest run
```

- [ ] **Step 9: Commit DreamPreview changes**

```bash
git add src/components/Dream/DreamPreview.tsx
git commit -m "feat: DreamPreview shows tag chips from categories"
```

### Task 7: Category Management Page

**Files:**
- Create: `src/components/Category/CategoryManagePage.tsx`

**Interfaces:**
- Consumes: `useCategoryStore`
- Produces: management page with add row + category list

- [ ] **Step 1: Create `src/components/Category/CategoryManagePage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { motion as m } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useCategoryStore } from '../../stores/categoryStore'
import { query } from '../../lib/alaSqlService'
import { MessageBox } from '../ui/MessageBox'

const COLOR_PRESETS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#84CC16']
const EMOJI_LIST = ['💼', '✈️', '🏋️', '📚', '🎨', '🎵', '🍽️', '🏠', '❤️', '⭐', '🌙', '☀️', '🌈', '🔥', '💡', '🎬', '📝', '🧘', '🎮', '🌿']

export function CategoryManagePage() {
  const { categories, loadCategories, createCategory, updateCategory, deleteCategory } = useCategoryStore()
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLOR_PRESETS[0])
  const [icon, setIcon] = useState(EMOJI_LIST[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [usageCount, setUsageCount] = useState(0)
  const [usageMap, setUsageMap] = useState<Record<string, number>>({})

  useEffect(() => { loadCategories() }, [loadCategories])

  useEffect(() => {
    query<{ tags: string }>('SELECT tags FROM dreams').then((rows) => {
      const map: Record<string, number> = {}
      for (const row of rows) {
        if (!row.tags) continue
        try {
          const ids: string[] = JSON.parse(row.tags)
          for (const id of ids) map[id] = (map[id] || 0) + 1
        } catch { /* ignore malformed tags */ }
      }
      setUsageMap(map)
    })
  }, [])

  const handleAdd = async () => {
    if (!name.trim()) return
    await createCategory(name.trim(), color, icon)
    setName('')
  }

  const startEdit = (cat: { id: string; name: string; color: string; icon: string }) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color)
    setEditIcon(cat.icon)
  }

  const handleUpdate = async () => {
    if (!editingId) return
    await updateCategory(editingId, { name: editName, color: editColor, icon: editIcon })
    setEditingId(null)
  }

  const confirmDelete = (id: string) => {
    setUsageCount(usageMap[id] || 0)
    setDeleteConfirm(id)
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    await deleteCategory(deleteConfirm)
    setDeleteConfirm(null)
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
    >
      <Link to="/calendar" className="text-xs text-gray-400 hover:text-gray-600 tracking-wider transition-colors inline-block mb-6">
        ← 返回日曆
      </Link>
      <h1 className="text-xl font-serif tracking-widest text-gray-700 mb-6">類別管理</h1>

      <div className="flex items-end gap-3 mb-8 flex-wrap">
        <div>
          <p className="text-[10px] text-gray-300 tracking-wider mb-1">名稱</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="類別名稱"
            className="text-xs text-gray-600 bg-transparent border-b border-gray-200 pb-1 w-32 focus:outline-none focus:border-gray-400 placeholder-gray-200" />
        </div>
        <div>
          <p className="text-[10px] text-gray-300 tracking-wider mb-1">顏色</p>
          <div className="flex gap-1">
            {COLOR_PRESETS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-4 h-4 rounded-full transition-transform ${color === c ? 'scale-125 ring-1 ring-gray-400' : ''}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-gray-300 tracking-wider mb-1">圖示</p>
          <div className="flex gap-0.5 flex-wrap max-w-[200px]">
            {EMOJI_LIST.map((e) => (
              <button key={e} onClick={() => setIcon(e)}
                className={`text-sm w-5 h-5 flex items-center justify-center rounded ${icon === e ? 'bg-gray-100' : ''}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <m.button whileTap={{ scale: 0.97 }} onClick={handleAdd}
          className="px-4 py-1.5 bg-gray-800 text-white text-[11px] tracking-wider hover:bg-gray-700 transition-colors">
          新增
        </m.button>
      </div>

      <div className="space-y-1">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-3 py-2 border-b border-gray-100">
            {editingId === cat.id ? (
              <>
                <input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} className="w-8 text-xs bg-transparent border-b border-gray-200" />
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-xs text-gray-600 bg-transparent border-b border-gray-200 flex-1 focus:outline-none focus:border-gray-400" />
                <div className="flex gap-1">
                  {COLOR_PRESETS.map((c) => (
                    <button key={c} onClick={() => setEditColor(c)}
                      className={`w-3.5 h-3.5 rounded-full ${editColor === c ? 'ring-1 ring-gray-400' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <button onClick={handleUpdate} className="text-[10px] text-gray-400 hover:text-gray-600 tracking-wider">儲存</button>
                <button onClick={() => setEditingId(null)} className="text-[10px] text-gray-300 hover:text-gray-500 tracking-wider">取消</button>
              </>
            ) : (
              <>
                <span>{cat.icon}</span>
                <span className="text-xs text-gray-600 flex-1" style={{ color: cat.color }}>{cat.name}</span>
                <span className="text-[10px] text-gray-300 tracking-wider">{usageMap[cat.id] || 0} 次</span>
                <button onClick={() => startEdit(cat)} className="text-[10px] text-gray-300 hover:text-gray-500 tracking-wider">編輯</button>
                <button onClick={() => confirmDelete(cat.id)} className="text-[10px] text-gray-300 hover:text-red-400 tracking-wider">刪除</button>
              </>
            )}
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-xs text-gray-300 tracking-wider text-center py-8">尚未建立任何類別</p>
        )}
      </div>

      <MessageBox
        show={deleteConfirm !== null}
        title="刪除類別"
        message={usageCount > 0 ? `此類別已被 ${usageCount} 則夢境使用。刪除後這些夢境中的標籤將顯示為「未知類別」。確定刪除？` : '確定刪除此類別？'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </m.div>
  )
}
```

Note: The `DreamRepository` might not have `findAll` — if not, remove the usage count display or use a different approach. The current DreamRepository only has `findByMonth` and `findById`. For usage count, we can query the AlaSQL table directly:

```ts
import { query } from '../../lib/alaSqlService'

// in confirmDelete:
const rows = await query<{ cnt: number }>('SELECT COUNT(*) as cnt FROM dreams WHERE tags LIKE ?', [`%"${id}"%`])
const count = rows[0]?.cnt ?? 0
```

Use this approach instead of `repo.findAll`.

- [ ] **Step 2: Create directory and run build**

```bash
mkdir -p src/components/Category
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Category/CategoryManagePage.tsx
git commit -m "feat: add CategoryManagePage"
```

---

### Task 8: Navigation + Routing

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Layout/Header.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: working `/categories` route + nav link

- [ ] **Step 1: Update `src/App.tsx`**

Add import:
```tsx
import { CategoryManagePage } from './components/Category/CategoryManagePage'
```

Add route inside `<Routes>`:
```tsx
<Route path="/categories" element={<CategoryManagePage />} />
```

The route should be inside the `<MainLayout />` wrapper since it requires auth:
```tsx
<Route element={<MainLayout />}>
  <Route path="/calendar" element={<CalendarPage />} />
  <Route path="/dream/:id" element={<DreamDetailPage />} />
  <Route path="/categories" element={<CategoryManagePage />} />
</Route>
```

- [ ] **Step 2: Update `src/components/Layout/Header.tsx`**

Add a "類別" link before "設定":
```tsx
<Link to="/categories" className="hover:text-gray-600 transition-colors">類別</Link>
<Link to="/settings" className="hover:text-gray-600 transition-colors">設定</Link>
```

- [ ] **Step 3: Run build**

```bash
npm run build
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/Layout/Header.tsx
git commit -m "feat: add /categories route and nav link"
```
