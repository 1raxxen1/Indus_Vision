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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Scan history</h1>
          <p className="text-sm text-gray-500">
            All processed scans
          </p>
        </div>

        <button 
          onClick={() => navigate('/upload')}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-xl hover:bg-orange-700 transition-colors"
        >
          <ScanLine size={14} /> New scan
        </button>
      </div>


      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-navy-800">{stats.total}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Done</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{stats.review}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Review</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Failed</p>
        </div>
      </div>


      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            icon={Search}
            placeholder="Search scans..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                filter === f 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-white border text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>


      {/* List */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center text-gray-500">
          <p className="text-lg font-semibold text-gray-900">No scans found</p>
          <p className="text-sm text-gray-500 mt-2">
            Upload an image to start scanning components.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, scans]) => (
            <div key={date} className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">{date}</h3>
              </div>

              <div className="divide-y divide-gray-100">
                {scans.map(scan => {
                  const StatusIcon = STATUS_MAP[scan.status]?.icon ?? Clock

                  return (
                    <div
                      key={scan.id}
                      onClick={() =>
                        navigate('/results', { state: { scanId: scan.id } })
                      }
                      className="flex items-center gap-4 p-4 cursor-pointer hover:bg-orange-50/50 transition-colors group"
                    >
                      <div className="flex-shrink-0">
                        <StatusIcon size={20} className={`${
                          scan.status === 'completed' ? 'text-green-500' :
                          scan.status === 'review' ? 'text-orange-500' :
                          'text-red-500'
                        }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-navy-800 truncate group-hover:text-orange-700 transition-colors">
                          {scan.name}
                        </p>
                        <p className="text-xs text-gray-400">{scan.time}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <ConfidencePill value={scan.confidence} />

                        <Badge variant={STATUS_MAP[scan.status]?.variant}>
                          {STATUS_MAP[scan.status]?.label}
                        </Badge>

                        <ArrowRight size={16} className="text-gray-300 group-hover:text-orange-400 transition-colors" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}