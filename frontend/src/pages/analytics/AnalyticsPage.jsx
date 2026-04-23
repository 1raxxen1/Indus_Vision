import { useState } from 'react'

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from 'recharts'

import { useApi } from '../../hooks/useApi'
import { analyticsService } from '../../services/analyticsService'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'

import { StatsCard } from '../../components/charts/StatsCard'
import {
  ScanLine, Package,
  CheckCircle, IndianRupee,
} from 'lucide-react'


// ── Tooltip ───────────────────────────
const TooltipStyle = {
  contentStyle: {
    background: 'white',
    border: '1px solid #e8eaf0',
    borderRadius: '10px',
    fontSize: '12px',
  },
}


// ── Chart Panel ───────────────────────
function ChartPanel({ title, subtitle, children }) {
  return (
    <div className="bg-white border rounded-xl p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      {children}
    </div>
  )
}


// ── Range Selector ────────────────────
function RangeSelector({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {['7d', '30d', '90d'].map(r => (
        <button key={r} onClick={() => onChange(r)}>
          {r}
        </button>
      ))}
    </div>
  )
}


// ═══════════════════════════════════════
// ANALYTICS PAGE
// ═══════════════════════════════════════
export function AnalyticsPage() {
  const [range, setRange] = useState('7d')

  const { data = {}, loading, error, refetch } = useApi(
    () => analyticsService.getSnapshot(range),
    [range]
  )

  if (loading) return <LoadingSpinner message="Loading analytics..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />


  // ── REAL BACKEND VALUES ─────────────
  const periodLabel = data?.latest_period ?? 'No data yet'
  const totalSnapshots = data?.analytics_snapshots ?? 0


  // ── SAFE FALLBACK DATA (for charts) ─
  const scanTrend = data?.scan_trend ?? []
  const categoryData = data?.category_split ?? []
  const valueTrend = data?.value_trend ?? []
  const confidenceDist = data?.confidence_dist ?? []
  const topComponents = data?.top_components ?? []


  const stats = {
    totalScans: data?.total_scans ?? totalSnapshots,
    accuracy: data?.accuracy_rate ?? 0,
    totalItems: data?.total_items ?? 0,
    totalValue: data?.total_value ?? 0,
  }


  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-gray-400">
            {periodLabel}
          </p>
        </div>

        <RangeSelector value={range} onChange={setRange} />
      </div>


      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard label="Snapshots" value={stats.totalScans} icon={ScanLine} />
        <StatsCard label="Accuracy" value={`${stats.accuracy}%`} icon={CheckCircle} />
        <StatsCard label="Items" value={stats.totalItems} icon={Package} />
        <StatsCard label="Value" value={`₹${stats.totalValue}`} icon={IndianRupee} />
      </div>


      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">

        <ChartPanel title="Scan Trend" subtitle={!scanTrend.length ? 'No data yet' : ''}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={scanTrend}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip {...TooltipStyle} />
              <Area dataKey="scans" stroke="#ea580c" fill="#ea580c" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>


        <ChartPanel title="Category Split" subtitle={!categoryData.length ? 'No data yet' : ''}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} dataKey="count">
                {categoryData.map((c, i) => (
                  <Cell key={i} fill={c.fill || '#ea580c'} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>


        <ChartPanel title="Inventory Value" subtitle={!valueTrend.length ? 'No data yet' : ''}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={valueTrend}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip {...TooltipStyle} />
              <Line dataKey="value" stroke="#ea580c" />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>


        <ChartPanel title="Confidence" subtitle={!confidenceDist.length ? 'No data yet' : ''}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={confidenceDist}>
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip {...TooltipStyle} />
              <Bar dataKey="count" fill="#ea580c" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

      </div>


      {/* Top Components */}
      <ChartPanel title="Top Components">
        {topComponents.length === 0 ? (
          <p className="text-sm text-gray-400">No data yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Count</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {topComponents.map((c, i) => (
                <tr key={i}>
                  <td>{c.name}</td>
                  <td>{c.count}</td>
                  <td>{c.confidence}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ChartPanel>

    </div>
  )
}