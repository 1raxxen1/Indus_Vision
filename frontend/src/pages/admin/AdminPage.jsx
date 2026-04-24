import { useApi } from '../../hooks/useApi'
import { settingsService } from '../../services/settingsService'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'

export function AdminPage() {
  const { data, loading, error, refetch } = useApi(() => settingsService.getAdminSettings())

  if (loading) return <LoadingSpinner message="Loading admin settings..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin Panel</h1>
      <div className="bg-white border rounded-xl p-4">
        <p>Total admin settings: <strong>{data?.admin_settings ?? 0}</strong></p>
        <p>Active settings: <strong>{data?.active_admin_settings ?? 0}</strong></p>
      </div>
    </div>
  )
}
