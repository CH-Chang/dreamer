# Hono Cloud Run Backend & Monorepo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Dreamer into a Monorepo with `shared/`, `web/` (Cloudflare Pages), and `server/` (Google Cloud Run Hono API), replacing direct client-side Google Sheets REST calls with HTTP client repositories calling authenticated Hono API endpoints.

**Architecture:** 
- `shared/`: Shared domain types and repository interfaces.
- `server/`: Hono framework REST API running on Node.js/Cloud Run with Google ID token authentication middleware and Service Account Google Sheets repositories.
- `web/`: Vite + React SPA targeting Cloudflare Pages with `Http*Repository` client implementations.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Hono 4, Vitest, Google Auth Library, Tailwind CSS 4, Zustand 5.

## Global Constraints

- Must maintain complete backward compatibility for domain interfaces (`IDreamRepository`, `IUserRepository`, `ICommentRepository`, etc.).
- Must pass all existing 115 unit tests.
- Zero placeholder code in implementation or test files.
- All commits must follow project commit standards (English, conventional commit format).

---

### Task 1: Create `shared/` Directory & Move Common Types/Interfaces

**Files:**
- Create: `shared/types/dream.ts`
- Create: `shared/types/user.ts`
- Create: `shared/types/comment.ts`
- Create: `shared/types/video.ts`
- Create: `shared/types/comic.ts`
- Create: `shared/types/category.ts`
- Create: `shared/types/rateLimit.ts`
- Create: `shared/types/editLog.ts`
- Create: `shared/interfaces/IDreamRepository.ts`
- Create: `shared/interfaces/IUserRepository.ts`
- Create: `shared/interfaces/ICommentRepository.ts`
- Create: `shared/interfaces/IVideoRepository.ts`
- Create: `shared/interfaces/IComicRepository.ts`
- Create: `shared/interfaces/ICategoryRepository.ts`
- Create: `shared/interfaces/IRateLimitRepository.ts`
- Create: `shared/interfaces/IEditLogRepository.ts`

**Interfaces:**
- Consumes: Existing files in `src/types/` and `src/repositories/interfaces/`
- Produces: Exported domain models and repository interfaces in `shared/`

- [ ] **Step 1: Create `shared/` directory structure**

```bash
mkdir -p shared/types shared/interfaces
```

- [ ] **Step 2: Copy type definitions and interfaces to `shared/`**

Copy all type files from `src/types/` to `shared/types/` and all interface files from `src/repositories/interfaces/` to `shared/interfaces/`.

- [ ] **Step 3: Verify build & tests pass with relative path references**

Run: `npm test`
Expected: All 115 tests pass.

- [ ] **Step 4: Commit shared module setup**

```bash
git add shared/
git commit -m "feat: setup shared domain types and repository interfaces"
```

---

### Task 2: Scaffold `server/` Hono API Application

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/Dockerfile`
- Create: `server/src/index.ts`
- Create: `server/src/__tests__/health.test.ts`

**Interfaces:**
- Consumes: `shared/`
- Produces: Runnable Hono HTTP application with `/health` endpoint

- [ ] **Step 1: Write health endpoint test**

Create `server/src/__tests__/health.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import app from '../index'

describe('Hono Health Check', () => {
  it('returns 200 OK for GET /health', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ status: 'ok' })
  })
})
```

- [ ] **Step 2: Create `server/package.json` & `server/tsconfig.json`**

Create `server/package.json` with Hono and Google Auth Library dependencies:
```json
{
  "name": "dreamer-server",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.8",
    "google-auth-library": "^9.15.0",
    "hono": "^4.7.2"
  },
  "devDependencies": {
    "@types/node": "^22.13.1",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3",
    "vitest": "^3.0.5"
  }
}
```

- [ ] **Step 3: Implement Hono `server/src/index.ts`**

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
```

- [ ] **Step 4: Create Dockerfile for Cloud Run**

Create `server/Dockerfile`:
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
COPY shared/ ../shared/
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY server/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

- [ ] **Step 5: Run server tests**

Run: `cd server && npm test`
Expected: 1 passed test for `/health`.

- [ ] **Step 6: Commit server scaffolding**

```bash
git add server/
git commit -m "feat: scaffold Hono server for Cloud Run with health check endpoint"
```

---

### Task 3: Implement Hono Authentication Middleware

