import { Routes, Route, Navigate }  from 'react-router-dom'
import { useAuth }                  from './hooks/useAuth'
import { MainLayout }               from './components/layout/MainLayout'
import { LoginPage }                from './pages/auth/LoginPage'
import { DashboardPage }            from './pages/dashboard/DashboardPage'
import { UploadPage }               from './pages/upload/UploadPage'
import { ResultsPage }              from './pages/results/ResultsPage'
import { InventoryListPage }        from './pages/inventory/InventoryListPage'
import { ItemDetailPage }           from './pages/inventory/ItemDetailPage'
import { ScanHistoryPage }          from './pages/history/ScanHistoryPage'
import { AnalyticsPage }            from './pages/analytics/AnalyticsPage'
import { ReportsPage }              from './pages/reports/ReportsPage'
import { SettingsPage }             from './pages/settings/SettingsPage'

const Placeholder = ({ title }) => (
  <div className="p-2">
    <h1 className="text-2xl font-semibold text-navy-800">{title}</h1>
    <p className="text-sm text-gray-400 mt-1">Coming soon.</p>
  </div>
)

function PublicRoute({ children }) {
  const { user } = useAuth()
  return user ? <Navigate to="/dashboard" replace /> : children
}

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute><LoginPage /></PublicRoute>
      } />

      <Route element={
        <ProtectedRoute><MainLayout /></ProtectedRoute>
      }>
        <Route path="/dashboard"     element={<DashboardPage />}     />
        <Route path="/upload"        element={<UploadPage />}        />
        <Route path="/results"       element={<ResultsPage />}       />
        <Route path="/inventory"     element={<InventoryListPage />} />
        <Route path="/inventory/:id" element={<ItemDetailPage />}    />
        <Route path="/history"       element={<ScanHistoryPage />}   />
        <Route path="/analytics"     element={<AnalyticsPage />}     />
        <Route path="/reports"       element={<ReportsPage />}       />
        <Route path="/settings"      element={<SettingsPage />}      />
        <Route path="/admin"         element={<Placeholder title="Admin Panel" />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}