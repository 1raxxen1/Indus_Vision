// Shows AI confidence as a colored progress bar
// e.g. 94% → green bar, 60% → amber bar, 35% → red bar

export function ConfidenceBar({ value }) {
  const pct = Math.round(value)

  const color =
    pct >= 80 ? 'bg-green-500'  :
    pct >= 55 ? 'bg-amber-500'  :
                'bg-red-500'

  const label =
    pct >= 80 ? 'High'   :
    pct >= 55 ? 'Medium' :
                'Low'

  const labelColor =
    pct >= 80 ? 'text-green-600'  :
    pct >= 55 ? 'text-amber-600'  :
                'text-red-600'

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-gray-400">AI confidence</span>
        <span className={`text-[11px] font-semibold ${labelColor}`}>
          {pct}% · {label}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}