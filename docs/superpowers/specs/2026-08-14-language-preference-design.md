# User Language Preference & AI Localization Design Document

## Goal
Add language preference selection (`zh-TW`, `en-US`, `zh-CN`) to user profiles and the initial registration flow, localize AI comic and video generation prompt templates based on the user's chosen language, and ensure candidate title generation dynamically matches the language of the dream description itself.

## Scope
- **Supported Languages**:
  - 繁體中文 (`zh-TW`) [Default]
  - English (`en-US`)
  - 简体中文 (`zh-CN`)
- **Functional Requirements**:
  1. **User Model & Data Layer**:
     - `User` interface (`shared/types/user.ts`) expanded with `language?: SupportedLanguage`.
     - Google Sheets `users` sheet schema updated with `language` column.
     - Fallback default to `'zh-TW'` for users without `language` stored.
  2. **Registration Flow (`PrivacyTermsModal`)**:
     - Language selector dropdown added to terms agreement modal.
     - Initial value autodetected from browser `navigator.language`.
     - Saved via `completeRegistration` into `UserRepository`.
  3. **User Profile Page (`ProfilePage`)**:
     - Language preference setting section.
     - Immediate update to `UserRepository` and `useAuthStore`.
  4. **AI Generation Localization**:
     - **Candidate Title Generation (Gemini)**: Instructs Gemini to detect the language of the dream description and generate 3 titles in that exact same language.
     - **Comic Image Generation (Imagen)**: Prefix and prompt template localized to user's `language`.
     - **Video Generation (Veo)**: Prompt template localized to user's `language`.

---

## Technical Specifications

### 1. Types (`shared/types/user.ts`)
```typescript
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

### 2. Sheets & Server Data Layer
- **`server/src/lib/googleSheetsClient.ts`**:
  `users: ['email', 'name', 'avatar_url', 'role', 'created_at', 'language']`
- **`server/src/repositories/sheets/UserRepository.ts`**:
  - In `parseUserRow`: `language: (row.language as SupportedLanguage) || 'zh-TW'`
  - In `create`: passes `input.language || 'zh-TW'`
  - In `update`: updates `language` when provided

### 3. Frontend Registration & Settings
- **`web/src/components/Auth/PrivacyTermsModal.tsx`**:
  - Autodetects language from `navigator.language`:
    - `/^zh-CN/i` -> `'zh-CN'`
    - `/^en/i` -> `'en-US'`
    - Default -> `'zh-TW'`
  - Emits `onAccept(language)`
- **`web/src/components/Profile/ProfilePage.tsx`**:
  - Adds a styled "偏好語言 / Language" dropdown selector.
  - Updates `userRepo.update(user.email, { language })` and `setSession`.

### 4. AI Generation Localization
- **`server/src/services/aiService.ts` (`generateTitleSuggestions`)**:
  - System prompt: "You are a master of dream analysis and naming. Detect the language of the provided dream text, and output exactly 3 short, poetic titles in that same language, one title per line, without numbering or extra explanation."
- **`server/src/routes/comics.ts`**:
  - Localizes prompt prefix by user language:
    - `zh-TW`: `夢境連環漫畫插畫風格：${description}`
    - `zh-CN`: `梦境连环漫画插画风格：${description}`
    - `en-US`: `Dream comic illustration style: ${description}`
- **`server/src/routes/videos.ts`**:
  - Localizes prompt prefix by user language:
    - `zh-TW` / `zh-CN`: `夢境般唯美電影鏡頭場景：${description}`
    - `en-US`: `Dream-like cinematic scene: ${description}`

---

## Verification & Testing
1. `shared/__tests__/types.test.ts`: Validate `User.language` type.
2. `server/src/repositories/sheets/__tests__/UserRepository.test.ts`: Verify `language` storage and fallback.
3. `server/src/services/__tests__/aiService.test.ts`: Verify title suggestion prompt accommodates dream description language.
4. `web/src/stores/__tests__/authStore.test.ts` & component tests: Verify language storage and switching.
5. Full test suite: `npm test`.
