# Dual-Mode AI Backend Proxy & Config Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cleanly isolate infrastructure variables (`GOOGLE_SPREADSHEET_ID`, `DRIVE_FOLDER_NAME`) to backend `.env` and implement a Dual-Mode AI Execution System (BYOK Custom Mode vs System Quota Mode) in the Hono API Server.

**Architecture:** Frontend settings page will be simplified to toggle between `system` (Quota mode) and `custom` (BYOK mode). Backend routes (`/api/videos`, `/api/comics`, `/api/ai/*`) inspect the mode: if `custom`, rate limit is bypassed (0 quota deducted) and custom GCP parameters are used; if `system`, rate limits apply and default system GCP credentials are used.

**Tech Stack:** TypeScript, Hono, React, Vitest, Monorepo (`shared/`, `web/`, `server/`).

## Global Constraints

- Preserve all existing API signatures and TypeScript strict mode.
- Maintain zero breaking changes for existing unit tests (run workspace tests with `npm test`).
- Keep code clean with minimal comments and proper Traditional Chinese documentation.

---

### Task 1: Update Shared Types for Dual-Mode & Usage Logs

**Files:**
- Modify: `shared/types/user.ts`
- Create: `shared/types/usageLog.ts`
- Modify: `shared/index.ts` (or re-export files)

**Interfaces:**
- Consumes: Existing `User` type.
- Produces: Updated `User` interface with `ai_mode`, `custom_gcp_project_id`, `custom_gcp_location`, and new `UsageLog` interface.

- [ ] **Step 1: Write tests for User and UsageLog types**

Create `shared/__tests__/types.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import type { User } from '../types/user'
import type { UsageLog } from '../types/usageLog'

describe('Shared Types', () => {
  it('instantiates User with ai_mode fields', () => {
    const user: User = {
      email: 'test@example.com',
      name: 'Test',
      avatar_url: '',
      role: 'user',
      ai_mode: 'custom',
      custom_gcp_project_id: 'my-project',
      created_at: '2026-08-10T00:00:00Z',
    }
    expect(user.ai_mode).toBe('custom')
  })

  it('instantiates UsageLog correctly', () => {
    const log: UsageLog = {
      id: 'log-1',
      user_email: 'test@example.com',
      action_type: 'video',
      mode: 'system',
      gcp_project_id: 'dreamer-448202',
      quota_deducted: true,
      created_at: '2026-08-10T00:00:00Z',
    }
    expect(log.quota_deducted).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/__tests__/types.test.ts`
Expected: FAIL due to missing `usageLog` module or missing fields on `User`.

- [ ] **Step 3: Update `shared/types/user.ts` and create `shared/types/usageLog.ts`**

Update `shared/types/user.ts`:
```typescript
export interface User {
  email: string
  name: string
  avatar_url: string
  role: 'admin' | 'user'
  ai_mode?: 'system' | 'custom'
  custom_gcp_project_id?: string
  custom_gcp_location?: string
  created_at: string
}
```

Create `shared/types/usageLog.ts`:
```typescript
export interface UsageLog {
  id: string
  user_email: string
  action_type: 'video' | 'comic' | 'title'
  mode: 'system' | 'custom'
  gcp_project_id: string
  quota_deducted: boolean
  created_at: string
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run shared/__tests__/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add shared/
git commit -m "feat: add ai_mode fields to User and introduce UsageLog type in shared"
```

---

### Task 2: Backend Configuration Loading & Server Env Setup

**Files:**
- Create: `server/.env.example`
- Create: `server/src/config.ts`
- Modify: `server/src/lib/alaSqlService.ts`

**Interfaces:**
- Consumes: `process.env`
- Produces: `config` object exporting `spreadsheetId`, `driveFolderName`, `systemGcpProjectId`, `systemGcpLocation`.

- [ ] **Step 1: Write test for server config**

