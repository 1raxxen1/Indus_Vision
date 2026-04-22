// ResultsPage.jsx
// Displays the complete AI analysis for one scan:
//   - Uploaded image with detection overlay placeholder
//   - AI identification card (DetectionCard)
//   - OCR text extraction (OCRCard)
//   - Indian market pricing (PricingCard)
//   - Action buttons: save to inventory, download, new scan

import { useNavigate, useLocation } from 'react-router-dom'
import { DetectionCard }  from '../../components/results/DetectionCard'
import { OCRCard }        from '../../components/results/OCRCard'
import { PricingCard }    from '../../components/results/PricingCard'
import { Badge }          from '../../components/ui/Badge'
import {
  ArrowLeft, Download, Save,
  Upload, Share2, ImageIcon,
  CheckCircle,
} from 'lucide-react'

// ── Mock result data ─────────────────────────────────────────────
// This is structured exactly how your Django API should return data.
// When you connect the backend, replace MOCK_RESULT with:
//   const { data: result } = await scanService.getResult(scanId)

const MOCK_RESULT = {
  scanId:     'scan_mock_001',
  scanTime:   '16 Apr 2026, 2:34 PM',
  imageUrl:   null, // will be a real URL from backend

  detection: {
    name:       'M8 Hexagon Head Bolt — Grade 8.8 Steel',
    category:   'Fasteners',
    confidence: 94,
    description:
      'This appears to be a standard M8 hexagon head bolt manufactured to DIN 933 ' +
      'specification. The bolt shows Grade 8.8 markings on the head, indicating ' +
      'medium-high tensile strength. Suitable for general engineering applications, ' +
      'automotive assembly, and structural connections. No visible corrosion or ' +
      'thread damage detected.',
    specifications: [
      { key: 'Thread diameter', value: 'M8 (8mm)' },
      { key: 'Standard',        value: 'DIN 933 / ISO 4017' },
      { key: 'Grade',           value: '8.8 (Medium-high strength)' },
      { key: 'Material',        value: 'Carbon steel' },
      { key: 'Drive type',      value: 'Hexagon head (17mm AF)' },
      { key: 'Finish',          value: 'Zinc plated (electroplated)' },
    ],
  },

  ocr: {
    texts: ['M8', '8.8', 'DIN 933', '35mm', 'ZN', 'INDIA', '304'],
  },

  pricing: {
    priceMin: 38,
    priceMax: 65,
    perUnit:  45,
    trend:    'down',
    suppliers: [
      { name: 'IndiaMART — Rajesh Fasteners', price: '38',   unit: 'per pc (MOQ 100)', url: '#' },
      { name: 'Moglix Industrial',             price: '42',   unit: 'per pc',           url: '#' },
      { name: 'TradeIndia Supplies',           price: '48',   unit: 'per pc (MOQ 50)',  url: '#' },
      { name: 'Amazon Business IN',            price: '65',   unit: 'per pc (retail)',  url: '#' },
    ],
  },
}

// ── Image panel ──────────────────────────────────────────────────
function ImagePanel({ imageUrl, componentName }) {
  return (
    <div className="bg-white border border-surface-border rounded-xl overflow-hidden">

      {/* Image area */}
      <div className="relative bg-gray-100 aspect-[4/3] flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={componentName}
            className="w-full h-full object-contain"
          />
        ) : (
          // Placeholder when no real image URL yet
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <ImageIcon size={36} className="text-gray-300" />
            <p className="text-xs">Scanned image</p>
          </div>
        )}

        {/* Bounding box overlay — visible when real detections come from backend */}
        {/* Backend returns box coordinates: { x, y, w, h } as percentages */}
        {/* Example: <div style={{ left:'20%', top:'15%', width:'60%', height:'70%' }}
                          className="absolute border-2 border-orange-500 rounded" /> */}

        {/* "Detected" badge floating over image */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5
                        bg-white/90 backdrop-blur-sm rounded-full
                        px-3 py-1 border border-green-200 shadow-sm">
          <CheckCircle size={12} className="text-green-500" />
          <span className="text-xs font-medium text-green-700">Object detected</span>
        </div>
      </div>

      {/* Image metadata */}
      <div className="px-4 py-3 border-t border-surface-border
                      flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-navy-800 truncate max-w-[200px]">
            {componentName}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">{MOCK_RESULT.scanTime}</p>
        </div>
        <Badge variant="green">Complete</Badge>
      </div>
    </div>
  )
}

