import { useState, useMemo } from 'react'
import { useNavigate }       from 'react-router-dom'
import { Badge }             from '../../components/ui/Badge'
import { Input }             from '../../components/ui/Input'
import {
  Search, ScanLine, CheckCircle,
  AlertCircle, Clock, ArrowRight,
  RefreshCw, Trash2, Filter,
} from 'lucide-react'

// ── Mock data ─────────────────────────────────────────────────────
const MOCK_HISTORY = [
  { id: 'SCN-001', name: 'M8 Hex Bolt SS304',      category: 'Fasteners', status: 'completed', confidence: 94, price: '₹45/pc',  time: '2 hrs ago',   date: 'Today',      imageCount: 1 },
  { id: 'SCN-002', name: 'DC Motor 12V 150RPM',     category: 'Motors',    status: 'completed', confidence: 89, price: '₹320',    time: '5 hrs ago',   date: 'Today',      imageCount: 2 },
  { id: 'SCN-003', name: 'Unknown component',        category: null,        status: 'review',    confidence: 42, price: null,      time: '1 day ago',   date: 'Yesterday',  imageCount: 1 },
  { id: 'SCN-004', name: 'Bearing 6205-2RS',         category: 'Bearings',  status: 'completed', confidence: 97, price: '₹180',   time: '1 day ago',   date: 'Yesterday',  imageCount: 1 },
  { id: 'SCN-005', name: 'Proximity Sensor NPN',     category: 'Sensors',   status: 'completed', confidence: 91, price: '₹450',   time: '2 days ago',  date: '14 Apr',     imageCount: 3 },
  { id: 'SCN-006', name: 'Limit Switch NC/NO',       category: 'Switches',  status: 'completed', confidence: 88, price: '₹95',    time: '3 days ago',  date: '13 Apr',     imageCount: 1 },
  { id: 'SCN-007', name: 'Stepper Motor NEMA 17',    category: 'Motors',    status: 'failed',    confidence: 0,  price: null,      time: '4 days ago',  date: '12 Apr',     imageCount: 1 },
  { id: 'SCN-008', name: 'M10 Flat Washer',          category: 'Fasteners', status: 'completed', confidence: 96, price: '₹5/pc',  time: '5 days ago',  date: '11 Apr',     imageCount: 2 },
  { id: 'SCN-009', name: 'Hall Effect Sensor',       category: 'Sensors',   status: 'completed', confidence: 83, price: '₹85',    time: '6 days ago',  date: '10 Apr',     imageCount: 1 },
  { id: 'SCN-010', name: 'BLDC Motor 24V',           category: 'Motors',    status: 'review',    confidence: 58, price: '₹1,850', time: '1 week ago',  date: '9 Apr',      imageCount: 2 },
]

const STATUS_MAP = {
  completed: { label: 'Completed', variant: 'green',  icon: CheckCircle },
  review:    { label: 'Review',    variant: 'orange', icon: AlertCircle },
  failed:    { label: 'Failed',    variant: 'red',    icon: AlertCircle },
}

function ConfidencePill({ value }) {
  if (!value) return <span className="text-xs text-gray-400">—</span>
  const color = value >= 80 ? 'text-green-600 bg-green-50'
              : value >= 55 ? 'text-amber-600 bg-amber-50'
              :               'text-red-600   bg-red-50'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {value}%
    </span>
  )
}

