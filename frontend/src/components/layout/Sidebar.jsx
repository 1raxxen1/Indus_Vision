import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard, Upload, ScanLine, Package,
  History, BarChart2, FileText, Settings, ShieldCheck, X,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard',    path: '/dashboard',  icon: LayoutDashboard },
      { label: 'Upload',       path: '/upload',      icon: Upload },
      { label: 'Results',      path: '/results',     icon: ScanLine, badge: 3 },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'All Items',    path: '/inventory',  icon: Package },
      { label: 'Scan History', path: '/history',    icon: History },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Analytics',   path: '/analytics',  icon: BarChart2 },
      { label: 'Reports',     path: '/reports',    icon: FileText },
    ],
  },
]

const BOTTOM_ITEMS = [
  { label: 'Settings',    path: '/settings', icon: Settings },
  { label: 'Admin Panel', path: '/admin',    icon: ShieldCheck, adminOnly: true },
]

export function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'Admin'

  return (
    <>
      {/* Backdrop — clicking it closes the sidebar */}
      <div
        className={`
          fixed inset-0 bg-black/40 z-20 transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Sidebar panel — slides in from the left */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-56 bg-navy-800 z-30
          flex flex-col shadow-xl
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-navy-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">IA</span>
            </div>
            <span className="text-white font-semibold text-sm">InventoryAI</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-navy-700 transition-colors"
          >
            <X size={15} className="text-navy-400" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="text-[9px] font-bold text-navy-500 uppercase tracking-[0.1em] px-3 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarLink key={item.path} item={item} onClose={onClose} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom items */}
        <div className="px-2 pb-4 pt-2 border-t border-navy-700 space-y-0.5">
          {BOTTOM_ITEMS.map((item) => {
            if (item.adminOnly && !isAdmin) return null
            return <SidebarLink key={item.path} item={item} onClose={onClose} />
          })}
        </div>
      </aside>
    </>
  )
}

function SidebarLink({ item, onClose }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium
         transition-all duration-150 group
         ${isActive
           ? 'bg-orange-600 text-white'
           : 'text-navy-300 hover:bg-navy-700 hover:text-white'
         }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={15}
            className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-navy-400 group-hover:text-white'}`}
          />
          <span className="flex-1 leading-none">{item.label}</span>
          {item.badge && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
              isActive ? 'bg-white/20 text-white' : 'bg-orange-500/20 text-orange-400'
            }`}>
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}