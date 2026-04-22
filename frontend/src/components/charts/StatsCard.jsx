// StatsCard.jsx
// Displays a single metric — used in the 4-card grid at the top of the dashboard.
// Props:
//   label     — e.g. "Total Scans"
//   value     — e.g. "142"
//   delta     — e.g. "↑ 8 today"  (optional)
//   deltaType — "up" | "down" | "neutral"  controls delta color
//   icon      — Lucide icon component
//   iconBg    — Tailwind bg class for the icon circle

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export function StatsCard({ label, value, delta, deltaType = 'neutral', icon: Icon, iconBg = 'bg-orange-50' }) {

  // Delta color depends on whether it's good or bad news
  const deltaColor = {
    up:      'text-green-600',
    down:    'text-red-500',
    neutral: 'text-gray-400',
  }

  const DeltaIcon = {
    up:      TrendingUp,
    down:    TrendingDown,
    neutral: Minus,
  }[deltaType]

  return (
    <div className="bg-white border border-surface-border rounded-xl p-5 flex flex-col gap-3
                    hover:shadow-md transition-shadow duration-200">

      {/* Icon */}
      <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center`}>
        <Icon size={17} className="text-orange-600" />
      </div>

      {/* Value + Label */}
      <div>
        <p className="text-2xl font-bold text-navy-800 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </div>

      {/* Delta — only shown if provided */}
      {delta && (
        <div className={`flex items-center gap-1 text-xs font-medium ${deltaColor[deltaType]}`}>
          <DeltaIcon size={12} />
          <span>{delta}</span>
        </div>
      )}
    </div>
  )
}