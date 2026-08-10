import { useEffect, useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { initDatabase, isInitialized } from '../../lib/alaSqlService'
import { Header } from './Header'

export function MainLayout() {
  const { isAuthenticated } = useAuthStore()
  const [dbReady, setDbReady] = useState(isInitialized())

  useEffect(() => {
    if (isAuthenticated && !dbReady) {
      initDatabase().then(() => setDbReady(true)).catch(() => setDbReady(true))
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-[#fcfcf9] flex items-center justify-center">
        <div className="text-xs text-gray-300 tracking-wider">載入中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fcfcf9]">
      <Header />
      <main className="max-w-xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
