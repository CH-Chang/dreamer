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
  vi.stubGlobal('webkitSpeechRecognition', vi.fn().mockImplementation(function () { return mockRecognition }))
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
