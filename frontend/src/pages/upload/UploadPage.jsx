// UploadPage.jsx
// Core feature page — users upload images here for AI analysis.
//
// Flow:
//   1. User drops / selects images
//   2. Preview cards appear in the queue
//   3. User clicks "Analyse with AI"
//   4. Files are sent to Django backend (mocked for now)
//   5. On success → navigate to /results with the scan ID

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DropZone }         from '../../components/upload/DropZone'
import { ImagePreviewCard } from '../../components/upload/ImagePreviewCard'
import {
  Zap, Trash2, ImagePlus,
  Lightbulb, CheckCircle, Loader2,
} from 'lucide-react'
import { scanService } from '../../services/api'

// Tips shown at the bottom of the page
const TIPS = [
  'Ensure the component is well-lit and in sharp focus.',
  'Include any visible labels, text, or part numbers in the frame.',
  'Place the component on a plain white or grey surface for best accuracy.',
  'Avoid reflective surfaces — angle the camera to reduce glare.',
]

// ── Processing steps shown during upload ────────────────────────
const STEPS = [
  { label: 'Uploading image',        duration: 800  },
  { label: 'Running AI detection',   duration: 1200 },
  { label: 'Extracting OCR data',    duration: 900  },
  { label: 'Fetching market pricing', duration: 700  },
]