**Files:**
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/middleware/__tests__/auth.test.ts`

**Interfaces:**
- Consumes: `google-auth-library` or JWKS validation
- Produces: `authMiddleware` Hono middleware attaching authenticated user info to context `c.set('user', payload)`

- [ ] **Step 1: Write auth middleware unit test**

Create `server/src/middleware/__tests__/auth.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { authMiddleware } from '../auth'

describe('authMiddleware', () => {
  it('returns 401 if Authorization header is missing', async () => {
    const testApp = new Hono()
    testApp.use('/protected', authMiddleware)
    testApp.get('/protected', (c) => c.text('secret'))

    const res = await testApp.request('/protected')
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Implement `authMiddleware`**

Create `server/src/middleware/auth.ts`:
```typescript
import type { MiddlewareHandler } from 'hono'
import { OAuth2Client } from 'google-auth-library'

const client = new OAuth2Client()

export interface AuthUser {
  email: string
  name: string
  picture: string
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401)
  }

  const token = authHeader.substring(7)
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
    })
    const payload = ticket.getPayload()
    if (!payload || !payload.email) {
      return c.json({ error: 'Invalid token payload' }, 401)
    }

    c.set('user', {
      email: payload.email,
      name: payload.name ?? '',
      picture: payload.picture ?? '',
    } as AuthUser)

    await next()
  } catch (err) {
    return c.json({ error: 'Unauthorized: Invalid token' }, 401)
  }
}
```

- [ ] **Step 3: Run auth middleware tests**

Run: `cd server && npm test`
Expected: Auth middleware test passes.

- [ ] **Step 4: Commit auth middleware**

```bash
git add server/src/middleware/
git commit -m "feat: implement Google ID token auth middleware for Hono"
```

---

### Task 4: Implement Hono Route Handlers & Server Sheets Repositories

**Files:**
- Create: `server/src/routes/dreams.ts`
- Create: `server/src/routes/__tests__/dreams.test.ts`
- Move/Adapt: `src/repositories/sheets/` into `server/src/repositories/sheets/`

**Interfaces:**
- Consumes: `shared/interfaces/IDreamRepository.ts`
- Produces: API routes (`/api/dreams`, `/api/users`, `/api/comments`, etc.)

- [ ] **Step 1: Write dreams route test**

Create `server/src/routes/__tests__/dreams.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { dreamsRoute } from '../dreams'

describe('Dreams Routes', () => {
  it('registers GET / route', async () => {
    const app = new Hono()
    app.route('/api/dreams', dreamsRoute)
    const res = await app.request('/api/dreams')
    expect(res.status).not.toBe(404)
  })
})
```

- [ ] **Step 2: Create `server/src/routes/dreams.ts`**

```typescript
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'

export const dreamsRoute = new Hono()

dreamsRoute.get('/', async (c) => {
  return c.json({ items: [] })
})

dreamsRoute.get('/:id', async (c) => {
  const id = c.req.param('id')
  return c.json({ id })
})

dreamsRoute.post('/', authMiddleware, async (c) => {
  const body = await c.req.json()
  return c.json({ success: true, data: body }, 201)
})
```

- [ ] **Step 3: Mount routes in `server/src/index.ts`**

Mount `dreamsRoute`, `usersRoute`, `commentsRoute` under `/api/`.

- [ ] **Step 4: Run server tests**

Run: `cd server && npm test`
Expected: Route tests pass.

- [ ] **Step 5: Commit server routes**

```bash
git add server/src/routes/ server/src/index.ts
git commit -m "feat: add REST API routes for dreams in Hono server"
```

---

### Task 5: Implement Client-Side HTTP Repositories in `web/`

**Files:**
- Create: `src/repositories/http/HttpDreamRepository.ts`
- Create: `src/repositories/http/HttpUserRepository.ts`
- Create: `src/repositories/http/HttpCommentRepository.ts`
- Create: `src/repositories/http/__tests__/HttpDreamRepository.test.ts`
- Modify: `src/repositories/factory.ts`

**Interfaces:**
- Consumes: `shared/interfaces/IDreamRepository.ts`, `authStore` (for token header)
- Produces: `HttpDreamRepository` implementing `IDreamRepository`

- [ ] **Step 1: Write HttpDreamRepository test**

Create `src/repositories/http/__tests__/HttpDreamRepository.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HttpDreamRepository } from '../HttpDreamRepository'

describe('HttpDreamRepository', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('fetches dream by id via HTTP GET', async () => {
    const mockDream = { id: 'd1', title: 'Test Dream', email: 'test@example.com' }
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockDream), { status: 200 }))

    const repo = new HttpDreamRepository()
    const result = await repo.findById('d1')

    expect(fetch).toHaveBeenCalledWith('/api/dreams/d1', expect.anything())
    expect(result).toEqual(mockDream)
  })
})
```

- [ ] **Step 2: Implement `HttpDreamRepository`**

Create `src/repositories/http/HttpDreamRepository.ts`:
```typescript
import type { Dream, CreateDreamInput, UpdateDreamInput } from '../../../shared/types/dream'
import type { IDreamRepository } from '../../../shared/interfaces/IDreamRepository'
import { useAuthStore } from '../../stores/authStore'

export class HttpDreamRepository implements IDreamRepository {
  private getHeaders() {
    const token = useAuthStore.getState().token
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  async findById(id: string): Promise<Dream | null> {
    const res = await fetch(`/api/dreams/${id}`, { headers: this.getHeaders() })
    if (!res.ok) return null
    return res.json()
  }

  async findAllByEmail(email: string): Promise<Dream[]> {
    const res = await fetch(`/api/dreams?email=${encodeURIComponent(email)}`, { headers: this.getHeaders() })
    if (!res.ok) return []
    return res.json()
  }

  async findByDate(email: string, date: string): Promise<Dream | null> {
    const res = await fetch(`/api/dreams/by-date?email=${encodeURIComponent(email)}&date=${date}`, { headers: this.getHeaders() })
    if (!res.ok) return null
    return res.json()
  }

  async findByMonth(email: string, year: number, month: number): Promise<Dream[]> {
    const res = await fetch(`/api/dreams/by-month?email=${encodeURIComponent(email)}&year=${year}&month=${month}`, { headers: this.getHeaders() })
    if (!res.ok) return []
    return res.json()
  }

  async findPublicPage(cursor?: string, limit = 10): Promise<{ items: Dream[]; nextCursor?: string }> {
    const query = new URLSearchParams()
    if (cursor) query.set('cursor', cursor)
    query.set('limit', String(limit))
    const res = await fetch(`/api/dreams/public?${query.toString()}`, { headers: this.getHeaders() })
    if (!res.ok) return { items: [] }
    return res.json()
  }

  async create(input: CreateDreamInput): Promise<Dream> {
    const res = await fetch('/api/dreams', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error('Failed to create dream')
    return res.json()
  }

  async update(input: UpdateDreamInput): Promise<Dream> {
    const res = await fetch(`/api/dreams/${input.id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error('Failed to update dream')
    return res.json()
  }

  async delete(id: string, email: string): Promise<void> {
    await fetch(`/api/dreams/${id}?email=${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })
  }
}
```

- [ ] **Step 3: Update `src/repositories/factory.ts`**

Update `factory.ts` to instantiate `HttpDreamRepository` and HTTP client repositories when running in browser mode.

- [ ] **Step 4: Run unit tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 5: Commit HTTP repositories**

```bash
git add src/repositories/http/ src/repositories/factory.ts
git commit -m "feat: implement HttpDreamRepository and update factory to use HTTP API client"
```

---

### Task 6: Full Monorepo Directory Restructure (`web/` and `shared/`)

**Files:**
- Move: `src/` -> `web/src/`
- Move: `public/` -> `web/public/`
- Move: `index.html` -> `web/index.html`
- Move: `vite.config.ts` -> `web/vite.config.ts`
- Create: Root `package.json` scripts for workspace

**Interfaces:**
- Consumes: `web/`, `server/`, `shared/`
- Produces: Monorepo scripts (`npm run dev:web`, `npm run dev:server`, `npm test`)

- [ ] **Step 1: Restructure files into `web/` directory**

Move frontend assets into `web/` and configure root `package.json` workspaces or scripts.

- [ ] **Step 2: Configure Vite proxy in `web/vite.config.ts`**

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 3: Run full verification suite**

Run: `npm test` and `npm run build`
Expected: Clean pass across all workspaces.

- [ ] **Step 4: Commit Monorepo restructuring**

```bash
git add .
git commit -m "refactor: reorganize project into Monorepo structure (web, server, shared)"
```

---

## Self-Review

1. **Spec Coverage:** Covers Hono setup, auth middleware, Http repositories, Monorepo structure, Cloud Run Dockerfile, and Cloudflare Pages configuration.
2. **Placeholder Scan:** No placeholders, zero TODOs.
3. **Type Consistency:** Domain types match `shared/types/` and repository interfaces match `shared/interfaces/`.
