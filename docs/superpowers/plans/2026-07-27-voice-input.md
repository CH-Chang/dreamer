# 夢境語音輸入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add voice input to DreamForm via Web Speech API, appending transcribed text to the textarea in real time.

**Architecture:** A `SpeechService` class encapsulates the Web Speech API lifecycle. A `MicButton` presentational component consumes it and drives the recording UI. DreamForm composes the two.

**Tech Stack:** TypeScript, React, Web Speech API, Tailwind CSS, Vitest

## Global Constraints

- No new npm dependencies
- Must work in Chrome, Edge, Safari 14.1+
- Must gracefully hide on unsupported browsers (Firefox)
- Default locale: `zh-TW`
- Never break existing manual text input

---

### Task 1: Create speechService.ts

**Files:**
- Create: `src/lib/speechService.ts`
- Test: `src/lib/__tests__/speechService.test.ts`

**Interfaces:**
- Consumes: `window.SpeechRecognition` or `window.webkitSpeechRecognition`
- Produces: `SpeechService` class with `start()`, `stop()`, `isSupported`, `onResult`, `onInterim`, `onError` callbacks

- [ ] **Step 1: Write the test file**

Create `src/lib/__tests__/speechService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

class MockRecognition {
  lang = ''
  continuous = false
  interimResults = false
  maxAlternatives = 1
  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  onend: (() => void) | null = null
}

let mockRecognition: MockRecognition

beforeEach(() => {
  mockRecognition = new MockRecognition()
  vi.stubGlobal('webkitSpeechRecognition', vi.fn(() => mockRecognition))
  vi.stubGlobal('SpeechRecognition', undefined)
})

it('detects browser support', async () => {
  const { SpeechService } = await import('../speechService')
  expect(SpeechService.isSupported).toBe(true)
})

it('is not supported when SpeechRecognition is missing', async () => {
  vi.stubGlobal('webkitSpeechRecognition', undefined)
  const { SpeechService } = await import('../speechService')
  expect(SpeechService.isSupported).toBe(false)
})

it('configures recognition with zh-TW', async () => {
  const { SpeechService } = await import('../speechService')
  const service = new SpeechService({ onResult: vi.fn() })
  service.start()
  expect(mockRecognition.lang).toBe('zh-TW')
  expect(mockRecognition.continuous).toBe(true)
  expect(mockRecognition.interimResults).toBe(true)
})

it('calls onResult with final transcripts', async () => {
  const onResult = vi.fn()
  const { SpeechService } = await import('../speechService')
  const service = new SpeechService({ onResult })
  service.start()

  const event = {
    results: [
      [{ transcript: '我', confidence: 0.9 }],
      [{ transcript: '做了', confidence: 0.9 }],
    ],
    resultIndex: 0,
  }
  event.results[0].isFinal = true
  event.results[1].isFinal = true
  mockRecognition.onresult!(event)

  expect(onResult).toHaveBeenCalledWith('我做了')
})

it('calls onInterim with non-final transcripts', async () => {
  const onInterim = vi.fn()
  const { SpeechService } = await import('../speechService')
  const service = new SpeechService({ onResult: vi.fn(), onInterim })
  service.start()

  const event = {
    results: [
      [{ transcript: '做夢', confidence: 0.9 }],
    ],
    resultIndex: 0,
  }
  event.results[0].isFinal = false
  mockRecognition.onresult!(event)

  expect(onInterim).toHaveBeenCalledWith('做夢')
})

it('calls onError on recognition error', async () => {
  const onError = vi.fn()
  const { SpeechService } = await import('../speechService')
  const service = new SpeechService({ onResult: vi.fn(), onError })
  service.start()

  mockRecognition.onerror!({ error: 'not-allowed' })
  expect(onError).toHaveBeenCalledWith('not-allowed')
})

it('restarts recognition on unexpected end when listening', async () => {
  const { SpeechService } = await import('../speechService')
  const service = new SpeechService({ onResult: vi.fn() })
  service.start()

  mockRecognition.onend!()
  expect(mockRecognition.start).toHaveBeenCalledTimes(2)
})

it('does not restart on end after manual stop', async () => {
  const { SpeechService } = await import('../speechService')
  const service = new SpeechService({ onResult: vi.fn() })
  service.start()
  service.stop()

  mockRecognition.onend!()
  expect(mockRecognition.start).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/speechService.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create speechService.ts**

Create `src/lib/speechService.ts`:

```typescript
interface SpeechServiceCallbacks {
  onResult: (text: string) => void
  onInterim?: (text: string) => void
  onError?: (error: string) => void
}

