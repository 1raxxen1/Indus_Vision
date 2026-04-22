// DataTable.jsx
// Renders the inventory items as a clean sortable table.
// Clicking a column header sorts by that column.
// Clicking a row opens the item detail.

import { useState }          from 'react'
import { useNavigate }       from 'react-router-dom'
import { Badge }             from '../ui/Badge'
import { ChevronUp, ChevronDown, ChevronsUpDown,
         Package, ArrowRight } from 'lucide-react'

// ── Stock status → badge variant ─────────────────────────────────
function StockBadge({ status }) {
  const map = {
    'In stock':      'green',
    'Low stock':     'orange',
    'Out of stock':  'red',
  }
  return <Badge variant={map[status] ?? 'gray'}>{status}</Badge>
}

// ── Sort icon ────────────────────────────────────────────────────
function SortIcon({ column, sortCol, sortDir }) {
  if (sortCol !== column) return <ChevronsUpDown size={13} className="text-gray-300" />
  return sortDir === 'asc'
    ? <ChevronUp   size={13} className="text-orange-500" />
    : <ChevronDown size={13} className="text-orange-500" />
}

// ── Column definitions ────────────────────────────────────────────
const COLUMNS = [
  { key: 'name',      label: 'Component',     sortable: true  },
  { key: 'category',  label: 'Category',      sortable: true  },
  { key: 'quantity',  label: 'Qty',           sortable: true  },
  { key: 'unitPrice', label: 'Unit price',    sortable: true  },
  { key: 'totalValue',label: 'Total value',   sortable: true  },
  { key: 'status',    label: 'Status',        sortable: true  },
  { key: 'lastScan',  label: 'Last scanned',  sortable: false },
  { key: 'action',    label: '',              sortable: false },
]

export function DataTable({ items }) {
  const navigate              = useNavigate()
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  // ── Handle column header click ────────────────────────────────
  function handleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  // ── Sort the items ────────────────────────────────────────────
  const sorted = [...items].sort((a, b) => {
    const valA = a[sortCol]
    const valB = b[sortCol]
    if (valA == null) return 1
    if (valB == null) return -1
    const cmp = typeof valA === 'string'
      ? valA.localeCompare(valB)
      : valA - valB
    return sortDir === 'asc' ? cmp : -cmp
  })

  // ── Empty state ───────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="bg-white border border-surface-border rounded-xl
                      flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
          <Package size={22} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-500">No items found</p>
        <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>

          {/* Column widths */}
          <colgroup>
            <col style={{ width: '24%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '7%'  }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '8%'  }} />
          </colgroup>

          {/* Header */}
          <thead>
            <tr className="border-b border-surface-border bg-gray-50">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`
                    text-left px-4 py-3 text-[11px] font-semibold
                    text-gray-500 uppercase tracking-wide
                    ${col.sortable
                      ? 'cursor-pointer select-none hover:text-navy-700 hover:bg-gray-100'
                      : ''}
                    transition-colors duration-150
                  `}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <SortIcon
                        column={col.key}
                        sortCol={sortCol}
                        sortDir={sortDir}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-surface-border">
            {sorted.map(item => (
              <tr
                key={item.id}
                onClick={() => navigate(`/inventory/${item.id}`)}
                className="hover:bg-orange-50/50 cursor-pointer
                           transition-colors duration-100 group"
              >
                {/* Component name + part number */}
                <td className="px-4 py-3.5">
                  <p className="font-medium text-navy-800 truncate
                                group-hover:text-orange-700 transition-colors">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                    {item.partNumber}
                  </p>
                </td>

                {/* Category */}
                <td className="px-4 py-3.5">
                  <span className="text-xs text-gray-600 bg-gray-100
                                   px-2 py-1 rounded-lg">
                    {item.category}
                  </span>
                </td>

                {/* Quantity */}
                <td className="px-4 py-3.5">
                  <span className="text-sm font-semibold text-navy-800">
                    {item.quantity}
                  </span>
                </td>

                {/* Unit price */}
                <td className="px-4 py-3.5 text-sm text-navy-800">
                  ₹{item.unitPrice.toLocaleString('en-IN')}
                </td>

                {/* Total value */}
                <td className="px-4 py-3.5">
                  <span className="text-sm font-semibold text-orange-600">
                    ₹{item.totalValue.toLocaleString('en-IN')}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  <StockBadge status={item.status} />
                </td>

                {/* Last scanned */}
                <td className="px-4 py-3.5 text-xs text-gray-400">
                  {item.lastScan}
                </td>

                {/* Arrow */}
                <td className="px-4 py-3.5">
                  <ArrowRight
                    size={14}
                    className="text-gray-300 group-hover:text-orange-400
                               transition-colors duration-150"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer row — item count */}
      <div className="px-4 py-3 border-t border-surface-border bg-gray-50">
        <p className="text-xs text-gray-400">
          Showing <span className="font-semibold text-navy-700">{items.length}</span> items
        </p>
      </div>
    </div>
  )
}