// InventoryListPage.jsx
// Shows all saved inventory items in a searchable, filterable table.
// Summary cards at the top give a quick overview.
// Export button downloads a CSV.

import { useState, useMemo }  from 'react'
import { useNavigate }        from 'react-router-dom'
import { FilterBar }          from '../../components/inventory/FilterBar'
import { DataTable }          from '../../components/inventory/DataTable'
import { StatsCard }          from '../../components/charts/StatsCard'
import {
  Package, IndianRupee,
  AlertTriangle, Download,
  Plus,
} from 'lucide-react'

// ── Mock inventory data ──────────────────────────────────────────
// Structured exactly like your Django API will return.
// Replace with: const items = await inventoryService.getAll()

const MOCK_ITEMS = [
  { id: 1,  name: 'M8 Hex Bolt SS304',       partNumber: 'BLT-M8-SS-35',  category: 'Fasteners', quantity: 850,  unitPrice: 45,   totalValue: 38250, status: 'In stock',     lastScan: '2 hrs ago'    },
  { id: 2,  name: 'M6 Hex Nut Zinc Plated',  partNumber: 'NUT-M6-ZN',     category: 'Fasteners', quantity: 1200, unitPrice: 12,   totalValue: 14400, status: 'In stock',     lastScan: '5 hrs ago'    },
  { id: 3,  name: 'DC Motor 12V 150RPM',     partNumber: 'MOT-DC12-150',  category: 'Motors',    quantity: 14,   unitPrice: 320,  totalValue: 4480,  status: 'Low stock',    lastScan: 'Yesterday'    },
  { id: 4,  name: 'Bearing 6205-2RS',        partNumber: 'BRG-6205-2RS',  category: 'Bearings',  quantity: 60,   unitPrice: 180,  totalValue: 10800, status: 'In stock',     lastScan: '2 days ago'   },
  { id: 5,  name: 'Proximity Sensor NPN',    partNumber: 'SEN-PROX-NPN',  category: 'Sensors',   quantity: 8,    unitPrice: 450,  totalValue: 3600,  status: 'Low stock',    lastScan: '3 days ago'   },
  { id: 6,  name: 'Limit Switch NC/NO',      partNumber: 'SW-LMT-NCNO',   category: 'Switches',  quantity: 35,   unitPrice: 95,   totalValue: 3325,  status: 'In stock',     lastScan: '5 hrs ago'    },
  { id: 7,  name: 'Stepper Motor NEMA 17',   partNumber: 'MOT-STP-N17',   category: 'Motors',    quantity: 0,    unitPrice: 780,  totalValue: 0,     status: 'Out of stock', lastScan: '1 week ago'   },
  { id: 8,  name: 'M10 Flat Washer',        partNumber: 'WSH-M10-ZN',    category: 'Fasteners', quantity: 2000, unitPrice: 5,    totalValue: 10000, status: 'In stock',     lastScan: '1 week ago'   },
  { id: 9,  name: 'Hall Effect Sensor',      partNumber: 'SEN-HALL-5V',   category: 'Sensors',   quantity: 22,   unitPrice: 85,   totalValue: 1870,  status: 'In stock',     lastScan: '4 days ago'   },
  { id: 10, name: 'Deep Groove Bearing 608', partNumber: 'BRG-608-ZZ',    category: 'Bearings',  quantity: 7,    unitPrice: 55,   totalValue: 385,   status: 'Low stock',    lastScan: '6 days ago'   },
  { id: 11, name: 'Push Button Switch',      partNumber: 'SW-PUSH-12MM',  category: 'Switches',  quantity: 45,   unitPrice: 28,   totalValue: 1260,  status: 'In stock',     lastScan: '3 days ago'   },
  { id: 12, name: 'BLDC Motor 24V',          partNumber: 'MOT-BLDC-24V',  category: 'Motors',    quantity: 5,    unitPrice: 1850, totalValue: 9250,  status: 'Low stock',    lastScan: '2 weeks ago'  },
]

