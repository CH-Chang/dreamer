# Profile Page Design

## Overview

Add a personal profile page displaying user info, dream statistics, quota usage, and photo upload capability.

## Route & Navigation

- **Route**: `/profile` inside `MainLayout` (auth-protected, includes Header)
- **Header**: clicking user avatar or name navigates to `/profile`
- **Back link**: "← 返回日曆" at page top

## ProfilePage Layout

Within `max-w-xl mx-auto` container (matching other pages):

### User Info Card
- Avatar photo (clickable for upload)
- Name
- Email
- Join date (`created_at`)

### Dream Statistics
- Total dream count
- Current month dream count
- Public dream count
- Dreams with media count

### Quota Display
- Video: daily used/limit, monthly used/limit
- Comic: daily used/limit, monthly used/limit
- Moved from SettingsPage (removed from there)

## Photo Upload Flow

1. Click avatar → `<input type="file" accept="image/*">`
2. Client-side resize to 400×400 via canvas
3. Upload to Google Drive folder "夢貘 Avatars" via `googleDriveClient.uploadImage`
4. Save Drive URL to user's `avatar_url` field
5. Update `authStore` for immediate UI reflection

## UserRepository Changes

- Add `update(email: string, data: Partial<User>): Promise<void>` to interface
- Dual-write: Google Sheets + AlaSQL
- Existing `avatar_url` column in `users` sheet is reused

## SettingsPage Changes

- Remove `myQuota` display section ("我的配額使用")
- Keep admin quota management (system limits + user overrides)
- Keep connection settings section unchanged

## Data Flow

- Profile data from `authStore.user`
- Dream counts from `DreamRepository.findByEmail` → filter/aggregate client-side
- Quota from `rateLimitService.getUsage/getLimit`
- Photo upload: `uploadImage` → `UserRepository.update` → `authStore.setSession`
