# Category Management Design

## Summary
Allow users to manage categories (name + color + icon) and attach multiple categories per dream via a `#`-triggered tag input.

## Data Model

### Category
```
interface Category {
  id: string          // generateId()
  name: string        // display name
  color: string       // hex e.g. #8B5CF6
  icon: string        // emoji character
  email: string       // owner
  sort_order: number
  created_at: string  // ISO
}
```

### Dream change
- `Dream.category?: string` → `Dream.tags: string[]` (array of category IDs)
- Sheet `dreams` adds column `tags` (JSON array)

## Storage
- New sheet `categories` with headers: `id, name, color, icon, email, sort_order, created_at`
- Dream sheet gets `tags` column (JSON string array)
- AlaSQL in-memory tables synced on every write (same pattern as current VideoRepository/DreamRepository)

## Repository
- `ICategoryRepository` interface: `findAll(email)`, `create(input)`, `update(id, data)`, `delete(id)`
- `SheetsCategoryRepository` implementation, registered in `factory.ts`
- DreamRepository updated to read/write `tags` field

## Components

### TagInput
Replaces the free-text **category** `<input>` in DreamContent edit mode.

- Shows selected categories as chips (colored background from `category.color`, emoji icon prefix)
- Input detects `#` prefix or focus to open dropdown
- Dropdown filters categories by name (fuzzy match)
- Already-selected categories excluded from dropdown
- Click chip's × to remove
- Uses `fetchAllCategories()` from repository for the list

### CategoryManagePage
New route `/categories`, linked in navigation bar alongside Calendar/Settings.

**Add row** at top: name input, color picker (8-10 preset swatches), emoji icon picker, add button.

**Category list** below: each row shows icon + name + color swatch + edit/delete buttons + usage count (how many dreams reference this category ID).

- Edit is inline (click edit icon → fields become editable)
- Delete triggers MessageBox confirmation; shows usage count as warning if > 0
- Deleted category IDs remain in dream.tags (TagInput renders them as gray "unknown" chips)

## Routing
- `BrowserRouter` gets new route `<Route path="/categories" element={<CategoryManagePage />} />`
- Navigation (Header) adds a "類別" link

## Files Changed / Created

- `src/types/category.ts` — new
- `src/repositories/interfaces/ICategoryRepository.ts` — new
- `src/repositories/sheets/CategoryRepository.ts` — new
- `src/repositories/factory.ts` — add getCategoryRepository
- `src/stores/categoryStore.ts` — new Zustand store
- `src/components/Category/CategoryManagePage.tsx` — new
- `src/components/ui/TagInput.tsx` — new
- `src/components/Dream/DreamContent.tsx` — replace category input with TagInput
- `src/components/Layout/Header.tsx` — add /categories link
- `src/App.tsx` — add route
- `src/types/dream.ts` — category → tags
- `src/repositories/sheets/DreamRepository.ts` — read/write tags field
- `src/stores/dreamStore.ts` — handle tags

## Testing
- CategoryRepository unit tests (CRUD)
- TagInput unit tests (dropdown, select, remove)
- DreamRepository updated tests for tags field
- CategoryManagePage smoke test
