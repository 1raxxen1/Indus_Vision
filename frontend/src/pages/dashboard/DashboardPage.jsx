import { useNavigate } from 'react-router-dom'
import { useAuth }     from '../../hooks/useAuth'
import { StatsCard }   from '../../components/charts/StatsCard'
import { Badge }       from '../../components/ui/Badge'
import {
  Package, ScanLine, CheckCircle, IndianRupee,
  Upload, List, BarChart2, FileDown,
  ArrowRight, Clock,
} from 'lucide-react'

// ── Static mock data ─────────────────────────────────────────────
// This is placeholder data that visually matches what the real
// Django API will return. We'll swap this for real API calls
// in the services layer later — the component structure won't change.

const STATS = [
  {
    label:     'Total items',
    value:     '1,284',
    delta:     '12% more than last week',
    deltaType: 'up',
    icon:      Package,
    iconBg:    'bg-orange-50',
  },
  {
    label:     'Total scans',
    value:     '142',
    delta:     '8 scans today',
    deltaType: 'up',
    icon:      ScanLine,
    iconBg:    'bg-blue-50',
  },
  {
    label:     'AI accuracy',
    value:     '98%',
    delta:     'Up from 94% last month',
    deltaType: 'up',
    icon:      CheckCircle,
    iconBg:    'bg-green-50',
  },
  {
    label:     'Inventory value',
    value:     '₹2.4L',
    delta:     '₹4,000 less than last week',
    deltaType: 'down',
    icon:      IndianRupee,
    iconBg:    'bg-orange-50',
  },
]

const RECENT_SCANS = [
  { id: 1, name: 'M8 Hex Bolt SS304',  price: '₹45/pc',  time: '2 min ago',  status: 'completed' },
  { id: 2, name: 'DC Motor 12V 150RPM', price: '₹320',    time: '18 min ago', status: 'completed' },
  { id: 3, name: 'Unknown component',   price: null,       time: '1 hr ago',   status: 'review'    },
  { id: 4, name: 'Bearing 6205-2RS',    price: '₹180',    time: '3 hrs ago',  status: 'pending'   },
  { id: 5, name: 'Limit Switch NC/NO',  price: '₹95',     time: '5 hrs ago',  status: 'completed' },
]

const CATEGORIES = [
  { name: 'Fasteners',  count: 487, pct: 72, color: 'bg-orange-500' },
  { name: 'Motors',     count: 203, pct: 48, color: 'bg-navy-600'   },
  { name: 'Bearings',   count: 156, pct: 35, color: 'bg-orange-300' },
  { name: 'Sensors',    count: 98,  pct: 21, color: 'bg-navy-400'   },
  { name: 'Switches',   count: 72,  pct: 16, color: 'bg-gray-300'   },
]

const QUICK_ACTIONS = [
  { label: 'Upload image',    desc: 'Scan a new component', path: '/upload',    icon: Upload,    bg: 'bg-orange-50',  iconColor: 'text-orange-600' },
  { label: 'View inventory',  desc: 'Browse all items',     path: '/inventory', icon: List,      bg: 'bg-blue-50',    iconColor: 'text-blue-600'   },
  { label: 'Analytics',       desc: 'Charts & trends',      path: '/analytics', icon: BarChart2, bg: 'bg-green-50',   iconColor: 'text-green-600'  },
  { label: 'Export report',   desc: 'Download CSV / PDF',   path: '/reports',   icon: FileDown,  bg: 'bg-purple-50',  iconColor: 'text-purple-600' },
]

// ── Status badge mapping ─────────────────────────────────────────
function ScanStatusBadge({ status }) {
  const map = {
    completed: { label: 'Done',    variant: 'green'  },
    review:    { label: 'Review',  variant: 'orange' },
    pending:   { label: 'Pending', variant: 'blue'   },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'gray' }
  return <Badge variant={variant}>{label}</Badge>
}

// ── Greeting based on time of day ────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── Today's date formatted nicely ────────────────────────────────
function getDateString() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  })
}

// ════════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ════════════════════════════════════════════════════════════════
export function DashboardPage() {
  const { user }  = useAuth()
  const navigate  = useNavigate()

  // First name only — "Atharva Tanpure" → "Atharva"
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    // animate-fade-in is defined in your index.css keyframes
    <div className="animate-fade-in space-y-6 max-w-7xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
            <Clock size={12} />
            {getDateString()} · Here's your inventory overview
          </p>
        </div>

        {/* Primary CTA — most important action on the page */}
        <button
          onClick={() => navigate('/upload')}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700
                     text-white text-sm font-medium px-4 py-2.5 rounded-xl
                     transition-all duration-200 active:scale-95 shadow-sm
                     whitespace-nowrap flex-shrink-0"
        >
          <Upload size={15} />
          New scan
        </button>
      </div>

      {/* ── Stats grid ──────────────────────────────────────────── */}
      {/* 4 columns on large screens, 2 on medium, 1 on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <StatsCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* ── Bottom grid: Recent scans + Category + Quick actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Scans — takes 2/3 width on large screens */}
        <div className="lg:col-span-2 bg-white border border-surface-border rounded-xl">

          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <div>
              <h2 className="text-sm font-semibold text-navy-800">Recent scans</h2>
              <p className="text-xs text-gray-400 mt-0.5">Latest AI processing results</p>
            </div>
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-1 text-xs text-orange-600
                         hover:text-orange-700 font-medium transition-colors"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>

          {/* Scan rows */}
          <div className="divide-y divide-surface-border">
            {RECENT_SCANS.map((scan) => (
              <div
                key={scan.id}
                onClick={() => navigate('/results')}
                className="flex items-center gap-4 px-5 py-3.5
                           hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {/* Thumbnail placeholder */}
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center
                                justify-center flex-shrink-0 text-[10px] text-gray-400 font-medium">
                  IMG
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-800 truncate">{scan.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Clock size={10} />
                    {scan.time}
                    {scan.price && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-orange-600 font-medium">{scan.price}</span>
                      </>
                    )}
                  </p>
                </div>

                {/* Status badge */}
                <ScanStatusBadge status={scan.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Category breakdown + Quick actions */}
        <div className="flex flex-col gap-4">

          {/* Category breakdown */}
          <div className="bg-white border border-surface-border rounded-xl p-5 flex-1">
            <h2 className="text-sm font-semibold text-navy-800 mb-4">Category breakdown</h2>

            <div className="space-y-3">
              {CATEGORIES.map((cat) => (
                <div key={cat.name}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600">{cat.name}</span>
                    <span className="text-xs font-medium text-navy-800">{cat.count}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${cat.color} rounded-full transition-all duration-700`}
                      style={{ width: `${cat.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white border border-surface-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-navy-800 mb-3">Quick actions</h2>

            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.path)}
                    className="flex flex-col items-start gap-2 p-3 rounded-xl
                               border border-surface-border bg-gray-50
                               hover:bg-orange-50 hover:border-orange-200
                               transition-all duration-200 text-left group"
                  >
                    <div className={`w-7 h-7 ${action.bg} rounded-lg flex items-center justify-center`}>
                      <Icon size={14} className={action.iconColor} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-navy-800 group-hover:text-orange-700
                                    transition-colors leading-none">{action.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{action.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}