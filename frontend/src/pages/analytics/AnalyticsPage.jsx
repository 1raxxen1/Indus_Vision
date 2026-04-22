import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { StatsCard } from '../../components/charts/StatsCard'
import {
  TrendingUp, ScanLine, Package,
  CheckCircle, IndianRupee,
} from 'lucide-react'

// ── Chart data ───────────────────────────────────────────────────
const SCAN_TREND = [
  { day: 'Mon', scans: 8,  completed: 7  },
  { day: 'Tue', scans: 12, completed: 11 },
  { day: 'Wed', scans: 6,  completed: 5  },
  { day: 'Thu', scans: 15, completed: 14 },
  { day: 'Fri', scans: 20, completed: 18 },
  { day: 'Sat', scans: 10, completed: 9  },
  { day: 'Sun', scans: 5,  completed: 5  },
]

const CATEGORY_DATA = [
  { name: 'Fasteners', count: 487, fill: '#ea580c' },
  { name: 'Motors',    count: 203, fill: '#0f1f3d' },
  { name: 'Bearings',  count: 156, fill: '#fb923c' },
  { name: 'Sensors',   count: 98,  fill: '#4f6491' },
  { name: 'Switches',  count: 72,  fill: '#c7d0e4' },
]

const VALUE_TREND = [
  { month: 'Nov', value: 68000  },
  { month: 'Dec', value: 82000  },
  { month: 'Jan', value: 75000  },
  { month: 'Feb', value: 91000  },
  { month: 'Mar', value: 88000  },
  { month: 'Apr', value: 97000  },
]

const CONFIDENCE_DATA = [
  { range: '90–100%', count: 68 },
  { range: '80–90%',  count: 42 },
  { range: '70–80%',  count: 18 },
  { range: '55–70%',  count: 9  },
  { range: '<55%',    count: 5  },
]

// ── Shared tooltip style ──────────────────────────────────────────
const TooltipStyle = {
  contentStyle: {
    background:   'white',
    border:       '1px solid #e8eaf0',
    borderRadius: '10px',
    fontSize:     '12px',
    boxShadow:    '0 4px 12px rgba(0,0,0,0.08)',
  },
  itemStyle:  { color: '#0f1f3d' },
  labelStyle: { color: '#64748b', fontWeight: 600 },
}

// ── Panel wrapper ─────────────────────────────────────────────────
function ChartPanel({ title, subtitle, children }) {
  return (
    <div className="bg-white border border-surface-border rounded-xl p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-navy-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// ── Range selector ────────────────────────────────────────────────
function RangeSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-white border border-surface-border
                    rounded-xl p-1">
      {['7d', '30d', '90d'].map(r => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium
                     transition-all duration-150
                     ${value === r
                       ? 'bg-navy-800 text-white'
                       : 'text-gray-500 hover:text-navy-700'}`}
        >
          {r}
        </button>
      ))}
    </div>
  )
}

export function AnalyticsPage() {
  const [range, setRange] = useState('7d')

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Scan trends, inventory insights, and AI performance metrics
          </p>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total scans"     value="142"  delta="↑ 18% this week"  deltaType="up"      icon={ScanLine}     iconBg="bg-blue-50"   />
        <StatsCard label="Accuracy rate"   value="96%"  delta="↑ 2% this month"  deltaType="up"      icon={CheckCircle}  iconBg="bg-green-50"  />
        <StatsCard label="Items catalogued" value="1,284" delta="↑ 12% this week" deltaType="up"     icon={Package}      iconBg="bg-orange-50" />
        <StatsCard label="Portfolio value" value="₹97K" delta="↑ ₹9K this month" deltaType="up"      icon={IndianRupee}  iconBg="bg-purple-50" />
      </div>

      {/* Row 1: Scan trend + Category pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Scan trend — takes 2/3 */}
        <div className="lg:col-span-2">
          <ChartPanel
            title="Scan activity"
            subtitle="Daily scans vs completed — last 7 days"
          >
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={SCAN_TREND}
                         margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ea580c" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="gradDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0f1f3d" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#0f1f3d" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis                tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip {...TooltipStyle} />
                <Area type="monotone" dataKey="scans"     name="Total scans"
                      stroke="#ea580c" strokeWidth={2}
                      fill="url(#gradScans)" />
                <Area type="monotone" dataKey="completed" name="Completed"
                      stroke="#0f1f3d" strokeWidth={2}
                      fill="url(#gradDone)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartPanel>
        </div>

        {/* Category pie — 1/3 */}
        <ChartPanel title="Category split" subtitle="By item count">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={CATEGORY_DATA}
                cx="50%" cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="count"
              >
                {CATEGORY_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                {...TooltipStyle}
                formatter={(value, name) => [`${value} items`, name]}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="space-y-1.5 mt-2">
            {CATEGORY_DATA.map(c => (
              <div key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                       style={{ background: c.fill }} />
                  <span className="text-xs text-gray-600">{c.name}</span>
                </div>
                <span className="text-xs font-semibold text-navy-800">{c.count}</span>
              </div>
            ))}
          </div>
        </ChartPanel>
      </div>

      {/* Row 2: Inventory value trend + Confidence distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Value trend */}
        <ChartPanel title="Inventory value" subtitle="Total portfolio value — last 6 months">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={VALUE_TREND}
                       margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                {...TooltipStyle}
                formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Portfolio value']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#ea580c"
                strokeWidth={2.5}
                dot={{ fill: '#ea580c', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* Confidence distribution */}
        <ChartPanel title="AI confidence distribution" subtitle="Scans grouped by confidence score">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={CONFIDENCE_DATA}
                      margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis                 tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip {...TooltipStyle} formatter={v => [`${v} scans`, 'Count']} />
              <Bar dataKey="count" name="Scans" radius={[6, 6, 0, 0]}>
                {CONFIDENCE_DATA.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === 0 ? '#ea580c'
                        : i === 1 ? '#fb923c'
                        : i === 2 ? '#fbbf24'
                        : i === 3 ? '#94a3b8'
                        :           '#e2e8f0'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      {/* Top performers table */}
      <ChartPanel title="Top scanned components" subtitle="Most frequently identified this month">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                {['Component', 'Category', 'Scan count', 'Avg. confidence', 'Avg. price'].map(h => (
                  <th key={h} className="text-left pb-3 text-[11px] font-semibold
                                         text-gray-400 uppercase tracking-wide pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {[
                { name: 'M8 Hex Bolt SS304',    cat: 'Fasteners', count: 28, conf: 94, price: '₹45'   },
                { name: 'DC Motor 12V',          cat: 'Motors',    count: 19, conf: 89, price: '₹320'  },
                { name: 'Bearing 6205-2RS',       cat: 'Bearings',  count: 15, conf: 97, price: '₹180'  },
                { name: 'Proximity Sensor NPN',  cat: 'Sensors',   count: 12, conf: 91, price: '₹450'  },
                { name: 'Limit Switch NC/NO',    cat: 'Switches',  count: 9,  conf: 88, price: '₹95'   },
              ].map((row, i) => (
                <tr key={row.name} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                      <span className="font-medium text-navy-800">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs bg-gray-100 text-gray-600
                                    px-2 py-1 rounded-lg">{row.cat}</span>
                  </td>
                  <td className="py-3 pr-4 font-semibold text-navy-800">{row.count}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-semibold
                      ${row.conf >= 90 ? 'text-green-600' : 'text-amber-600'}`}>
                      {row.conf}%
                    </span>
                  </td>
                  <td className="py-3 font-semibold text-orange-600">{row.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartPanel>
    </div>
  )
}