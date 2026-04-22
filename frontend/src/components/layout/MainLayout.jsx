import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar }  from './Navbar'
import { Sidebar } from './Sidebar'

export function MainLayout() {
  // Sidebar starts CLOSED on all screen sizes
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex flex-col h-screen bg-surface-subtle overflow-hidden">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content — always full width since sidebar is overlaid */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}