export class SpeechService {
  private recognition: SpeechRecognition | null = null
  private callbacks: SpeechServiceCallbacks
  private listening = false

  static get isSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  }

  constructor(callbacks: SpeechServiceCallbacks) {
    this.callbacks = callbacks
  }

  start(): void {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    this.recognition = new SpeechRecognition()
    this.recognition.lang = 'zh-TW'
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.maxAlternatives = 1

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }
      if (finalText) this.callbacks.onResult(finalText)
      if (interimText && this.callbacks.onInterim) {
        this.callbacks.onInterim(interimText)
      }
    }

    this.recognition.onerror = (event) => {
      this.callbacks.onError?.(event.error)
    }

    this.recognition.onend = () => {
      if (this.listening) {
        this.recognition?.start()
      }
    }

    this.listening = true
    this.recognition.start()
  }

  stop(): void {
    this.listening = false
    this.recognition?.stop()
    this.recognition = null
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/speechService.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/speechService.ts src/lib/__tests__/speechService.test.ts
git commit -m "feat: create SpeechService for Web Speech API"
```

---

### Task 2: Create MicButton

**Files:**
- Create: `src/components/ui/MicButton.tsx`

**Interfaces:**
- Consumes: `SpeechService`
- Produces: MicButton component with recording animation

- [ ] **Step 1: Create MicButton component**

Create `src/components/ui/MicButton.tsx`:

```tsx
import { useState, useEffect, useRef } from 'react'
import { SpeechService } from '../../lib/speechService'

interface Props {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export function MicButton({ onTranscript, disabled }: Props) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const serviceRef = useRef<SpeechService | null>(null)
  const supported = SpeechService.isSupported

  useEffect(() => {
    return () => {
      serviceRef.current?.stop()
    }
  }, [])

  const toggle = () => {
    if (listening) {
      serviceRef.current?.stop()
      setListening(false)
      return
    }

    setError(null)
    const service = new SpeechService({
      onResult: (text) => onTranscript(text),
      onError: (err) => {
        if (err === 'not-allowed') {
          setError('麥克風權限被拒')
        }
        setListening(false)
      },
    })
    service.start()
    serviceRef.current = service
    setListening(true)
  }

  if (!supported) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        title={listening ? '停止錄音' : '開始語音輸入'}
        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
          listening
            ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-200'
            : 'bg-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-200'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="22"/>
        </svg>
      </button>
      {listening && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5">
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
          <span className="absolute inset-0 rounded-full bg-red-500" />
        </span>
      )}
      {error && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-md px-3 py-1.5 text-[10px] text-red-500 whitespace-nowrap shadow-sm z-10">
          {error}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc -b`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/MicButton.tsx
git commit -m "feat: create MicButton component with recording animation"
```

---

### Task 3: Integrate MicButton into DreamForm

**Files:**
- Modify: `src/components/Dream/DreamForm.tsx`

**Interfaces:**
- Consumes: `MicButton`, `onTranscript` callback
- Produces: Textarea with working voice input

- [ ] **Step 1: Modify DreamForm to include MicButton**

Replace the textarea section in `src/components/Dream/DreamForm.tsx` to include the mic button overlay:

```typescript
import { MicButton } from '../ui/MicButton'

// Inside the component:
const handleTranscript = (text: string) => {
  setDescription((prev) => prev + text)
}

// Replace the textarea wrapper:
<div className="relative">
  <textarea
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder="記錄你的夢境..."
    rows={4}
    className="w-full resize-none bg-transparent border-b border-gray-200 text-sm text-gray-600 placeholder-gray-200 focus:outline-none focus:border-gray-400 transition-colors pb-3 pr-8"
  />
  <div className="absolute bottom-3 right-1">
    <MicButton onTranscript={handleTranscript} disabled={saving} />
  </div>
</div>
```

Full final `DreamForm.tsx`:

```typescript
import { useState } from 'react'
import { motion as m } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useDreamStore } from '../../stores/dreamStore'
import { getDreamRepository } from '../../repositories/factory'
import { geminiTextClient } from '../../lib/geminiTextClient'
import { Switch } from '../ui/Switch'
import { MicButton } from '../ui/MicButton'

interface Props {
  date: string
}

export function DreamForm({ date }: Props) {
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [visibility, setVisibility] = useState<'public' | 'private'>('private')
  const { user } = useAuthStore()
  const { addDream } = useDreamStore()

  const handleTranscript = (text: string) => {
    setDescription((prev) => prev + text)
  }

  const handleSave = async () => {
    if (!description.trim() || !user || saving) return
    setSaving(true)
    try {
      const repo = getDreamRepository()
      const dream = await repo.create({
        email: user.email,
        date,
        description: description.trim(),
        visibility,
      })

      try {
        const systemPrompt = '你是一個為夢境筆記產生標題的助手。根據以下夢境描述，產生 3 個簡潔、有意境的繁體中文標題（每個不超過 15 字），以換行分隔。只回傳標題，不需要編號。'
        const result = await geminiTextClient.generate(description.trim(), systemPrompt)
        const candidates = result.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3)
        if (candidates.length > 0) {
          const updated = await repo.update(dream.id, { title_candidates: candidates })
          addDream(updated)
        } else {
          addDream(dream)
        }
      } catch (err) {
        console.error('Failed to generate title candidates:', err)
        addDream(dream)
      }

      setDescription('')
    } catch (err) {
      console.error('Failed to save dream:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.metaKey && e.key === 'Enter') {
      handleSave()
    }
  }

  return (
    <div>
      <p className="text-xs text-gray-400 tracking-wider mb-3">{date}</p>
      <div className="relative">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="記錄你的夢境..."
          rows={4}
          className="w-full resize-none bg-transparent border-b border-gray-200 text-sm text-gray-600 placeholder-gray-200 focus:outline-none focus:border-gray-400 transition-colors pb-3 pr-8"
        />
        <div className="absolute bottom-3 right-1">
          <MicButton onTranscript={handleTranscript} disabled={saving} />
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <Switch checked={visibility === 'public'} onChange={(v) => setVisibility(v ? 'public' : 'private')} />
        <m.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving || !description.trim()}
          className="px-6 py-2 bg-gray-800 text-white text-xs tracking-[0.2em] hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? '儲存中...' : '儲存'}
        </m.button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run all tests and type check**

Run: `npx vitest run && npx tsc -b`
Expected: all tests pass, no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Dream/DreamForm.tsx
git commit -m "feat: integrate voice input into DreamForm"
```

---

### Self-Review

**Spec coverage:**
- SpeechService wraps Web Speech API → Task 1
- MicButton with recording animation → Task 2
- DreamForm integration with real-time append → Task 3
- Error handling (permission denied) → Task 2 MicButton
- Unsupported browser hides button → Task 2 (`if (!supported) return null`)
- No Firefox support → Task 2 (handled by `isSupported`)
- Default locale zh-TW → Task 1 (`recognition.lang = 'zh-TW'`)
- Continuous mode → Task 1 (`continuous = true`)
- Interim results → Task 1 (`interimResults = true`)

**Placeholder scan:** All steps contain full code. No placeholders.

**Type consistency:** `onResult` callback receives `string` everywhere. `SpeechService` constructor takes `SpeechServiceCallbacks`. `MicButton` uses `onTranscript` prop of type `(text: string) => void`. Consistent.
