import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { scanService } from '../../services/scanService'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'

import { DetectionCard } from '../../components/results/DetectionCard'
import { OCRCard } from '../../components/results/OCRCard'
import { PricingCard } from '../../components/results/PricingCard'
import { Badge } from '../../components/ui/Badge'

import {
  ArrowLeft, Download, Save,
  Upload, Share2, ImageIcon,
  CheckCircle,
} from 'lucide-react'


// ── Image Panel ─────────────────────────
function ImagePanel({ imageUrl, componentName, scanTime }) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="relative bg-gray-100 aspect-[4/3] flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt={componentName} className="w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <ImageIcon size={36} />
            <p className="text-xs">Scanned image</p>
          </div>
        )}

        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 rounded-full px-3 py-1 border shadow-sm">
          <CheckCircle size={12} className="text-green-500" />
          <span className="text-xs font-medium text-green-700">Detected</span>
        </div>
      </div>

      <div className="px-4 py-3 border-t flex justify-between">
        <div>
          <p className="text-xs font-medium truncate max-w-[200px]">
            {componentName}
          </p>
          <p className="text-[10px] text-gray-400">{scanTime}</p>
        </div>
        <Badge variant="green">Complete</Badge>
      </div>
    </div>
  )
}


// ── Action Bar ─────────────────────────
function ActionBar({ onSave, onDownload, onNewScan, onShare }) {
  return (
    <div className="bg-white border rounded-xl p-4 flex flex-col gap-2">
      <button onClick={onSave}><Save size={14} /> Save</button>
      <button onClick={onDownload}><Download size={14} /> Download</button>
      <button onClick={onShare}><Share2 size={14} /> Share</button>
      <button onClick={onNewScan}><Upload size={14} /> New scan</button>
    </div>
  )
}


// ── Helper ────────────────────────────
function parseSpecs(datasheet) {
  if (Array.isArray(datasheet)) return datasheet
  if (typeof datasheet === 'object' && datasheet !== null) {
    return Object.entries(datasheet).map(([k, v]) => ({
      key: k,
      value: String(v),
    }))
  }
  return []
}

function parsePriceValue(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}


