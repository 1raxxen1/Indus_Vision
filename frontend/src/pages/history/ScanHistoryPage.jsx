import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useApi } from '../../hooks/useApi'
import { scanService } from '../../services/scanService'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'

import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'

import {
  Search, ScanLine, CheckCircle,
  AlertCircle, Clock, ArrowRight,
  RefreshCw, Trash2,
} from 'lucide-react'


// ── Status mapping ─────────────────────
const STATUS_MAP = {
  completed: { label: 'Completed', variant: 'green', icon: CheckCircle },
  review: { label: 'Review', variant: 'orange', icon: AlertCircle },
  failed: { label: 'Failed', variant: 'red', icon: AlertCircle },
}


// ── Confidence pill ───────────────────
function ConfidencePill({ value }) {
  if (!value) return <span className="text-xs text-gray-400">—</span>

  const color =
    value >= 80 ? 'text-green-600 bg-green-50'
    : value >= 55 ? 'text-amber-600 bg-amber-50'
    : 'text-red-600 bg-red-50'

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {value}%
    </span>
  )
}


// ═══════════════════════════════════════
// SCAN HISTORY PAGE
// ═══════════════════════════════════════
export function ScanHistoryPage() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const FILTERS = ['All', 'Completed', 'Review', 'Failed']

  // ── API CALL ────────────────────────
  const { data, loading, error, refetch } = useApi(
    () => scanService.getResults()
  )

  if (loading) return <LoadingSpinner message="Loading scan history..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />


  // ── Normalize API data ──────────────
  const allScans = (data?.results ?? data?.scans ?? []).map(scan => ({
    id: scan.id ?? scan.scan_id,
    name: scan.name ?? scan.component_name ?? 'Unknown',
    category: scan.category ?? null,
    status: scan.status ?? 'completed',
    confidence: scan.confidence ?? 0,
    price: scan.price ?? null,
    time: scan.time ?? scan.created_at ?? '—',
    date: scan.date ?? 'Recent',
    imageCount: scan.image_count ?? 1,
  }))


  // ── Filtering ───────────────────────
  const filtered = useMemo(() => {
    return allScans.filter(s => {
      const matchSearch =
        search === '' ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        String(s.id).toLowerCase().includes(search.toLowerCase())

      const matchFilter =
        filter === 'All' ||
        s.status === filter.toLowerCase()

      return matchSearch && matchFilter
    })
  }, [search, filter, allScans])


  // ── Group by date ───────────────────
  const grouped = useMemo(() => {
    return filtered.reduce((acc, scan) => {
      if (!acc[scan.date]) acc[scan.date] = []
      acc[scan.date].push(scan)
      return acc
    }, {})
  }, [filtered])


  // ── Stats ───────────────────────────
  const stats = useMemo(() => ({
    total: allScans.length,
    completed: allScans.filter(s => s.status === 'completed').length,
    review: allScans.filter(s => s.status === 'review').length,
    failed: allScans.filter(s => s.status === 'failed').length,
  }), [allScans])


  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scan history</h1>
        </div>

        <button onClick={() => navigate('/upload')}>
          <ScanLine size={14} /> New scan
        </button>
      </div>


      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div>{stats.total} Total</div>
        <div>{stats.completed} Done</div>
        <div>{stats.review} Review</div>
        <div>{stats.failed} Failed</div>
      </div>


      {/* Search + Filter */}
      <div className="flex gap-3">
        <Input
          icon={Search}
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>


      {/* List */}
      {Object.keys(grouped).length === 0 ? (
        <p>No scans found</p>
      ) : (
        Object.entries(grouped).map(([date, scans]) => (
          <div key={date}>

            <h3>{date}</h3>

            {scans.map(scan => {
              const StatusIcon = STATUS_MAP[scan.status]?.icon ?? Clock

              return (
                <div
                  key={scan.id}
                  onClick={() =>
                    navigate('/results', { state: { scanId: scan.id } })
                  }
                  className="flex items-center gap-4 cursor-pointer"
                >
                  <StatusIcon />

                  <div>
                    <p>{scan.name}</p>
                    <p>{scan.time}</p>
                  </div>

                  <ConfidencePill value={scan.confidence} />

                  <Badge variant={STATUS_MAP[scan.status]?.variant}>
                    {STATUS_MAP[scan.status]?.label}
                  </Badge>

                  <ArrowRight />
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}