# Rate Limit System Design

## Overview
Daily & monthly rate limits for video and comic generation. Per-user overrides with system-wide defaults. All stored in Google Sheets.

## Data Model

### `rate_limits` sheet

| Column | Type | Description |
|---|---|---|
| `id` | string | UUID |
| `type` | string | `video` or `comic` |
| `scope` | string | `system` for global default, or `user@email.com` for per-user override |
| `daily_limit` | number | Max per calendar day |
| `monthly_limit` | number | Max per calendar month |
| `created_at` | string | ISO timestamp |
| `updated_at` | string | ISO timestamp |

### Schema registration
- Add `rate_limits` to `SHEET_NAMES` in `alaSqlService.ts`
- Add headers to `getHeadersForSheet` in `googleSheetsClient.ts`

### Initialization
On first run, insert two system rows if absent (checked by `scope=system`):
- `type=video, scope=system, daily=5, monthly=30`
- `type=comic, scope=system, daily=10, monthly=60`

## RateLimitService (`src/lib/rateLimitService.ts`)

```
getUsage(email: string, type: 'video' | 'comic'): { daily: number, monthly: number }
```
Queries `videos` or `comics` table via AlaSQL:
- `SELECT COUNT(*) FROM {table} WHERE email=? AND status!='failed' AND date(created_at)=date('now')`
- `SELECT COUNT(*) FROM {table} WHERE email=? AND status!='failed' AND strftime('%Y-%m', created_at)=strftime('%Y-%m', 'now')`

```
getLimit(email: string, type: 'video' | 'comic'): { daily: number, monthly: number }
```
Queries `rate_limits` table:
- First try `scope=email AND type=type`
- Fallback to `scope=system AND type=type`

```
getRemaining(email: string, type: 'video' | 'comic'): { daily: number, monthly: number }
```
Returns `limit - usage` for both daily and monthly.

```
checkAndThrow(email: string, type: 'video' | 'comic'): void
```
Calls `getRemaining`, if either daily or monthly <= 0, throws `RateLimitError` with message and remaining counts.

## RateLimitError

```ts
class RateLimitError extends Error {
  remaining: { daily: number; monthly: number }
  type: 'video' | 'comic'
}
```

## GenerateMediaButton Integration

In `handleGenerateVideo` / `handleGenerateComic`:
1. Call `rateLimitService.checkAndThrow(email, type)` before `repo.create()`
2. Catch `RateLimitError` → set loading state + show "已達上限 (3/5)" text on button
3. On mount and after each `onCreated`, refresh limit info

Button states:
- Normal: "生成" (dropdown with 生成影片 / 生成漫畫)
- Generating: "影片生成中..." / "漫畫生成中..."
- Rate-limited (daily): "今日已達上限 (3/3)"
- Rate-limited (monthly): "本月已達上限 (10/10)"
- Rate-limited (both): "已達上限"

## Settings Page — Quota Management Section

New section after existing settings fields, only visible when `isAdmin` is true (currently always true).

### Admin quota table

```
[影片配額]
  System 預設   |  每日: [5]  每月: [30]  [更新]
  使用者覆寫
  user@email.com | 每日: [10] 每月: [50]  [更新] [刪除]
  [新增使用者覆寫]
[漫畫配額]
  System 預設   |  每日: [10] 每月: [60]  [更新]
  ...
```

- Editable inline
- Changes write to `rate_limits` sheet + AlaSQL
- "新增使用者覆寫" opens an email input + daily/monthly fields

### Quota overview (for all users, visible to everyone)

在新設定的頁面上方或獨立區塊：

```
我的配額使用
  影片: 今日 3/5 · 本月 15/30
  漫畫: 今日 2/10 · 本月 12/60
```

## Files to create/modify

### New files
- `src/lib/rateLimitService.ts` — RateLimitService + RateLimitError
- `src/repositories/interfaces/IRateLimitRepository.ts` — interface
- `src/repositories/sheets/RateLimitRepository.ts` — sheets + AlaSQL CRUD
- `src/types/rateLimit.ts` — RateLimit type

### Modified files
- `src/lib/alaSqlService.ts` — add 'rate_limits' to SHEET_NAMES
- `src/lib/googleSheetsClient.ts` — add rate_limits headers
- `src/repositories/factory.ts` — add RateLimitRepository
- `src/types/settings.ts` — (no change needed)
- `src/components/Dream/GenerateMediaButton.tsx` — integrate rate limit check
- `src/components/Settings/SettingsPage.tsx` — add quota management UI

## Test Plan
- `src/lib/__tests__/rateLimitService.test.ts`
  - `getUsage` counts non-failed records correctly
  - `getLimit` falls back to system when no user override
  - `checkAndThrow` throws when over daily limit
  - `checkAndThrow` throws when over monthly limit
  - `checkAndThrow` passes when under both limits

## Future Considerations
- Role-based access: add `role` field to `users` table/sheet, gate admin UI on `role='admin'`
- Subscription tiers: each tier maps to a preset daily/monthly combo, written as user-scope rows on upgrade
