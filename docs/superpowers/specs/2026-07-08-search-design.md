# Search Feature Design

## Summary
Add a search input to the navigation header that parses `#category`, `since:`, `to:` syntax, queries the in-memory AlaSQL database, and displays results on a `/search?q=` page using DreamPreview components.

## Search Syntax Parser (`src/lib/searchParser.ts`)

```ts
interface SearchQuery {
  tags: string[]     // category names from # prefix
  since: string      // ISO date or partial (e.g. '2025-01-01', '2025-01', '2025')
  to: string
  text: string       // remaining plain text
}

function parseSearchQuery(input: string): SearchQuery
```

Rules:
- `#name` extracts category name (union — dream matches if it has ANY of the tagged category IDs)
- `since:YYYY-MM-DD` / `since:YYYY-MM` / `since:YYYY` — if partial, pad to full date (`2025-01` → `2025-01-01`, `2025` → `2025-01-01`)
- `to:YYYY-MM-DD` / `to:YYYY-MM` / `to:YYYY` — if partial, pad to end of period (`2025-01` → `2025-01-31`, `2025` → `2025-12-31`)
- Remaining tokens joined as `text` for LIKE matching
- Multiple `#` tags: union (any match)
- All conditions AND-ed together

## Search Execution (`src/lib/searchService.ts`)

Runs entirely against AlaSQL (no API calls):

1. Resolve `#` tag names → category IDs via `SELECT id FROM categories WHERE name IN (...)`
2. Build dynamic SQL:
   - Tags: `WHERE EXISTS (SELECT 1 FROM JSON_EACH(dreams.tags) WHERE value IN (?,?,...))`
   - Since: `AND date >= ?`
   - To: `AND date <= ?`
   - Text: `AND (title LIKE '%?%' OR description LIKE '%?%')`
3. Return `Dream[]` ordered by date DESC

Since AlaSQL's JSON support is limited, use `INSTR(dreams.tags, catId)` as a simpler string-match approach for tag filtering, or filter in JS after querying.

## Header Search Input

In `src/components/Layout/Header.tsx`, between the logo and the user/settings area:
```
[ 夢貘 ]  [ 🔍 搜尋夢境... ]  [ user ][ 類別 ][ 設定 ]
```

- Input: `text-xs tracking-wider`, `bg-transparent`, `border-b border-gray-200`
- Placeholder: "搜尋夢境..."
- Enter: `navigate('/search?q=' + encodeURIComponent(value))`
- Maintain existing header layout (flex, same height)

## Search Results Page (`/search`)

New route under `MainLayout`:
```
.../dreamer/search?q=xxx
```

Components used:
- `DreamPreview` for each result (same as calendar panel)
- Header area with "← 返回日曆" link
- Result count header: "搜尋結果：xxx（3 則）"
- Empty state: "找不到符合的夢境"

Data flow:
1. Read `q` from `useSearchParams()`
2. Parse query via `parseSearchQuery(q)`
3. Execute search via `searchService.search(parsedQuery, user.email)`
4. Render results

## Files Changed/Created

- `src/lib/searchParser.ts` — new
- `src/lib/searchService.ts` — new
- `src/components/Layout/Header.tsx` — add search input
- `src/components/Search/SearchPage.tsx` — new
- `src/App.tsx` — add route
- `src/types/dream.ts` — no changes needed (uses existing Dream type)

## Testing
- `searchParser` unit tests (parsing edge cases)
- `searchService` integration test against AlaSQL
- SearchPage smoke test
