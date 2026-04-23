import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useApi } from '../../hooks/useApi'

import { dashboardService } from '../../services/dashboardService'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'

import { StatsCard } from '../../components/charts/StatsCard'
import { Badge } from '../../components/ui/Badge'

import {
  Package, ScanLine, CheckCircle, IndianRupee,
  Upload
} from 'lucide-react'


// ── Status badge ─────────────────────
function ScanStatusBadge({ status }) {
  const map = {
    completed: { label: 'Done', variant: 'green' },
    review: { label: 'Review', variant: 'orange' },
    pending: { label: 'Pending', variant: 'blue' },
  }

  const { label, variant } = map[status] ?? { label: status, variant: 'gray' }
  return <Badge variant={variant}>{label}</Badge>
}


// ── Helpers ──────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getDateString() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}


// ═══════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════
export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data = {}, loading, error, refetch } = useApi(
    () => dashboardService.getSummary()
  )

  if (loading) return <LoadingSpinner message="Loading dashboard..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />


  const firstName = user?.name?.split(' ')[0] ?? 'there'


  // ── SAFE DATA NORMALIZATION ─────────
  const stats = [
    {
      label: 'Total uploads',
      value:
        data.uploads?.toLocaleString('en-IN') ??
        data.total_uploads?.toLocaleString('en-IN') ??
        '—',
      icon: Package,
    },
    {
      label: 'Total results',
      value:
        data.results?.toString() ??
        data.total_scans?.toString() ??
        '—',
      icon: ScanLine,
    },
    {
      label: 'AI accuracy',
      value: `${data.accuracy_rate ?? 0}%`,
      icon: CheckCircle,
    },
    {
      label: 'Inventory value',
      value:
        data.inventory_value
          ? `₹${(data.inventory_value / 100000).toFixed(1)}L`
          : '—',
      icon: IndianRupee,
    },
  ]


  const recentScans = data.recent_scans ?? []


  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex justify-between">
        <div>
          <h1>
            {getGreeting()}, {firstName} 👋
          </h1>
          <p>{getDateString()}</p>
        </div>

        <button onClick={() => navigate('/upload')}>
          <Upload size={16} />
          New Scan
        </button>
      </div>


      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(stat => (
          <StatsCard key={stat.label} {...stat} />
        ))}
      </div>


      {/* Recent Scans */}
      <div>
        {recentScans.length === 0 ? (
          <p className="text-gray-400 text-sm">No recent scans</p>
        ) : (
          recentScans.map(scan => (
            <div key={scan.id} className="flex justify-between">
              <p>{scan.name ?? 'Unknown'}</p>
              <ScanStatusBadge status={scan.status} />
            </div>
          ))
        )}
      </div>

    </div>
  )
}