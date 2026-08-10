import { useState } from 'react'
import { fetchSheetAsRows } from '../../lib/googleSheetsClient'

interface Props {
  onTested?: (success: boolean) => void
}

export function ConnectionTest({ onTested }: Props) {
  const [status, setStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle')
  const [message, setMessage] = useState('')

  const testConnection = async () => {
    setStatus('testing')
    try {
      await fetchSheetAsRows('users')
      setStatus('success')
      setMessage('連線成功')
      onTested?.(true)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : '連線失敗')
      onTested?.(false)
    }
  }

  return (
    <div>
      <button
        onClick={testConnection}
        disabled={status === 'testing'}
        className="px-6 py-2.5 bg-gray-800 text-white text-xs tracking-wider
                   hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {status === 'testing' ? '檢查中...' : '檢查連線'}
      </button>
      {status !== 'idle' && (
        <p
          className={`mt-3 text-xs tracking-wider ${
            status === 'success' ? 'text-gray-500' : 'text-red-400'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
