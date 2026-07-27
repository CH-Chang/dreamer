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
