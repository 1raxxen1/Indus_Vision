import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, User } from 'lucide-react'

export function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function getInitials(name = '') {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <nav className="h-14 bg-navy-800 flex items-center justify-between px-4 flex-shrink-0 z-10">

      {/* Left: Hamburger + Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-navy-700 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} className="text-navy-300" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">IA</span>
          </div>
          <span className="text-white font-semibold text-sm">InventoryAI</span>
        </div>
      </div>

      {/* Right: Bell + User */}
      <div className="flex items-center gap-1">
        <button className="relative p-2 rounded-lg hover:bg-navy-700 transition-colors">
          <Bell size={17} className="text-navy-300" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full" />
        </button>

        <div className="w-px h-5 bg-navy-600 mx-1" />

        <div className="flex items-center gap-2 pl-1">
          <div className="w-7 h-7 rounded-full bg-navy-600 border border-navy-500 flex items-center justify-center">
            <span className="text-xs font-semibold text-navy-200">
              {user?.name ? getInitials(user.name) : <User size={12} />}
            </span>
          </div>
          <div className="hidden sm:block leading-none">
            <p className="text-xs font-medium text-white">{user?.name || 'User'}</p>
            <p className="text-[10px] text-navy-400 mt-0.5">{user?.role || 'Operator'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-navy-700 transition-colors group"
            title="Logout"
          >
            <LogOut
              size={15}
              className="text-navy-400 group-hover:text-orange-400 transition-colors"
            />
          </button>
        </div>
      </div>
    </nav>
  )
}