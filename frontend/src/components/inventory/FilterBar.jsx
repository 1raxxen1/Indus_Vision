// FilterBar.jsx
// Controls for searching and filtering the inventory table.
// All state lives in the PARENT (InventoryListPage) —
// this component just fires callbacks when filters change.

import { Input }  from '../ui/Input'
import { Search, SlidersHorizontal } from 'lucide-react'

const CATEGORIES = ['All', 'Fasteners', 'Motors', 'Bearings', 'Sensors', 'Switches', 'Other']
const STATUSES   = ['All', 'In stock', 'Low stock', 'Out of stock']

export function FilterBar({ search, onSearch, category, onCategory, status, onStatus }) {
  return (
    <div className="bg-white border border-surface-border rounded-xl p-4">
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Search input */}
        <div className="flex-1">
          <Input
            icon={Search}
            placeholder="Search by name, part number, or category..."
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-gray-400 flex-shrink-0" />
          <select
            value={category}
            onChange={e => onCategory(e.target.value)}
            className="text-sm bg-white border border-surface-border
                       rounded-xl px-3 py-2.5 outline-none
                       focus:border-orange-400 focus:ring-2 focus:ring-orange-100
                       text-navy-800 transition-all duration-200 cursor-pointer"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <select
          value={status}
          onChange={e => onStatus(e.target.value)}
          className="text-sm bg-white border border-surface-border
                     rounded-xl px-3 py-2.5 outline-none
                     focus:border-orange-400 focus:ring-2 focus:ring-orange-100
                     text-navy-800 transition-all duration-200 cursor-pointer"
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>
          ))}
        </select>
      </div>
    </div>
  )
}