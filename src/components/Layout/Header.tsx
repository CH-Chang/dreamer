import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export function Header() {
  const { user, logout } = useAuthStore()

  return (
    <header className="flex items-center justify-between px-8 py-5">
      <Link
        to="/calendar"
        className="text-lg tracking-[0.3em] font-light text-gray-600"
      >
        夢貘
      </Link>
      <div className="flex items-center gap-8 text-xs tracking-widest text-gray-400">
        {user && (
          <div className="flex items-center gap-3">
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt=""
                className="w-5 h-5 rounded-full"
              />
            )}
            <span className="text-gray-400">{user.name}</span>
            <button
              onClick={logout}
              className="hover:text-gray-600 transition-colors"
            >
              登出
            </button>
          </div>
        )}
        <Link
          to="/categories"
          className="hover:text-gray-600 transition-colors"
        >
          類別
        </Link>
        <Link
          to="/settings"
          className="hover:text-gray-600 transition-colors"
        >
          設定
        </Link>
      </div>
    </header>
  )
}
