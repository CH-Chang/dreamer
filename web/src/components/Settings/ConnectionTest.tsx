import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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
      const res = await fetch('/api/health')
      if (!res.ok) throw new Error('API 伺服器連線失敗')
      setStatus('success')
      setMessage('API 伺服器連線成功')
      onTested?.(true)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : '連線失敗')
      onTested?.(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={testConnection}
        disabled={status === 'testing'}
        className="h-10 w-36 bg-gray-800 text-white text-xs tracking-wider font-medium
                   hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed 
                   transition-all flex items-center justify-center gap-2 rounded-none"
      >
        {status === 'testing' ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-30" />
              <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>檢查中...</span>
          </>
        ) : (
          <span>檢查連線</span>
        )}
      </motion.button>

      <AnimatePresence>
        {status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 pt-1"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'testing'
                  ? 'bg-amber-400 animate-pulse'
                  : status === 'success'
                  ? 'bg-emerald-500'
                  : 'bg-rose-500'
              }`}
            />
            <span
              className={`text-xs tracking-wider font-light ${
                status === 'success' ? 'text-emerald-600' : status === 'error' ? 'text-rose-500' : 'text-gray-400'
              }`}
            >
              {message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
