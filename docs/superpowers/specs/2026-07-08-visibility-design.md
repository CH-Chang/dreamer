# Dream Visibility (Public/Private) Design

## Summary
Add a `visibility` field to each dream (`'public' | 'private'`, default `'private'`), with a minimalist switch toggle in both DreamForm and DreamContent edit mode, and a small "公開" label in DreamPreview.

## Data Model

```ts
// Dream type (add)
visibility: 'public' | 'private'

// UpdateDreamInput (add)
visibility?: 'public' | 'private'
```

## Sheets Schema
- New column `visibility` in the `dreams` sheet
- Existing rows: treated as `'private'` (default)

## Repository
- `DreamRepository.create()`: set `visibility: 'private'` in the new row
- `DreamRepository.update()`: read/write the `visibility` column if present in `UpdateDreamInput`
- AlaSQL sync: same as existing fields — the row object includes `visibility`

## Switch Component
- `src/components/ui/Switch.tsx`
- Props: `checked: boolean, onChange: (checked: boolean) => void, label?: string`
- Styling:
  - 32×16px pill, `rounded-full`
  - Private: `border border-gray-300`, knob on left (8px circle, bg-white)
  - Public: `bg-gray-300`, knob on right
  - Right-side label text: "公開" when checked, "私有" when unchecked
  - `text-xs tracking-wider`, gray text
  - No colors (no blue/green accent per yokanka style)

## Placement

### DreamForm (`src/components/Dream/DreamForm.tsx`)
- Below textarea, before the save button
- Inline: `[Switch 私有] [保存]`
- Pass `visibility` to `createDreamInput`

### DreamContent (`src/components/Dream/DreamContent.tsx`)
- Edit mode: below title input, inline with tag input row
- View mode: no change (visibility not shown in view mode — only in Preview)
- Pass `visibility` to `updateDream`

### DreamDetailPage
- No changes; visibility is managed through DreamContent

### DreamPreview (`src/components/Dream/DreamPreview.tsx`)
- Date line shows `2025-07-08  ·  公開` when `dream.visibility === 'public'`
- No indicator when private

## Files Changed
- `src/types/dream.ts` — add `visibility` to Dream, UpdateDreamInput
- `src/repositories/sheets/DreamRepository.ts` — handle visibility in create/update
- `src/components/ui/Switch.tsx` — new
- `src/components/Dream/DreamForm.tsx` — add switch
- `src/components/Dream/DreamContent.tsx` — add switch in edit mode
- `src/components/Dream/DreamPreview.tsx` — show "公開" label for public dreams
