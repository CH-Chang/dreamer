import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export function Header() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [searchValue, setSearchValue] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && searchValue.trim()) {
      navigate('/search?q=' + encodeURIComponent(searchValue.trim()))
      setSearchValue('')
    }
  }

  return (
    <header className="grid grid-cols-3 items-center px-8 py-5">
      <div>
        <Link
          to="/calendar"
          className="text-lg tracking-[0.3em] font-light text-gray-600"
        >
          夢貘
        </Link>
      </div>
      <div className="flex justify-center">
        <input
          aria-label="搜尋"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜尋夢境..."
          className="max-w-xl w-full text-xs tracking-wider text-gray-500 bg-transparent border-b border-gray-200 focus:outline-none focus:border-gray-400 transition-colors placeholder-gray-200"
        />
      </div>
      <div className="flex justify-end items-center gap-8 text-xs tracking-widest text-gray-400">
        {user && (
          <div className="flex items-center gap-3">
            <Link to="/profile" className="flex items-center gap-3 hover:opacity-70 transition-opacity">
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="w-5 h-5 rounded-full"
                />
              )}
              <span className="text-gray-400">{user.name}</span>
            </Link>
            <button
              onClick={logout}
              className="hover:text-gray-600 transition-colors"
            >
              登出
            </button>
          </div>
        )}
        <Link
          to="/feed"
          className="hover:text-gray-600 transition-colors"
        >
          Feed
        </Link>
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
        <Link
          to="/about"
          className="hover:text-gray-600 transition-colors"
        >
          關於
        </Link>
      </div>
    </header>
  )
}