// ── Action buttons ────────────────────────────────────────────────
function ActionBar({ onSave, onDownload, onNewScan, onShare }) {
  return (
    <div className="bg-white border border-surface-border rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase
                    tracking-wide mb-3">Actions</p>
      <div className="flex flex-col gap-2">

        <button
          onClick={onSave}
          className="flex items-center gap-2.5 w-full px-4 py-2.5
                     bg-orange-600 hover:bg-orange-700 text-white
                     rounded-xl text-sm font-medium transition-all
                     duration-200 active:scale-95"
        >
          <Save size={15} />
          Save to inventory
        </button>

        <button
          onClick={onDownload}
          className="flex items-center gap-2.5 w-full px-4 py-2.5
                     bg-navy-800 hover:bg-navy-700 text-white
                     rounded-xl text-sm font-medium transition-all
                     duration-200 active:scale-95"
        >
          <Download size={15} />
          Download report
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onShare}
            className="flex items-center justify-center gap-2
                       px-3 py-2.5 border border-surface-border
                       rounded-xl text-xs font-medium text-gray-600
                       hover:bg-gray-50 transition-all duration-150"
          >
            <Share2 size={13} /> Share
          </button>

          <button
            onClick={onNewScan}
            className="flex items-center justify-center gap-2
                       px-3 py-2.5 border border-surface-border
                       rounded-xl text-xs font-medium text-gray-600
                       hover:bg-gray-50 transition-all duration-150"
          >
            <Upload size={13} /> New scan
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// RESULTS PAGE
// ════════════════════════════════════════════════════════════════
export function ResultsPage() {
  const navigate  = useNavigate()
  const location  = useLocation()

  // scanId passed from UploadPage via navigate('/results', { state: { scanId } })
  // When real backend is connected: fetch result using this ID
  const scanId = location.state?.scanId ?? 'scan_mock_001'

  // Use mock data — replace with:
  // const [result, setResult] = useState(null)
  // useEffect(() => { scanService.getResult(scanId).then(r => setResult(r.data)) }, [scanId])
  const result = MOCK_RESULT

  function handleSave() {
    // TODO: inventoryService.saveItem(result.detection)
    alert('Saved to inventory! (Connect backend to persist)')
  }

  function handleDownload() {
    // TODO: reportService.downloadPDF(result.scanId)
    alert('Downloading report... (Connect backend to generate PDF)')
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    alert('Link copied to clipboard!')
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-5">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl border border-surface-border bg-white
                     hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={16} className="text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-navy-800">Scan results</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Scan ID: <span className="font-mono text-navy-600">{scanId}</span>
            &nbsp;· {result.scanTime}
          </p>
        </div>
        <Badge variant="green">Analysis complete</Badge>
      </div>

      {/* ── Main layout: 3 cols left + 2 cols right ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* LEFT — image + actions (2/5 width) */}
        <div className="lg:col-span-2 space-y-4">
          <ImagePanel
            imageUrl={result.imageUrl}
            componentName={result.detection.name}
          />
          <ActionBar
            onSave={handleSave}
            onDownload={handleDownload}
            onNewScan={() => navigate('/upload')}
            onShare={handleShare}
          />
        </div>

        {/* RIGHT — detection + OCR + pricing (3/5 width) */}
        <div className="lg:col-span-3 space-y-4">
          <DetectionCard result={result.detection} />
          <OCRCard       texts={result.ocr.texts}  />
          <PricingCard   pricing={result.pricing}  />
        </div>
      </div>
    </div>
  )
}