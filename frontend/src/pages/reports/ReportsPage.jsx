import { useState }    from 'react'
import { Badge }       from '../../components/ui/Badge'
import {
  FileText, FileSpreadsheet, Download,
  Calendar, CheckCircle, Clock,
  Filter, Plus,
} from 'lucide-react'

const REPORT_TYPES = [
  {
    id: 'full',
    icon: FileText,
    title: 'Full inventory report',
    desc:  'Complete list of all items with specs, prices, and status',
    formats: ['PDF', 'CSV'],
    bg:    'bg-orange-50',
    color: 'text-orange-600',
  },
  {
    id: 'scan',
    icon: FileText,
    title: 'Scan history report',
    desc:  'All past scans with AI confidence scores and pricing',
    formats: ['PDF', 'CSV'],
    bg:    'bg-blue-50',
    color: 'text-blue-600',
  },
  {
    id: 'analytics',
    icon: FileSpreadsheet,
    title: 'Analytics summary',
    desc:  'Charts and trends — categories, value, accuracy over time',
    formats: ['PDF'],
    bg:    'bg-green-50',
    color: 'text-green-600',
  },
  {
    id: 'lowstock',
    icon: FileText,
    title: 'Low stock alert report',
    desc:  'Items that need reordering or are out of stock',
    formats: ['PDF', 'CSV'],
    bg:    'bg-amber-50',
    color: 'text-amber-600',
  },
]

const PAST_REPORTS = [
  { id: 1, name: 'Full inventory report',   date: 'Apr 14, 2026', size: '2.4 MB', format: 'PDF', status: 'ready'      },
  { id: 2, name: 'Scan history — March',    date: 'Apr 01, 2026', size: '1.1 MB', format: 'CSV', status: 'ready'      },
  { id: 3, name: 'Analytics summary Q1',    date: 'Mar 31, 2026', size: '3.8 MB', format: 'PDF', status: 'ready'      },
  { id: 4, name: 'Low stock alert report',  date: 'Mar 20, 2026', size: '0.4 MB', format: 'CSV', status: 'ready'      },
  { id: 5, name: 'Full inventory report',   date: 'Mar 01, 2026', size: '2.1 MB', format: 'PDF', status: 'ready'      },
]

function GenerateModal({ type, onClose }) {
  const [format,     setFormat]     = useState(type.formats[0])
  const [dateRange,  setDateRange]  = useState('all')
  const [generating, setGenerating] = useState(false)
  const [done,       setDone]       = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 1800))
    setGenerating(false)
    setDone(true)
    setTimeout(onClose, 1200)
  }

  return (
    // Faux modal — uses normal flow so iframe height works correctly
    <div style={{ minHeight: 320, background: 'rgba(0,0,0,0.4)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center' }}
         className="fixed inset-0 z-50"
         onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl"
           onClick={e => e.stopPropagation()}>

        <h2 className="text-base font-bold text-navy-800 mb-1">{type.title}</h2>
        <p className="text-xs text-gray-400 mb-5">{type.desc}</p>

        {/* Format */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Format
          </label>
          <div className="flex gap-2 mt-2">
            {type.formats.map(f => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium
                           border transition-all duration-150
                           ${format === f
                             ? 'bg-navy-800 text-white border-navy-800'
                             : 'border-surface-border text-gray-600 hover:bg-gray-50'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Date range
          </label>
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="mt-2 w-full text-sm bg-white border border-surface-border
                       rounded-xl px-3 py-2.5 outline-none focus:border-orange-400
                       focus:ring-2 focus:ring-orange-100 text-navy-800"
          >
            <option value="all">All time</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-surface-border rounded-xl
                       text-sm font-medium text-gray-600 hover:bg-gray-50
                       transition-all duration-150"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || done}
            className={`flex-1 flex items-center justify-center gap-2
                       py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                       ${done
                         ? 'bg-green-500 text-white'
                         : 'bg-orange-600 hover:bg-orange-700 text-white active:scale-95'
                       } ${generating ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {done ? (
              <><CheckCircle size={14} /> Done!</>
            ) : generating ? (
              <><span className="w-3 h-3 border-2 border-white/30 border-t-white
                                  rounded-full animate-spin" /> Generating...</>
            ) : (
              <><Download size={14} /> Generate</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ReportsPage() {
  const [activeModal, setActiveModal] = useState(null)

  const activeType = REPORT_TYPES.find(t => t.id === activeModal)

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-6">

      {activeModal && activeType && (
        <GenerateModal type={activeType} onClose={() => setActiveModal(null)} />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-800">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate and download inventory reports in PDF or CSV format
        </p>
      </div>

      {/* Report type cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase
                       tracking-wide mb-3">Generate new report</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REPORT_TYPES.map(type => {
            const Icon = type.icon
            return (
              <div key={type.id}
                   className="bg-white border border-surface-border rounded-xl p-5
                              hover:shadow-md transition-all duration-200 group">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 ${type.bg} rounded-xl flex items-center
                                  justify-center flex-shrink-0`}>
                    <Icon size={18} className={type.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-800">{type.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{type.desc}</p>
                    <div className="flex items-center gap-2 mt-3">
                      {type.formats.map(f => (
                        <span key={f} className="text-[10px] font-medium bg-gray-100
                                                  text-gray-600 px-2 py-0.5 rounded-full">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal(type.id)}
                  className="mt-4 w-full flex items-center justify-center gap-2
                             py-2 rounded-xl border border-surface-border
                             text-xs font-medium text-gray-600
                             hover:bg-orange-50 hover:border-orange-200
                             hover:text-orange-700 transition-all duration-150"
                >
                  <Plus size={13} /> Generate report
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Past reports */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase
                       tracking-wide mb-3">Previously generated</h2>
        <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
          {PAST_REPORTS.map((report, i) => (
            <div
              key={report.id}
              className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50
                         transition-colors ${i !== 0 ? 'border-t border-surface-border' : ''}`}
            >
              <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center
                              justify-center flex-shrink-0">
                <FileText size={15} className="text-orange-500" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy-800">{report.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                  <Calendar size={10} />
                  {report.date}
                  <span>·</span>
                  {report.size}
                </p>
              </div>

              <span className="text-[10px] font-medium bg-gray-100 text-gray-600
                              px-2 py-0.5 rounded-full">{report.format}</span>

              <Badge variant="green">Ready</Badge>

              <button
                onClick={() => alert(`Downloading ${report.name}...`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                           border border-surface-border text-xs font-medium
                           text-gray-600 hover:bg-orange-50 hover:border-orange-200
                           hover:text-orange-700 transition-all duration-150"
              >
                <Download size={12} /> Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}