// ═══════════════════════════════════════
// RESULTS PAGE
// ═══════════════════════════════════════
export function ResultsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [saving, setSaving] = useState(false)

  const apiResponse = location.state?.apiResponse
  const passedResult = location.state?.result
  const resultId = location.state?.resultId ?? location.state?.scanId


  // ── API FETCH (ONLY if needed) ───────
  const { data, loading, error, refetch } = useApi(
    async () => {
      if (apiResponse) return Promise.resolve(apiResponse)
      if (passedResult) return Promise.resolve(passedResult)
      if (resultId) return scanService.getResultById(resultId)
      const resultsResponse = await scanService.getResults()
      const resultsPayload =
        resultsResponse && typeof resultsResponse === 'object' && 'data' in resultsResponse
          ? resultsResponse.data
          : (resultsResponse ?? null)
      const latestId = resultsPayload?.latest_result_id
      if (latestId) return scanService.getResultById(latestId)
      return Promise.resolve(null)
    },
    [resultId]
  )

  if (loading) return <LoadingSpinner message="Loading scan results..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (!data) return <ErrorState message="No result found" />


  // ── HANDLE BOTH RESPONSE TYPES ───────
  const output = data.output ?? {}
  const extraction = output.extraction ?? data.detection ?? {}
  const pricing = output.pricing ?? data.pricing ?? {}
  const product = extraction.product ?? {}
  const technical = extraction.technical_datasheet ?? {}
  const supplierRows = Array.isArray(pricing.prices) ? pricing.prices : []
  const supplierPrices = supplierRows
    .map(row => parsePriceValue(row?.price))
    .filter(price => price !== null)

  const result = {
    scanId:
      data.result?.id ??
      data.scan_id ??
      data.id ??
      resultId,

    scanTime:
      data.scanTime ??
      data.created_at ??
      new Date().toLocaleString(),

    imageUrl:
      data.imageUrl ??
      data.image_url ??
      data.upload?.image_url ??
      null,

    detection: {
      name:
        product.name ??
        extraction.component_name ??
        extraction.name ??
        data.detection?.name ??
        'Component identified',

      category:
        data.detection?.category ??
        extraction.category ??
        'Unknown',

      confidence:
        Number(data.detection?.confidence ?? extraction.confidence ?? data.confidence ?? 0),

      description:
        data.detection?.description ??
        extraction.description ??
        (product.name ? `Model extraction for ${product.name}` : 'AI analysis complete.'),

      specifications:
        parseSpecs(data.detection?.specifications ?? technical),
    },

    ocr: {
      texts:
        data.ocr?.texts ??
        extraction.ocr_texts ??
        extraction.text_items ??
        (technical.raw_text ? technical.raw_text.split(/\s+/).filter(Boolean) : []),
    },

    pricing: {
      priceMin:
        parsePriceValue(data.pricing?.priceMin) ??
        parsePriceValue(pricing.min_price) ??
        parsePriceValue(pricing.price_min) ??
        parsePriceValue(pricing.summary?.lowest_price) ??
        (supplierPrices.length ? Math.min(...supplierPrices) : 0),

      priceMax:
        parsePriceValue(data.pricing?.priceMax) ??
        parsePriceValue(pricing.max_price) ??
        parsePriceValue(pricing.price_max) ??
        parsePriceValue(pricing.summary?.highest_price) ??
        (supplierPrices.length ? Math.max(...supplierPrices) : 0),

      perUnit:
        parsePriceValue(data.pricing?.perUnit) ??
        parsePriceValue(pricing.per_unit) ??
        parsePriceValue(pricing.price) ??
        (supplierPrices.length ? supplierPrices[0] : 0),

      trend:
        data.pricing?.trend ??
        pricing.trend ??
        (supplierPrices.length ? 'stable' : 'neutral'),

      suppliers:
        data.pricing?.suppliers ??
        pricing.suppliers ??
        supplierRows.map(row => ({
          name: row.source ?? 'Unknown source',
          price: row.price ?? null,
          unit: row.availability ?? 'N/A',
          url: row.url ?? '',
        })),
    },
    runtime: data.runtime_flags ?? output.runtime_flags ?? extraction.runtime ?? {},
  }


  // ── Actions ─────────────────────────
  async function handleSave() {
    if (!result.scanId || saving) return
    setSaving(true)
    try {
      await scanService.saveToInventory({
        result_id: result.scanId,
        quantity: 1,
        notes: 'Saved from scan results',
      })
      alert('Saved to inventory')
    } catch (saveError) {
      const message = saveError?.response?.data?.error || saveError?.message || 'Unable to save to inventory'
      alert(message)
    } finally {
      setSaving(false)
    }
  }

  function handleDownload() {
    alert('Generate report (connect API)')
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    alert('Link copied!')
  }


  // ── UI ──────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-5">

      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>

        <div>
          <h1>Scan results</h1>
          <p>{result.scanId} · {result.scanTime}</p>
        </div>

        <Badge variant="green">Done</Badge>
      </div>

      {loading && (
        <div className="bg-white border border-surface-border rounded-xl p-4 text-sm text-gray-500">
          Loading result details...
        </div>
      )}

      {error && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-5 gap-5">

        <div className="col-span-2 space-y-4">
          <ImagePanel
            imageUrl={result.imageUrl}
            componentName={result.detection.name}
            scanTime={result.scanTime}
          />

          <ActionBar
            onSave={handleSave}
            onDownload={handleDownload}
            onNewScan={() => navigate('/upload')}
            onShare={handleShare}
          />
        </div>

        <div className="col-span-3 space-y-4">
          {(result.runtime.mode || result.runtime.runtime_status) && (
            <div className="bg-slate-50 border rounded-xl p-3 text-xs text-slate-700">
              <p>
                AI runtime: <strong>{result.runtime.mode ?? 'unknown'}</strong> · status:{' '}
                <strong>{result.runtime.runtime_status ?? 'unknown'}</strong>
              </p>
              {result.runtime.runtime_error && (
                <p className="text-amber-700 mt-1">
                  Runtime note: {result.runtime.runtime_error}
                </p>
              )}
            </div>
          )}
          <DetectionCard result={result.detection} />
          <OCRCard texts={result.ocr.texts} />
          <PricingCard pricing={result.pricing} />
        </div>

      </div>
    </div>
  )
}
