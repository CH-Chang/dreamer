# 夢境語音輸入 — Design Spec

## Goal

在 DreamForm（夢境新增表單）加入語音輸入功能，讓使用者起床後可以直接用說的記錄夢境，不必打字。

## Approach

**Web Speech API 為主，無 fallback。** Chrome/Edge/Safari 支援 `SpeechRecognition`（webkit 前綴），Firefox 不支援則單純隱藏錄音按鈕。不使用 Google Cloud STT 以保持零成本、零額外設定。

## Architecture

### 新增檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/speechService.ts` | 封裝 Web Speech API 的 hook 或 class |
| `src/components/ui/MicButton.tsx` | 麥克風按鈕元件（含動畫） |

### 修改檔案

| 檔案 | 說明 |
|------|------|
| `src/components/Dream/DreamForm.tsx` | 在 textarea 旁加入 MicButton，串接語音轉文字 |

---

## Component: MicButton

```
props:
  onResult(text: string): void   — 即時辨識結果，每段文字送來一次
  onInterim(text: string): void  — 中間辨識結果（可選，用於即時顯示）
  disabled?: boolean
  locale?: string                — 預設 'zh-TW'

state:
  listening: boolean
  supported: boolean             — 初始化時偵測瀏覽器是否支援

行為:
  點擊 → 呼叫 SpeechRecognition.start()
  持續收音 → onInterim 回呼每一段 interim result
  最終結果 → onResult 回呼最終文字
  再點擊 → 停止收音
  按鈕動畫: 閒置時灰色麥克風圖示，錄音中紅色脈動
```

### SpeechRecognition 設定

```typescript
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
recognition.lang = 'zh-TW'
recognition.continuous = true     // 持續收音不中斷
recognition.interimResults = true  // 回傳中間結果
recognition.maxAlternatives = 1
```

### 事件處理

| 事件 | 行為 |
|------|------|
| `onresult` | 遍歷 `results`，`isFinal` 的結果透過 `onResult` 回呼送出；interim 結果透過 `onInterim` |
| `onerror` | `not-allowed` → 提示權限被拒；其他錯誤 → log 並停止 |
| `onend` | 若仍在 `listening` 狀態（非手動停止），自動重啟 `recognition.start()` 確保持續收音 |

---

## Integration: DreamForm

```
textarea 外層容器改為 relative
右下角疊一顆 MicButton

流程:
1. 使用者點擊麥克風
2. 瀏覽器詢問麥克風權限
3. 開始收音，按鈕轉紅色脈動
4. 講話內容即時 append 到 textarea 現有文字的後方
5. 再點擊麥克風停止收音
6. 使用者可以繼續手動編輯已填入的文字

Edge cases:
- 權限被拒 → 顯示簡短提示（Toast 或 inline message），按鈕恢復原狀
- 切換分頁自動停止 → 不需要自動重啟，讓使用者自己再點一次
- 已有文字時開始錄音 → append 在最後
```

## Error Handling

- `not-allowed`: 使用者拒絕權限 — toast 提示「麥克風權限被拒，請至瀏覽器設定開啟」
- `no-speech`: 沒有偵測到語音 — 忽略，保持聆聽
- `audio-capture`: 無麥克風裝置 — toast 提示
- 所有錯誤都不影響既有手動輸入功能

## Testing

- `src/lib/__tests__/speechService.test.ts` — mock SpeechRecognition API，測試 start/stop/result/error 流程
- 手動測試：實際在 Chrome 開麥克風測試語音輸入

## 不做的範圍

- Google Cloud STT 整合（未來可加）
- 錄音檔案上傳（暫不需要）
- 即時辨識文字高亮（只有 append）
- Firefox 支援（按鈕自動隱藏）