export function UploadPage() {
  const navigate = useNavigate()

  // Each item: { file: File, previewUrl: string }
  const [queue,       setQueue]       = useState([])
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isDone,      setIsDone]      = useState(false)

  // ── Add files to the queue ───────────────────────────────────
  // useCallback so DropZone doesn't get a new reference on every render
  const handleFilesSelected = useCallback((newFiles) => {
    const entries = newFiles.map(file => ({
      file,
      // createObjectURL gives a local URL we can use as an <img> src
      // We must revoke these when the component unmounts to avoid memory leaks
      previewUrl: URL.createObjectURL(file),
    }))
    setQueue(prev => [...prev, ...entries])
  }, [])

  // ── Remove one file from the queue ──────────────────────────
  function removeFile(index) {
    setQueue(prev => {
      // Revoke the URL before removing to free memory
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  // ── Clear entire queue ───────────────────────────────────────
  function clearQueue() {
    queue.forEach(item => URL.revokeObjectURL(item.previewUrl))
    setQueue([])
  }

  // ── Cleanup all preview URLs when component unmounts ────────
  useEffect(() => {
    return () => {
      queue.forEach(item => URL.revokeObjectURL(item.previewUrl))
    }
  }, [])  // Empty deps — only runs on unmount

  // ── Total size of all queued files ──────────────────────────
  const totalSize = queue.reduce((sum, item) => sum + item.file.size, 0)
  function formatTotal(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // ── Submit for AI analysis ───────────────────────────────────
  async function handleAnalyse() {
    if (queue.length === 0) return

    setIsAnalysing(true)
    setCurrentStep(0)
    setIsDone(false)

    try {
      for (let i = 0; i < STEPS.length; i++) {
        setCurrentStep(i)
        if (i < STEPS.length - 1) {
          await new Promise(r => setTimeout(r, STEPS[i].duration))
        }
      }

      const files = queue.map(item => item.file)
      const response = await scanService.processImages(files)
      const resultId = response.data?.results?.[0]?.result?.id ?? response.data?.result?.id
      if (!resultId) {
        throw new Error('Result id missing from backend response')
      }

      setIsDone(true)

      // Short pause so user sees the "Done!" state
      await new Promise(r => setTimeout(r, 600))

      navigate('/results', { state: { scanId: resultId } })

    } catch (err) {
      console.error('Upload failed:', err)
      const backendMessage = err?.response?.data?.error || err?.response?.data?.message
      alert(backendMessage || 'Upload failed. Please try again.')
      setIsAnalysing(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-800">Upload component image</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload one or more images of industrial components for AI identification and pricing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left col: Drop zone + Preview queue ─────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Drop zone — hidden during analysis */}
          {!isAnalysing && (
            <DropZone onFilesSelected={handleFilesSelected} />
          )}

          {/* Processing view — replaces drop zone during analysis */}
          {isAnalysing && (
            <div className="bg-white border border-surface-border rounded-2xl p-8
                            flex flex-col items-center justify-center min-h-[200px] gap-5">

              {/* Animated icon */}
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center
                              ${isDone ? 'bg-green-50' : 'bg-orange-50'}`}>
                {isDone
                  ? <CheckCircle size={32} className="text-green-500" />
                  : <Loader2    size={32} className="text-orange-500 animate-spin" />
                }
              </div>

              {/* Step list */}
              <div className="w-full max-w-xs space-y-3">
                {STEPS.map((step, i) => {
                  const done    = i < currentStep || isDone
                  const active  = i === currentStep && !isDone
                  return (
                    <div key={step.label} className="flex items-center gap-3">
                      {/* Step indicator */}
                      <div className={`
                        w-5 h-5 rounded-full flex items-center justify-center
                        flex-shrink-0 transition-all duration-300
                        ${done    ? 'bg-green-500'  : ''}
                        ${active  ? 'bg-orange-500 animate-pulse' : ''}
                        ${!done && !active ? 'bg-gray-200' : ''}
                      `}>
                        {done && <CheckCircle size={12} className="text-white" />}
                      </div>

                      {/* Step label */}
                      <span className={`text-sm transition-colors duration-300
                        ${done   ? 'text-green-600 font-medium' : ''}
                        ${active ? 'text-orange-600 font-medium' : ''}
                        ${!done && !active ? 'text-gray-400' : ''}
                      `}>
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              <p className="text-xs text-gray-400">
                {isDone ? 'Complete! Redirecting...' : 'Please wait while AI processes your image'}
              </p>
            </div>
          )}

          {/* Image preview queue */}
          {queue.length > 0 && !isAnalysing && (
            <div>
              {/* Queue header */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-navy-800">
                  Queued images
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    ({queue.length} {queue.length === 1 ? 'file' : 'files'} · {formatTotal(totalSize)})
                  </span>
                </p>
                <button
                  onClick={clearQueue}
                  className="flex items-center gap-1.5 text-xs text-red-500
                             hover:text-red-600 font-medium transition-colors"
                >
                  <Trash2 size={12} /> Clear all
                </button>
              </div>

              {/* Preview grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {queue.map((item, i) => (
                  <ImagePreviewCard
                    key={item.previewUrl}
                    file={item.file}
                    previewUrl={item.previewUrl}
                    onRemove={() => removeFile(i)}
                  />
                ))}

                {/* "Add more" tile */}
                <button
                  onClick={() => document.querySelector('input[type="file"]')?.click()}
                  className="h-full min-h-[120px] border-2 border-dashed border-gray-200
                             rounded-xl flex flex-col items-center justify-center gap-2
                             text-gray-400 hover:border-orange-300 hover:text-orange-500
                             hover:bg-orange-50/40 transition-all duration-200"
                >
                  <ImagePlus size={20} />
                  <span className="text-xs font-medium">Add more</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right col: Summary + Tips ───────────────────────── */}
        <div className="space-y-4">

          {/* Submission summary card */}
          <div className="bg-white border border-surface-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-navy-800">Submission summary</h2>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Images',     value: queue.length || '—'                          },
                { label: 'Total size', value: queue.length ? formatTotal(totalSize) : '—'  },
                { label: 'Status',     value: queue.length ? 'Ready' : 'Empty',
                  valueClass: queue.length ? 'text-green-600' : 'text-gray-400'             },
                { label: 'Model',      value: 'LLAMA 3.2'                                  },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{item.label}</p>
                  <p className={`text-sm font-semibold mt-0.5 ${item.valueClass ?? 'text-navy-800'}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Divider */}
            <hr className="border-surface-border" />

            {/* Submit button */}
            <button
              onClick={handleAnalyse}
              disabled={queue.length === 0 || isAnalysing}
              className={`
                w-full flex items-center justify-center gap-2
                py-3 rounded-xl text-sm font-medium
                transition-all duration-200
                ${queue.length === 0 || isAnalysing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 text-white active:scale-95 shadow-sm'
                }
              `}
            >
              <Zap size={15} />
              {isAnalysing ? 'Analysing...' : 'Analyse with AI'}
            </button>

            {queue.length === 0 && (
              <p className="text-[11px] text-center text-gray-400">
                Add at least one image to continue.
              </p>
            )}
          </div>

          {/* Tips card */}
          <div className="bg-white border border-surface-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={14} className="text-orange-500" />
              <h2 className="text-sm font-semibold text-navy-800">Tips for best results</h2>
            </div>
            <ul className="space-y-2.5">
              {TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 flex-shrink-0" />
                  <span className="text-xs text-gray-500 leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Supported formats info */}
          <div className="bg-navy-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-white mb-2">AI pipeline</p>
            <div className="space-y-1.5">
              {[
                'LLAMA 3.2 Vision — object detection',
                'PaddleOCR — text extraction',
                'Scraper — Indian market pricing',
              ].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle size={11} className="text-orange-400 flex-shrink-0" />
                  <span className="text-[11px] text-navy-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
