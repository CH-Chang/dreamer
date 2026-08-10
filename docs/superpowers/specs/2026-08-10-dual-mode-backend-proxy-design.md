# Dual-Mode AI Backend Proxy & Configuration Isolation Spec

**Date**: 2026-08-10  
**Status**: Proposal  

## 1. Overview

This document specifies the architecture for migrating environment configuration (`GOOGLE_SPREADSHEET_ID`, `DRIVE_FOLDER_NAME`) to backend server environment variables (`server/.env`) and implementing a **Dual-Mode AI Execution System (BYOK vs System Quota)** managed entirely via Hono API Server backend proxy.

---

## 2. Configuration Isolation

### 2.1 Backend Environment Variables (`server/.env`)
The following sensitive infrastructure variables are managed exclusively by the backend and removed from frontend user configuration:

- `GOOGLE_SPREADSHEET_ID`: ID of the Google Sheets database.
- `DRIVE_FOLDER_NAME`: Folder name for storing generated media in Google Drive.
- `SYSTEM_GCP_PROJECT_ID`: Default system GCP Project ID for Vertex AI (e.g. `dreamer-448202`).
- `SYSTEM_GCP_LOCATION`: Default system GCP Location for Vertex AI (e.g. `us-central1`).
- `GOOGLE_SERVICE_ACCOUNT_KEY`: Service Account JSON key (if configured for background tasks).

### 2.2 Frontend Settings Page Simplification
The frontend settings interface (`web/src/components/Settings/SettingsPage.tsx`) will be simplified:
- **Removed Fields**: "Google Sheets URL" and "Drive Folder Name".
- **Added Fields**:
  - **AI Generation Mode Selector**: Toggle between `system` (Default System Quota) and `custom` (BYOK - Bring Your Own Keys/Project).
  - **BYOK Config Fields** (visible only when `custom` mode selected):
    - `customGcpProjectId`: User's own GCP Project ID.
    - `customGcpLocation`: User's own Vertex AI location (defaults to `us-central1`).
    - `customClientId`: User's Google OAuth Client ID (optional).

---

## 3. Dual-Mode AI Execution Flow

All AI requests (Video Generation, Comic Generation, Title Suggestions) are issued by the frontend via standard REST endpoints (`/api/videos`, `/api/comics`, `/api/dreams/suggest-title`). The backend handles execution based on the user's selected mode:

```
Frontend --[ HTTP POST /api/videos + Authorization Bearer ]--> Hono Backend API
                                                                       |
                                                        [ Check User Mode ]
                                                              /         \
                                                             /           \
                                                     (system)            (custom)
                                                        /                 \
                                           [ Rate Limit Check ]     [ Bypass Rate Limit ]
                                                  /        \                 |
                                           (exceeded)    (ok)                |
                                               |           |                 |
                                          Return 429   Deduct Quota  Use User Project ID
                                                           |                 |
                                                           v                 v
                                              [ Invoke Vertex AI via Backend Proxy ]
```

### 3.1 Mode 1: System Quota Mode (`mode: 'system'`)
1. User calls AI REST endpoint without custom GCP parameters or with `mode: 'system'`.
2. Backend queries `IRateLimitRepository` for the user's daily/monthly usage.
3. If quota exceeded -> returns `429 Too Many Requests`.
4. If quota available -> deducts usage count, invokes Vertex AI using `SYSTEM_GCP_PROJECT_ID` and `SYSTEM_GCP_LOCATION`.
5. Logs event to database (`mode: 'system'`, `quota_deducted: true`).

### 3.2 Mode 2: BYOK Custom Mode (`mode: 'custom'`)
1. User calls AI REST endpoint passing `mode: 'custom'`, `customGcpProjectId`, and `customGcpLocation` (or stored in user profile).
2. Backend **bypasses rate limit checks** (0 system quota deducted).
3. Backend invokes Vertex AI using the user's `customGcpProjectId`, `customGcpLocation`, and user's OAuth Bearer Token.
4. Logs event to database (`mode: 'custom'`, `quota_deducted: false`).

---

## 4. Data Schema Updates

### 4.1 `User` Type (`shared/types/user.ts`)
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

### 4.2 `UsageLog` Type (`shared/types/usageLog.ts`)
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

---

## 5. Summary of Benefits

1. **Clean Architecture**: 100% of AI requests use unified REST endpoints via Hono backend proxy.
2. **Quota Protection**: System quota is preserved for system users; BYOK users enjoy unlimited generation on their own GCP billing without consuming system resources.
3. **Enhanced Security**: Infrastructure credentials (`GOOGLE_SPREADSHEET_ID`, `DRIVE_FOLDER_NAME`) are hidden from browser clients.
