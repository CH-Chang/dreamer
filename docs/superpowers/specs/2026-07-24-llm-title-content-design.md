# LLM 自動標題與內文潤飾

## 概述

夢境記錄新增兩個 LLM 輔助功能：
1. 儲存時自動產生多個候選標題，讓使用者在編輯時選擇或自行輸入
2. 編輯模式下可手動觸發內文潤飾

## 資料模型

`src/types/dream.ts` — `Dream` 介面新增欄位：

```typescript
export interface Dream {
  // ...existing fields
  title_candidates?: string[]
}
```

`CreateDreamInput` 與 `UpdateDreamInput` 一併加入對應欄位。

Google Sheets `dreams` 表頭新增 `title_candidates` 欄位。SQLite 同步新增欄位（以 JSON 字串儲存 `string[]`）。

## LLM 文字客戶端

新增 `src/lib/geminiTextClient.ts`：

- 沿用既有 pattern：從 `useAuthStore` 取得 token，從 `useSettingsStore` 取得 `gcpProjectId`
- 使用 Gemini API `gemini-2.0-flash-001` 模型（純文字，低成本快速）
- 方法：`generate(prompt, systemPrompt?) => Promise<string>`

```typescript
class GeminiTextClient {
  async generate(prompt: string, systemPrompt?: string): Promise<string>
}
export const geminiTextClient = new GeminiTextClient()
```

## 標題自動產生

### 儲存流程（DreamForm）

1. 使用者填寫 description，按「儲存」
2. `DreamForm` 先 `repo.create()` 寫入 dream（此時 title、title_candidates 為空）
3. 接著顯示 spinner / loading 狀態，背景 call `geminiTextClient.generate()`
   - system prompt: `你是一個為夢境筆記產生標題的助手。根據以下夢境描述，產生 3 個簡潔、有意境的繁體中文標題（每個不超過 15 字），以換行分隔。只回傳標題，不需要編號。`
4. 解析回傳結果為 `string[]`，呼叫 `repo.update(id, { title_candidates })`
5. 完成，關閉表單

若 LLM 呼叫失敗，不影響儲存 — 僅 `title_candidates` 為空，不阻斷使用者流程。

### 編輯選擇（DreamContent）

編輯模式下，title input 下方顯示候選標題列：

```
[  標題 input (placeholder: 輸入標題或選擇下方候選)    ]
  [候選 A]  [候選 B]  [候選 C]
```

- `title_candidates` 有值時才顯示候選按鈕
- 點選候選按鈕 → 填入 title input
- 使用者仍可自由編輯 title input

## 內文潤飾

### 編輯流程（DreamContent）

編輯模式下，description textarea 右上方新增「✨ 潤飾」按鈕：

```
[textarea]
[✨ 潤飾]                              [取消] [儲存]
```

- 點擊 → call `geminiTextClient.generate()`
  - system prompt: `你是一個夢境日記的編輯助手。請潤飾以下夢境內文，保持原意、改善流暢度與可讀性，使用繁體中文。只回傳潤飾後的內文。`
  - prompt: `原始內文：\n${description}`
- LLM 回傳後直接更新 description state
- 使用者可再次編輯或繼續潤飾
- 按「儲存」才寫入資料庫

## 涉及的修改檔案

| 檔案 | 修改內容 |
|------|----------|
| `src/types/dream.ts` | 新增 `title_candidates` 欄位到 Dream、CreateDreamInput、UpdateDreamInput |
| `src/lib/geminiTextClient.ts` | **新檔案** — Gemini 文字生成客戶端 |
| `src/lib/googleSheetsClient.ts` | dreams 表頭新增 `title_candidates` |
| `src/repositories/sheets/DreamRepository.ts` | create/update 處理 `title_candidates` 欄位 |
| `src/components/Dream/DreamForm.tsx` | 儲存後 call LLM 生候選標題，顯示 loading |
| `src/components/Dream/DreamContent.tsx` | 編輯模式顯示候選標題按鈕 + 潤飾按鈕 |

## 錯誤處理

- LLM 呼叫失敗：不阻斷使用者流程，只記錄 console.error
- 標題產生失敗 → `title_candidates` 保持空陣列，編輯時不顯示候選區
- 內文潤飾失敗 → description 不變，按鈕恢復可點狀態
