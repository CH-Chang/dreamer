import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Header } from './Header'

export function MainLayout() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
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
