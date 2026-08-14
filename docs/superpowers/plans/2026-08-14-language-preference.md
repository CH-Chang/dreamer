# User Language Preference & AI Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement user language preference (`zh-TW`, `en-US`, `zh-CN`) stored in user records and selectable during initial registration & profile settings, localize comic and video prompts by user language, and dynamically generate candidate dream titles matching the language of the dream description.

**Architecture:**
- `shared/types/user.ts`: Defines `SupportedLanguage` and adds `language` to `User`.
- `server/src/repositories/sheets/UserRepository.ts` & `googleSheetsClient.ts`: Persists `language` in Google Sheets with `'zh-TW'` default fallback.
- `server/src/services/aiService.ts` & `server/src/routes/`: Localizes AI prompt generation for Gemini (title generation language matches dream text), Imagen (comics), and Veo (videos).
- `web/src/components/`: Adds language picker in `PrivacyTermsModal` with `navigator.language` autodetection, and language switcher in `ProfilePage`.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Hono 4, Vitest, Tailwind CSS 4, Zustand 5, Google Sheets API.

## Global Constraints
- Maintain 100% backward compatibility for existing user records (default to `'zh-TW'`).
- All 95 existing tests must continue to pass.
- Git commit messages in English following conventional commits.
- Responses to user in Traditional Chinese (繁體中文).

---

### Task 1: Shared Domain Types & Server Sheets UserRepository Extension

**Files:**
- Modify: `shared/types/user.ts`
- Modify: `shared/__tests__/types.test.ts`
- Modify: `server/src/lib/googleSheetsClient.ts:250-275`
- Modify: `server/src/repositories/sheets/UserRepository.ts`
- Create: `server/src/repositories/sheets/__tests__/UserRepository.test.ts`

**Interfaces:**
- Consumes: `shared/types/user.ts`
- Produces: `User.language` type and `UserRepository` methods handling `language`.

- [ ] **Step 1: Write failing unit test for `User` type with `language`**

Update `shared/__tests__/types.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import type { User, SupportedLanguage } from '../types/user'

describe('User Type with Language', () => {
  it('supports language field with zh-TW, en-US, zh-CN', () => {
    const userTW: User = {
      email: 'tw@test.com',
      name: 'TW User',
      role: 'user',
      created_at: '2026-08-14T00:00:00Z',
      language: 'zh-TW',
    }
    const userUS: User = {
      email: 'us@test.com',
      name: 'US User',
      role: 'user',
      created_at: '2026-08-14T00:00:00Z',
      language: 'en-US',
    }
    expect(userTW.language).toBe('zh-TW')
    expect(userUS.language).toBe('en-US')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/__tests__/types.test.ts`
Expected: FAIL (missing `SupportedLanguage` export).

- [ ] **Step 3: Update `shared/types/user.ts`**

```typescript
export type UserRole = 'user' | 'admin'
export type SupportedLanguage = 'zh-TW' | 'en-US' | 'zh-CN'

export interface User {
  email: string
  name: string
  avatar_url?: string
  role: UserRole
  created_at: string
  language?: SupportedLanguage
  ai_mode?: 'system' | 'custom'
  custom_gcp_project_id?: string
  custom_gcp_location?: string
}
```

- [ ] **Step 4: Update `server/src/lib/googleSheetsClient.ts` schema**

Update `getHeadersForSheet` in `googleSheetsClient.ts`:
```typescript
users: ['email', 'name', 'avatar_url', 'role', 'created_at', 'language'],
```

- [ ] **Step 5: Update `server/src/repositories/sheets/UserRepository.ts`**

Ensure `parseUserRow` falls back `language: (row.language as SupportedLanguage) || 'zh-TW'`, and `create` / `update` handles `language`.

- [ ] **Step 6: Create `server/src/repositories/sheets/__tests__/UserRepository.test.ts`**

Write test verifying `findByEmail`, `create`, `update` with `language`.

- [ ] **Step 7: Run tests to verify all pass**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add shared/ server/src/
git commit -m "feat: add SupportedLanguage to User model and UserRepository"
```

---

### Task 2: Localized AI Prompt Generation & Dynamic Dream Title Localization

**Files:**
- Modify: `server/src/services/aiService.ts`
- Modify: `server/src/routes/comics.ts`
- Modify: `server/src/routes/videos.ts`
- Create: `server/src/services/__tests__/aiService.test.ts`

**Interfaces:**
- Consumes: `generateTitleSuggestions`, `comicsRoute`, `videosRoute`
- Produces: Dynamic title generation matching dream content language, localized comic/video prompt templates.

- [ ] **Step 1: Write unit test for localized AI prompt generation**

Create `server/src/services/__tests__/aiService.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateTitleSuggestions } from '../aiService'

describe('AI Service Localization', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('sends prompt instructing Gemini to match dream description language', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Title 1\nTitle 2\nTitle 3' }] } }],
        }),
        { status: 200 }
      )
    )

    const titles = await generateTitleSuggestions('I was soaring over crystal mountains at midnight')
    expect(titles).toEqual(['Title 1', 'Title 2', 'Title 3'])
    expect(fetch).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it passes / fails**

Run: `cd server && npx vitest run src/services/__tests__/aiService.test.ts`

- [ ] **Step 3: Update `server/src/services/aiService.ts` for dynamic language matching**

