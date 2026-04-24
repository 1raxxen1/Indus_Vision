import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { inventoryService } from '../../services/inventoryService'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'

import { FilterBar } from '../../components/inventory/FilterBar'
import { DataTable } from '../../components/inventory/DataTable'
import { StatsCard } from '../../components/charts/StatsCard'

import {
  Package, IndianRupee,
  AlertTriangle, Download, Plus,
} from 'lucide-react'


// ── CSV Export ─────────────────────────
function exportCSV(items) {
  if (!items.length) return

  const headers = [
    'ID','Name','Part Number','Category',
    'Quantity','Unit Price','Total Value','Status','Last Scan'
  ]

  const rows = items.map(i =>
    [
      i.id, i.name, i.partNumber, i.category,
      i.quantity, i.unitPrice, i.totalValue,
      i.status, i.lastScan
    ].join(',')
  )

  const csv = [headers.join(','), ...rows].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `inventory_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()

  URL.revokeObjectURL(url)
}


export function InventoryListPage() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState('All')

  // ── API ────────────────────────────
  const { data = {}, loading, error, refetch } = useApi(
    () => inventoryService.getScanInventory()
  )

  if (loading) return <LoadingSpinner message="Loading inventory..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />


  // ── Handle BOTH API cases ───────────
  const hasItems = Array.isArray(data.items) && data.items.length > 0

  const allItems = hasItems
    ? data.items.map(item => ({
        id: item.id,
        name: item.name,
        partNumber: item.part_number ?? '—',
        category: item.category ?? 'General',
        quantity: item.quantity ?? 0,
        unitPrice: item.unit_price ?? 0,
        totalValue:
          item.total_value ??
          ((item.quantity ?? 0) * (item.unit_price ?? 0)),
        status: item.status ?? 'In stock',
        lastScan: item.last_scan ?? '—',
      }))
    : []


  // ── Stats ───────────────────────────
  const stats = useMemo(() => ({
    total:
      data.total_items ??
      data.inventory_scans ??
      allItems.length,

    totalValue:
      data.total_value ??
      allItems.reduce((s, i) => s + i.totalValue, 0),

    lowStock:
      data.low_stock ??
      allItems.filter(i => i.status === 'Low stock').length,

    outOfStock:
      data.out_of_stock ??
      allItems.filter(i => i.status === 'Out of stock').length,
  }), [data, allItems])


  // ── Filtering ───────────────────────
  const filtered = useMemo(() => {
    return allItems.filter(item => {
      const matchSearch =
        search === '' ||
        item.name.toLowerCase().includes(search.toLowerCase())

      const matchCategory =
        category === 'All' || item.category === category

      const matchStatus =
        status === 'All' || item.status === status

      return matchSearch && matchCategory && matchStatus
    })
  }, [search, category, status, allItems])


  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-gray-500">
            All scanned components
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => exportCSV(filtered)}>
            <Download size={14} /> Export
          </button>

          <button onClick={() => navigate('/upload')}>
            <Plus size={14} /> Add item
          </button>
        </div>
      </div>


      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard label="Total items" value={stats.total} icon={Package} />
        <StatsCard label="Total value" value={`₹${stats.totalValue}`} icon={IndianRupee} />
        <StatsCard label="Low stock" value={stats.lowStock} icon={AlertTriangle} />
        <StatsCard label="Out of stock" value={stats.outOfStock} icon={Package} />
      </div>


      {/* Filters */}
      <FilterBar
        search={search}
        onSearch={setSearch}
        category={category}
        onCategory={setCategory}
        status={status}
        onStatus={setStatus}
      />


      {/* Table / Empty */}
      {hasItems ? (
        <DataTable items={filtered} />
      ) : (
        <div className="bg-white border rounded-xl p-10 text-center text-gray-400">
          Inventory items API not available yet.<br />
          Showing summary only.
        </div>
      )}

    </div>
  )
}