// ── CSV export utility ────────────────────────────────────────────
function exportCSV(items) {
  const headers = ['ID', 'Name', 'Part Number', 'Category', 'Quantity',
                   'Unit Price (₹)', 'Total Value (₹)', 'Status', 'Last Scan']
  const rows = items.map(i =>
    [i.id, i.name, i.partNumber, i.category, i.quantity,
     i.unitPrice, i.totalValue, i.status, i.lastScan].join(',')
  )
  const csv  = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `inventory_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ════════════════════════════════════════════════════════════════
// INVENTORY LIST PAGE
// ════════════════════════════════════════════════════════════════
export function InventoryListPage() {
  const navigate = useNavigate()

  // ── Filter state ─────────────────────────────────────────────
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('All')
  const [status,   setStatus]   = useState('All')

  // ── Derived stats ─────────────────────────────────────────────
  // useMemo so these don't recompute on every render
  const stats = useMemo(() => ({
    total:      MOCK_ITEMS.length,
    totalValue: MOCK_ITEMS.reduce((s, i) => s + i.totalValue, 0),
    lowStock:   MOCK_ITEMS.filter(i => i.status === 'Low stock').length,
    outOfStock: MOCK_ITEMS.filter(i => i.status === 'Out of stock').length,
  }), [])

  // ── Filtered items ─────────────────────────────────────────────
  // useMemo — only recalculates when search/category/status changes
  const filtered = useMemo(() => {
    return MOCK_ITEMS.filter(item => {
      const matchSearch   = search === '' ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.partNumber.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase())

      const matchCategory = category === 'All' || item.category === category
      const matchStatus   = status   === 'All' || item.status   === status

      return matchSearch && matchCategory && matchStatus
    })
  }, [search, category, status])

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-5">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">
            All scanned and saved industrial components
          </p>
        </div>

        {/* Header actions */}
        <div className="flex gap-2">
          <button
            onClick={() => exportCSV(filtered)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                       border border-surface-border bg-white text-sm
                       font-medium text-gray-600 hover:bg-gray-50
                       transition-all duration-200 active:scale-95"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                       bg-orange-600 hover:bg-orange-700 text-white
                       text-sm font-medium transition-all duration-200
                       active:scale-95 shadow-sm"
          >
            <Plus size={14} />
            Add item
          </button>
        </div>
      </div>

      {/* ── Summary stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total items"
          value={stats.total.toString()}
          icon={Package}
          iconBg="bg-orange-50"
        />
        <StatsCard
          label="Total value"
          value={`₹${(stats.totalValue / 1000).toFixed(1)}K`}
          icon={IndianRupee}
          iconBg="bg-blue-50"
        />
        <StatsCard
          label="Low stock"
          value={stats.lowStock.toString()}
          delta="Needs attention"
          deltaType="down"
          icon={AlertTriangle}
          iconBg="bg-amber-50"
        />
        <StatsCard
          label="Out of stock"
          value={stats.outOfStock.toString()}
          delta="Reorder needed"
          deltaType="down"
          icon={Package}
          iconBg="bg-red-50"
        />
      </div>

      {/* ── Filter bar ─────────────────────────────────────────── */}
      <FilterBar
        search={search}     onSearch={setSearch}
        category={category} onCategory={setCategory}
        status={status}     onStatus={setStatus}
      />

      {/* ── Active filter pills ─────────────────────────────────── */}
      {(search || category !== 'All' || status !== 'All') && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400">Active filters:</span>

          {search && (
            <FilterPill label={`"${search}"`} onRemove={() => setSearch('')} />
          )}
          {category !== 'All' && (
            <FilterPill label={category} onRemove={() => setCategory('All')} />
          )}
          {status !== 'All' && (
            <FilterPill label={status} onRemove={() => setStatus('All')} />
          )}

          <button
            onClick={() => { setSearch(''); setCategory('All'); setStatus('All') }}
            className="text-xs text-orange-600 hover:text-orange-700
                       font-medium transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Data table ─────────────────────────────────────────── */}
      <DataTable items={filtered} />
    </div>
  )
}

// ── Filter pill sub-component ─────────────────────────────────────
function FilterPill({ label, onRemove }) {
  return (
    <span className="flex items-center gap-1.5 text-xs bg-orange-50
                     text-orange-700 border border-orange-200
                     px-2.5 py-1 rounded-full font-medium">
      {label}
      <button
        onClick={onRemove}
        className="hover:text-orange-900 transition-colors font-bold"
      >
        ×
      </button>
    </span>
  )
}