# Hono Cloud Run API + Cloudflare Pages Web Architecture & Auth Spec

## 1. Executive Summary

This document specifies the architectural redesign of **Dreamer**, transitioning it from a pure client-side application that directly interacts with Google Sheets REST API to a decoupled Monorepo structure:
- **`web/`**: Static React SPA hosted on Cloudflare Pages.
- **`server/`**: Lightweight Hono REST API running on Google Cloud Run.
- **`shared/`**: Common TypeScript domain types and repository interfaces.

---

## 2. Directory Structure (Monorepo)

```
dreamer/
├── shared/                       # Shared Domain Types & Interfaces
│   ├── types/                    # Dream, User, Comment, Video, Comic, etc.
│   └── interfaces/               # IDreamRepository, IUserRepository, ICommentRepository, etc.
├── web/                          # Frontend (Cloudflare Pages - Vite + React 19)
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── components/           # React Components (DreamForm, MicButton, etc.)
│       ├── stores/               # Zustand Stores (authStore, dreamStore, settingsStore)
│       ├── hooks/                # useAuth, useDriveImage, etc.
│       └── repositories/         # Client-side Repositories
│           ├── factory.ts        # Client repository factory
│           └── http/             # HTTP repositories calling Cloud Run API
│               ├── DreamRepository.ts
│               ├── UserRepository.ts
│               ├── CommentRepository.ts
│               ├── VideoRepository.ts
│               ├── CategoryRepository.ts
│               ├── ComicRepository.ts
│               ├── RateLimitRepository.ts
│               └── EditLogRepository.ts
└── server/                       # Backend (Google Cloud Run - Hono)
    ├── package.json
    ├── Dockerfile                # Multi-stage build for Cloud Run deployment
    ├── src/
    │   ├── index.ts              # Hono application entry point & CORS configuration
    │   ├── middleware/
    │   │   └── auth.ts           # Google ID Token validation middleware
    │   ├── routes/
    │   │   ├── auth.ts           # /api/auth endpoints
    │   │   ├── dreams.ts         # /api/dreams endpoints
    │   │   ├── users.ts          # /api/users endpoints
    │   │   ├── comments.ts       # /api/comments endpoints
    │   │   ├── videos.ts         # /api/videos endpoints
    │   │   ├── comics.ts         # /api/comics endpoints
    │   │   └── categories.ts     # /api/categories endpoints
    │   ├── lib/
    │   │   ├── sheetsClient.ts   # Google Sheets API client with Service Account / ADC
    │   │   └── alaSqlService.ts  # Server-side AlaSQL cache service
    │   └── repositories/         # Server-side Sheets Repositories
    │       ├── DreamRepository.ts
    │       ├── UserRepository.ts
    │       ├── CommentRepository.ts
    │       └── ...
```

---

## 3. Authentication & Authorization Flow

### 3.1 Reduced Scope Google Login (Frontend)
- The frontend uses Google Identity Services (GIS) / `@react-oauth/google` requesting only basic identity scopes:
  - `openid`, `email`, `profile`
- Sensitive scopes (`spreadsheets`, `drive.file`, `cloud-platform`) are eliminated from client consent screens.

### 3.2 Hono Authentication Middleware (`server/src/middleware/auth.ts`)
- Frontend includes the Google ID token in all API calls:
  `Authorization: Bearer <google_id_token>`
- `authMiddleware`:
  1. Extracts Bearer token from header.
  2. Verifies token integrity & signature against Google JWKS (`https://www.googleapis.com/oauth2/v3/certs`) or via `google-auth-library` `OAuth2Client.verifyIdToken()`.
  3. Extracts `email`, `name`, `picture` from payload.
  4. Stores user context on Hono context `c.set('user', userPayload)`.
  5. Returns HTTP 401 Unauthorized if invalid or expired.

### 3.3 Google Sheets Access (Server-side)
- The server uses a Google Cloud Service Account (or Application Default Credentials on Cloud Run) to access Google Sheets.
- Server repositories enforce multi-tenancy rules:
  - Read queries for user-owned resources filter by `email = authenticated_user_email`.
  - Mutations check that target resource belongs to `authenticated_user_email`.

---

## 4. API Endpoints & Repositories

### 4.1 REST API Routes
- **`GET /api/dreams`**: List user's dreams or public dreams page.
- **`GET /api/dreams/:id`**: Get single dream.
- **`POST /api/dreams`**: Create new dream.
- **`PUT /api/dreams/:id`**: Update existing dream.
- **`DELETE /api/dreams/:id`**: Delete dream.
- **`GET /api/users/me`**: Get currently authenticated user profile.
- **`POST /api/users`**: Register or update user profile.
- **`GET /api/comments?dream_id=:id`**: List comments for a dream.
- **`POST /api/comments`**: Add comment.

### 4.2 Frontend HTTP Repositories (`web/src/repositories/http/`)
Each repository implements its corresponding interface from `shared/interfaces/`:
- Example: `HttpDreamRepository implements IDreamRepository`
- Uses native `fetch` with helper function `getAuthHeaders()` to attach `Authorization: Bearer <token>`.
- Converts HTTP responses back to domain models.

---

## 5. Local Development & Deployment Strategy

### 5.1 Local Development
- **Backend**: Runs on `http://localhost:3000` (`npm run dev --prefix server`).
- **Frontend**: Runs on `http://localhost:5173` (`npm run dev --prefix web`).
- Vite dev server configures proxy `/api` -> `http://localhost:3000`.

### 5.2 Deployment
- **Cloudflare Pages**: Deploys static build from `web/dist`.
- **Google Cloud Run**: Deploys container built using `server/Dockerfile`.
- **Environment Variables**:
  - `GOOGLE_SERVICE_ACCOUNT_KEY` (or Cloud Run default IAM)
  - `SPREADSHEET_ID`
  - `CORS_ORIGIN` (e.g. `https://dreamer.pages.dev`)

---

## 6. Migration Plan

1. **Step 1: Restructure directories** into `shared/`, `web/`, and `server/`.
2. **Step 2: Setup `shared/`** with existing types and repository interfaces.
3. **Step 3: Setup `server/`** with Hono, authentication middleware, route handlers, and Google Sheets Repositories.
4. **Step 4: Update `web/`** with `Http*Repository` implementations and update `factory.ts`.
5. **Step 5: Verify existing 115 tests** pass under the new structure.