export function ScanHistoryPage() {
  const navigate            = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const FILTERS = ['All', 'Completed', 'Review', 'Failed']

  const filtered = useMemo(() => {
    return MOCK_HISTORY.filter(s => {
      const matchSearch = search === '' ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'All' ||
        s.status === filter.toLowerCase()
      return matchSearch && matchFilter
    })
  }, [search, filter])

  // Group by date
  const grouped = useMemo(() => {
    return filtered.reduce((acc, scan) => {
      if (!acc[scan.date]) acc[scan.date] = []
      acc[scan.date].push(scan)
      return acc
    }, {})
  }, [filtered])

  const stats = useMemo(() => ({
    total:     MOCK_HISTORY.length,
    completed: MOCK_HISTORY.filter(s => s.status === 'completed').length,
    review:    MOCK_HISTORY.filter(s => s.status === 'review').length,
    failed:    MOCK_HISTORY.filter(s => s.status === 'failed').length,
  }), [])

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Scan history</h1>
          <p className="text-sm text-gray-500 mt-1">
            All past AI analysis jobs and their results
          </p>
        </div>
        <button
          onClick={() => navigate('/upload')}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-600
                     hover:bg-orange-700 text-white text-sm font-medium
                     rounded-xl transition-all duration-200 active:scale-95"
        >
          <ScanLine size={14} /> New scan
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total scans', value: stats.total,     color: 'text-navy-800'  },
          { label: 'Completed',   value: stats.completed, color: 'text-green-600' },
          { label: 'Need review', value: stats.review,    color: 'text-amber-600' },
          { label: 'Failed',      value: stats.failed,    color: 'text-red-600'   },
        ].map(s => (
          <div key={s.label}
               className="bg-white border border-surface-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            icon={Search}
            placeholder="Search by name or scan ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1 bg-white border
                        border-surface-border rounded-xl p-1 flex-shrink-0">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium
                         transition-all duration-150
                         ${filter === f
                           ? 'bg-navy-800 text-white'
                           : 'text-gray-500 hover:text-navy-700'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped scan list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white border border-surface-border rounded-xl
                        flex flex-col items-center justify-center py-16 gap-3">
          <ScanLine size={28} className="text-gray-300" />
          <p className="text-sm text-gray-400">No scans match your filters</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, scans]) => (
          <div key={date}>
            {/* Date group label */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {date}
              </span>
              <div className="flex-1 h-px bg-surface-border" />
              <span className="text-xs text-gray-400">{scans.length} scans</span>
            </div>

            {/* Scan rows */}
            <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
              {scans.map((scan, i) => {
                const StatusIcon = STATUS_MAP[scan.status]?.icon ?? Clock
                return (
                  <div
                    key={scan.id}
                    onClick={() => navigate('/results', { state: { scanId: scan.id } })}
                    className={`flex items-center gap-4 px-5 py-4 cursor-pointer
                               hover:bg-orange-50/60 transition-colors group
                               ${i !== 0 ? 'border-t border-surface-border' : ''}`}
                  >
                    {/* Status icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center
                                    justify-center flex-shrink-0
                                    ${scan.status === 'completed' ? 'bg-green-50'
                                    : scan.status === 'review'    ? 'bg-amber-50'
                                    :                               'bg-red-50'}`}>
                      <StatusIcon
                        size={16}
                        className={scan.status === 'completed' ? 'text-green-500'
                                 : scan.status === 'review'    ? 'text-amber-500'
                                 :                               'text-red-500'}
                      />
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-navy-800
                                     group-hover:text-orange-700 transition-colors">
                          {scan.name}
                        </p>
                        {scan.category && (
                          <span className="text-[10px] bg-gray-100 text-gray-500
                                          px-2 py-0.5 rounded-full">
                            {scan.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                        <span className="font-mono">{scan.id}</span>
                        <span>·</span>
                        <span>{scan.time}</span>
                        <span>·</span>
                        <span>{scan.imageCount} image{scan.imageCount !== 1 ? 's' : ''}</span>
                      </p>
                    </div>

                    {/* Confidence */}
                    <ConfidencePill value={scan.confidence} />

                    {/* Price */}
                    <div className="text-sm font-semibold text-orange-600
                                   min-w-[60px] text-right hidden sm:block">
                      {scan.price ?? '—'}
                    </div>

                    {/* Status badge */}
                    <Badge variant={STATUS_MAP[scan.status]?.variant ?? 'gray'}>
                      {STATUS_MAP[scan.status]?.label ?? scan.status}
                    </Badge>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); alert('Re-running scan...') }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors
                                   text-gray-400 hover:text-navy-600"
                        title="Re-run scan"
                      >
                        <RefreshCw size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); alert('Delete scan?') }}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors
                                   text-gray-400 hover:text-red-500"
                        title="Delete scan"
                      >
                        <Trash2 size={13} />
                      </button>
                      <ArrowRight
                        size={14}
                        className="text-gray-300 group-hover:text-orange-400
                                   transition-colors ml-1"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}