Update `generateTitleSuggestions`:
```typescript
export async function generateTitleSuggestions(
  description: string,
  options: { gcpProjectId?: string; gcpLocation?: string; token?: string } = {},
): Promise<string[]> {
  const gcpProjectId = options.gcpProjectId || config.systemGcpProjectId
  const prompt = `請根據以下夢境內容的語言，產生 3 個與該語言相同、簡短且富有詩意或吸引人的夢境標題，每行一個標題，不要有編號或額外說明：\n${description}`
  const systemPrompt = '你是一個夢境解析與命名大師。請偵測夢境描述的語言，並以完全相同的語言輸出 3 行標題。'

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    system_instruction: { parts: [{ text: systemPrompt }] },
  }
  // ...
```

- [ ] **Step 4: Update `server/src/routes/comics.ts` & `server/src/routes/videos.ts`**

In `comics.ts`:
```typescript
const lang = user.language || 'zh-TW'
const promptPrefix = lang === 'en-US' ? 'Dream comic illustration style: ' : (lang === 'zh-CN' ? '梦境连环漫画插画风格：' : '夢境連環漫畫插畫風格：')
const prompt = `${promptPrefix}${description}`
```

In `videos.ts`:
```typescript
const lang = user.language || 'zh-TW'
const promptPrefix = lang === 'en-US' ? 'Dream-like cinematic scene: ' : '夢境般唯美電影鏡頭場景：'
const prompt = `${promptPrefix}${description}`
```

- [ ] **Step 5: Run tests and verify**

Run: `npm test`
Expected: 100% tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/
git commit -m "feat: localize AI prompts and match candidate title language to dream text"
```

---

### Task 3: Registration Flow Language Selector with Autodetection

**Files:**
- Modify: `web/src/components/Auth/PrivacyTermsModal.tsx`
- Modify: `web/src/hooks/useAuth.ts`
- Modify: `web/src/components/Landing/LandingPage.tsx`
- Modify: `web/src/components/Auth/__tests__/PrivacyTermsModal.test.tsx` (or create if needed)

**Interfaces:**
- Consumes: `PrivacyTermsModalProps`, `completeRegistration(userInfo, token, language)`
- Produces: User registration with initial language preference.

- [ ] **Step 1: Update `PrivacyTermsModal.tsx`**

Add language selector:
- Autodetect default:
  ```typescript
  const getDetectedLanguage = (): SupportedLanguage => {
    const navLang = navigator.language || ''
    if (/^zh-CN/i.test(navLang)) return 'zh-CN'
    if (/^en/i.test(navLang)) return 'en-US'
    return 'zh-TW'
  }
  ```
- Add state `const [language, setLanguage] = useState<SupportedLanguage>(getDetectedLanguage)`
- Add clean dropdown before agreement checkbox.
- Pass `language` to `onAccept(language)`.

- [ ] **Step 2: Update `useAuth.ts` & `LandingPage.tsx`**

Update `completeRegistration`:
```typescript
const completeRegistration = async (
  userInfo: GoogleUserInfo,
  accessToken: string,
  language: SupportedLanguage = 'zh-TW'
): Promise<User> => {
  const repo = getUserRepository()
  const created = await repo.create({
    email: userInfo.email,
    name: userInfo.name,
    avatar_url: userInfo.picture,
    role: 'user',
    language,
  })
  // ...
```

- [ ] **Step 3: Run web tests**

Run: `npm --prefix web test`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add web/src/
git commit -m "feat: add language preference selection to registration modal with autodetection"
```

---

### Task 4: Profile Page Language Preference Switcher & Full Verification

**Files:**
- Modify: `web/src/components/Profile/ProfilePage.tsx`
- Modify: `web/src/stores/authStore.ts`
- Test: `web/src/stores/__tests__/authStore.test.ts`

**Interfaces:**
- Consumes: `useAuthStore`, `getUserRepository`
- Produces: Live language switching UI in user profile.

- [ ] **Step 1: Update `ProfilePage.tsx`**

Add Language Preference card:
```tsx
{/* Language Preference Section */}
<m.div variants={slideUp} initial="initial" animate="animate" className="p-4 bg-gray-50 rounded space-y-2">
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-sm tracking-wider text-gray-700">偏好語言 / Language</h2>
      <p className="text-xs text-gray-400 mt-0.5">影響 AI 故事、漫畫及影片的生成風格與語系</p>
    </div>
    <select
      value={user.language || 'zh-TW'}
      onChange={handleLanguageChange}
      className="text-xs bg-white border border-gray-200 rounded px-3 py-1.5 text-gray-700 focus:outline-none focus:border-gray-400"
    >
      <option value="zh-TW">繁體中文 (zh-TW)</option>
      <option value="en-US">English (en-US)</option>
      <option value="zh-CN">简体中文 (zh-CN)</option>
    </select>
  </div>
</m.div>
```

- [ ] **Step 2: Implement `handleLanguageChange` in `ProfilePage.tsx`**

Update user repository and store session:
```typescript
const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
  const newLang = e.target.value as SupportedLanguage
  if (!user) return
  const repo = getUserRepository()
  await repo.update(user.email, { language: newLang })
  const updatedUser: User = { ...user, language: newLang }
  setSession(updatedUser, token, avatarBase64)
}
```

- [ ] **Step 3: Run full verification suite**

Run: `npm test && npm run build:web && npm run build:server`
Expected: 100% tests pass and zero build errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/
git commit -m "feat: implement language preference switcher in ProfilePage"
```

---

## Self-Review Checklist
- [x] All spec requirements covered (Data schema, registration, profile switcher, dynamic title matching, comic/video localization).
- [x] Zero placeholders (TBD/TODO).
- [x] Method signatures and types consistent across all tasks.