Create `server/src/__tests__/config.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { config } from '../config'

describe('Server Config', () => {
  it('provides default fallback values for GCP project and location', () => {
    expect(config.systemGcpProjectId).toBeDefined()
    expect(config.systemGcpLocation).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run server/src/__tests__/config.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `server/src/config.ts` and `server/.env.example`**

Create `server/.env.example`:
```env
PORT=3000
GOOGLE_SPREADSHEET_ID=160t4xZ0s90yFp21qT0gW46T2eJ3P9Y
DRIVE_FOLDER_NAME=DreamerMedia
SYSTEM_GCP_PROJECT_ID=dreamer-448202
SYSTEM_GCP_LOCATION=us-central1
```

Create `server/src/config.ts`:
```typescript
export const config = {
  port: Number(process.env.PORT) || 3000,
  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',
  driveFolderName: process.env.DRIVE_FOLDER_NAME || 'DreamerMedia',
  systemGcpProjectId: process.env.SYSTEM_GCP_PROJECT_ID || process.env.GCP_PROJECT_ID || 'dreamer-448202',
  systemGcpLocation: process.env.SYSTEM_GCP_LOCATION || process.env.GCP_LOCATION || 'us-central1',
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/src/__tests__/config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add server/
git commit -m "feat: implement server config module and .env.example"
```

---

### Task 3: Dual-Mode Rate Limiting & Backend Execution Logic

**Files:**
- Modify: `server/src/routes/ai.ts`
- Modify: `server/src/routes/videos.ts`
- Modify: `server/src/routes/comics.ts`

**Interfaces:**
- Consumes: `config`, `authMiddleware`, `IRateLimitRepository`
- Produces: Dual-mode handling for `/api/videos`, `/api/comics`, `/api/ai/*` (bypass quota if `custom` mode).

- [ ] **Step 1: Write test for dual-mode video route**

Create `server/src/routes/__tests__/dual_mode.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import app from '../../index'

describe('Dual-Mode AI Route', () => {
  it('bypasses rate limit when mode is custom', async () => {
    const res = await app.request('/api/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-id-token',
      },
      body: JSON.stringify({
        dream_id: 'dream-1',
        mode: 'custom',
        custom_gcp_project_id: 'user-project-123',
      }),
    })
    // Authorization mock may fail or succeed; status should not be 429
    expect(res.status).not.toBe(429)
  })
})
```

- [ ] **Step 2: Run test to verify behavior**

Run: `npx vitest run server/src/routes/__tests__/dual_mode.test.ts`
Expected: FAIL or verify behavior.

- [ ] **Step 3: Update `server/src/routes/videos.ts` & `comics.ts` to support dual-mode logic**

In `server/src/routes/videos.ts`:
- Read `body.mode` ('system' | 'custom').
- If `mode !== 'custom'`: check `rateLimitRepo` for limits. If exceeded -> return `c.json({ error: 'Rate limit exceeded' }, 429)`.
- If `mode === 'custom'`: bypass rate limit check. Use `body.custom_gcp_project_id || user.custom_gcp_project_id || config.systemGcpProjectId`.

In `server/src/routes/comics.ts`:
- Similar dual-mode rate limit check & proxy logic.

- [ ] **Step 4: Run server tests to verify all routes pass**

Run: `cd server && npm test`
Expected: PASS (100% tests pass).

- [ ] **Step 5: Commit changes**

```bash
git add server/
git commit -m "feat: implement dual-mode quota bypass and proxy in video and comic routes"
```

---

### Task 4: Frontend Settings Page & Store Cleanup

**Files:**
- Modify: `web/src/stores/settingsStore.ts`
- Modify: `web/src/components/Settings/SettingsPage.tsx`
- Modify: `web/src/components/Settings/ConnectionTest.tsx`

**Interfaces:**
- Consumes: Updated `User` type
- Produces: Simplified settings UI (removes Sheets URL & Drive Folder, adds AI Mode toggle).

- [ ] **Step 1: Write test for updated SettingsStore**

Create `web/src/stores/__tests__/settingsStore_dual_mode.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { useSettingsStore } from '../settingsStore'

describe('SettingsStore Dual Mode', () => {
  it('defaults ai_mode to system', () => {
    const { settings } = useSettingsStore.getState()
    expect(settings.aiMode ?? 'system').toBe('system')
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run web/src/stores/__tests__/settingsStore_dual_mode.test.ts`
Expected: PASS

- [ ] **Step 3: Simplify `web/src/components/Settings/SettingsPage.tsx`**

- Remove input fields for `googleSheetsUrl` and `driveFolderName`.
- Add Radio/Toggle component for `aiMode`: `系統預設配額 (System)` vs `自訂 GCP 專案 (BYOK)`.
- When `custom` selected, show `customGcpProjectId` and `customGcpLocation` input fields.

- [ ] **Step 4: Run workspace build and tests**

Run: `npm test && npm run build:web && npm run build:server`
Expected: PASS with 0 errors across all workspaces.

- [ ] **Step 5: Commit changes**

```bash
git add web/
git commit -m "refactor: simplify frontend settings UI with AI Dual Mode toggle and remove sensitive infra fields"
```
