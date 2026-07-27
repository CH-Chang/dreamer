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
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
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
