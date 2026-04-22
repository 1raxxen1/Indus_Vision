// PricingCard.jsx
// Shows scraped Indian market pricing data for the detected component.
// Includes price range, per-unit cost, and supplier breakdown.

import { IndianRupee, TrendingUp, TrendingDown,
         ExternalLink, ShoppingCart }              from 'lucide-react'

function SupplierRow({ name, price, unit, url, isLowest }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3
                     border-b border-surface-border last:border-0
                     ${isLowest ? 'bg-green-50' : 'hover:bg-gray-50'}
                     transition-colors`}>
      <div className="flex items-center gap-2">
        {isLowest && (
          <span className="text-[9px] font-bold bg-green-500 text-white
                           px-1.5 py-0.5 rounded-full">BEST</span>
        )}
        <span className={`text-xs ${isLowest ? 'font-semibold text-navy-800'
                                              : 'text-gray-600'}`}>
          {name}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className={`text-sm font-bold ${isLowest ? 'text-green-700'
                                                       : 'text-navy-800'}`}>
            ₹{price}
          </p>
          <p className="text-[10px] text-gray-400">{unit}</p>
        </div>
        {url && (
          <a href={url}
             target="_blank"
             rel="noopener noreferrer"
             onClick={e => e.stopPropagation()}
             className="p-1 rounded-md hover:bg-white hover:shadow-sm
                        transition-all text-gray-400 hover:text-orange-500">
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  )
}

export function PricingCard({ pricing }) {
  const { priceMin, priceMax, perUnit, trend, suppliers = [] } = pricing

  const trendUp = trend === 'up'

  return (
    <div className="bg-white border border-surface-border rounded-xl overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center">
            <IndianRupee size={14} className="text-orange-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-navy-800">Market pricing</h3>
            <p className="text-[11px] text-gray-400">Live Indian market data</p>
          </div>
        </div>

        {/* Price range display */}
        <div className="flex items-end gap-3">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
              Price range
            </p>
            <p className="text-2xl font-bold text-navy-800">
              ₹{priceMin}
              <span className="text-gray-300 mx-1">–</span>
              ₹{priceMax}
            </p>
          </div>
          <div className="pb-1">
            <span className={`flex items-center gap-1 text-xs font-medium
              ${trendUp ? 'text-red-500' : 'text-green-600'}`}>
              {trendUp
                ? <TrendingUp   size={13} />
                : <TrendingDown size={13} />
              }
              {trendUp ? 'Rising' : 'Falling'}
            </span>
          </div>
        </div>

        {/* Per unit */}
        <div className="mt-2 flex items-center gap-2">
          <ShoppingCart size={12} className="text-gray-400" />
          <span className="text-xs text-gray-500">
            Approx. <span className="font-semibold text-navy-700">₹{perUnit}</span> per unit
            &nbsp;· Prices vary by quantity & supplier
          </span>
        </div>
      </div>

      {/* Supplier list */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase
                      tracking-wide px-5 py-2.5 border-b border-surface-border">
          Supplier comparison
        </p>
        {suppliers.map((s, i) => (
          <SupplierRow key={s.name} {...s} isLowest={i === 0} />
        ))}
      </div>

      <p className="text-[10px] text-gray-400 px-5 py-3 border-t border-surface-border">
        Prices scraped in real time · Data may vary · Always verify before purchasing
      </p>
    </div>
  )
}