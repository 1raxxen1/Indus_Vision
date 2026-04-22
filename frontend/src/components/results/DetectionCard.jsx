// DetectionCard.jsx
// Shows the primary AI detection result:
// component name, category, specifications, and confidence.

import { Badge }          from '../ui/Badge'
import { ConfidenceBar }  from './ConfidenceBar'
import { Tag, Cpu, Hash } from 'lucide-react'

export function DetectionCard({ result }) {
  const {
    name,
    category,
    confidence,
    specifications = [],
    description,
  } = result

  return (
    <div className="bg-white border border-surface-border rounded-xl overflow-hidden">

      {/* Card header — orange left border accent */}
      <div className="border-l-4 border-orange-500 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
              Detected component
            </p>
            <h3 className="text-lg font-bold text-navy-800 leading-tight">
              {name}
            </h3>
          </div>
          <Badge variant="green">Identified</Badge>
        </div>

        {/* Category pill */}
        <div className="flex items-center gap-1.5 mt-2">
          <Tag size={11} className="text-orange-500" />
          <span className="text-xs text-orange-700 font-medium bg-orange-50
                           px-2 py-0.5 rounded-full border border-orange-200">
            {category}
          </span>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-4">

        {/* Confidence bar */}
        <ConfidenceBar value={confidence} />

        {/* AI Description */}
        {description && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-2">
              <Cpu size={12} className="text-navy-400" />
              <span className="text-[11px] font-semibold text-navy-600 uppercase tracking-wide">
                LLAMA Analysis
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
          </div>
        )}

        {/* Specifications table */}
        {specifications.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Hash size={12} className="text-navy-400" />
              <span className="text-[11px] font-semibold text-navy-600 uppercase tracking-wide">
                Specifications
              </span>
            </div>
            <div className="divide-y divide-gray-100 rounded-xl border
                            border-surface-border overflow-hidden">
              {specifications.map(({ key, value }) => (
                <div key={key}
                     className="flex justify-between items-center px-4 py-2.5
                                hover:bg-gray-50 transition-colors">
                  <span className="text-xs text-gray-500">{key}</span>
                  <span className="text-xs font-medium text-navy-800">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}