// ItemDetailPage.jsx
// Full detail view for a single inventory item.
// Accessed by clicking any row in the DataTable.

import { useParams, useNavigate } from 'react-router-dom'
import { Badge }   from '../../components/ui/Badge'
import { ArrowLeft, Edit2, Trash2,
         Package,  IndianRupee,
         Calendar, Hash }         from 'lucide-react'

// In real app: fetch from inventoryService.getById(id)
// Here we just use the same mock array
const MOCK_ITEMS = [
  { id: 1, name: 'M8 Hex Bolt SS304', partNumber: 'BLT-M8-SS-35',
    category: 'Fasteners', quantity: 850, unitPrice: 45,
    totalValue: 38250, status: 'In stock', lastScan: '2 hrs ago',
    description: 'Standard M8 hexagon head bolt in stainless steel 304 grade. DIN 933 specification, 35mm length, fully threaded.',
    specifications: [
      { key: 'Thread',    value: 'M8 × 1.25' },
      { key: 'Length',    value: '35 mm'      },
      { key: 'Material',  value: 'SS 304'     },
      { key: 'Standard',  value: 'DIN 933'    },
      { key: 'Finish',    value: 'Natural'    },
      { key: 'Grade',     value: 'A2-70'      },
    ],
  },
]

const STATUS_VARIANT = {
  'In stock':     'green',
  'Low stock':    'orange',
  'Out of stock': 'red',
}

export function ItemDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()

  // Find item — replace with API call when backend is ready
  const item = MOCK_ITEMS.find(i => i.id === Number(id))

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Package size={36} className="text-gray-300" />
        <p className="text-sm text-gray-500">Item not found</p>
        <button
          onClick={() => navigate('/inventory')}
          className="text-xs text-orange-600 hover:text-orange-700 font-medium"
        >
          Back to inventory
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/inventory')}
          className="p-2 rounded-xl border border-surface-border bg-white
                     hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={16} className="text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-navy-800">{item.name}</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{item.partNumber}</p>
        </div>
        <Badge variant={STATUS_VARIANT[item.status] ?? 'gray'}>
          {item.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Left — key metrics */}
        <div className="space-y-3">
          {[
            { icon: Package,     label: 'Quantity',    value: `${item.quantity} units`                        },
            { icon: IndianRupee, label: 'Unit price',  value: `₹${item.unitPrice.toLocaleString('en-IN')}`    },
            { icon: IndianRupee, label: 'Total value', value: `₹${item.totalValue.toLocaleString('en-IN')}`,
              highlight: true },
            { icon: Calendar,    label: 'Last scanned', value: item.lastScan                                  },
            { icon: Hash,        label: 'Category',    value: item.category                                   },
          ].map(({ icon: Icon, label, value, highlight }) => (
            <div key={label}
                 className="bg-white border border-surface-border rounded-xl px-4 py-3
                            flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={14} className="text-orange-600" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                <p className={`text-sm font-semibold mt-0.5
                  ${highlight ? 'text-orange-600' : 'text-navy-800'}`}>
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Right — description + specs */}
        <div className="md:col-span-2 space-y-4">

          {/* Description */}
          {item.description && (
            <div className="bg-white border border-surface-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-navy-800 mb-2">Description</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
            </div>
          )}

          {/* Specs */}
          {item.specifications?.length > 0 && (
            <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-surface-border">
                <h2 className="text-sm font-semibold text-navy-800">Specifications</h2>
              </div>
              <div className="divide-y divide-surface-border">
                {item.specifications.map(({ key, value }) => (
                  <div key={key}
                       className="flex justify-between px-5 py-3
                                  hover:bg-gray-50 transition-colors">
                    <span className="text-xs text-gray-500">{key}</span>
                    <span className="text-xs font-medium text-navy-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button className="flex-1 flex items-center justify-center gap-2
                               py-2.5 bg-orange-600 hover:bg-orange-700
                               text-white text-sm font-medium rounded-xl
                               transition-all duration-200 active:scale-95">
              <Edit2 size={14} /> Edit item
            </button>
            <button className="flex items-center justify-center gap-2
                               px-4 py-2.5 border border-red-200 bg-red-50
                               text-red-600 hover:bg-red-100 text-sm font-medium
                               rounded-xl transition-all duration-200">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}