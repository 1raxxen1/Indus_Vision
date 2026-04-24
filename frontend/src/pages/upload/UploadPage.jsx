// UploadPage.jsx

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { DropZone } from '../../components/upload/DropZone'
import { ImagePreviewCard } from '../../components/upload/ImagePreviewCard'
import {
  Zap, Trash2,
  CheckCircle, Loader2,
} from 'lucide-react'

import { scanService } from '../../services/scanService'
import toast from 'react-hot-toast'


// ── Tips ───────────────────────────────
const TIPS = [
  'Ensure the component is well-lit and in sharp focus.',
  'Include any visible labels, text, or part numbers in the frame.',
  'Place the component on a plain white or grey surface for best accuracy.',
  'Avoid reflective surfaces — angle the camera to reduce glare.',
]

// ── Steps ──────────────────────────────
const STEPS = [
  { label: 'Uploading image' },
  { label: 'Running AI detection' },
  { label: 'Extracting OCR data' },
  { label: 'Fetching market pricing' },
]


export function UploadPage() {
  const navigate = useNavigate()
  const objectUrlsRef = useRef(new Set())

  const [queue, setQueue] = useState([])
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isDone, setIsDone] = useState(false)


  // ── Add files ───────────────────────
  const handleFilesSelected = useCallback((newFiles) => {
    const entries = newFiles.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    entries.forEach(entry => objectUrlsRef.current.add(entry.previewUrl))
    setQueue(prev => [...prev, ...entries])
  }, [])


  // ── Remove file ─────────────────────
  function removeFile(index) {
    setQueue(prev => {
      const removed = prev[index]
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl)
        objectUrlsRef.current.delete(removed.previewUrl)
      }
      return prev.filter((_, i) => i !== index)
    })
  }


  // ── Clear queue ─────────────────────
  function clearQueue() {
    queue.forEach(item => {
      URL.revokeObjectURL(item.previewUrl)
      objectUrlsRef.current.delete(item.previewUrl)
    })
    setQueue([])
  }


  // ── Cleanup ─────────────────────────
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
      objectUrlsRef.current.clear()
    }
  }, [])


  // ── Total size ──────────────────────
  const totalSize = queue.reduce((sum, item) => sum + item.file.size, 0)

  function formatTotal(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }


  // ── 🔥 FINAL ANALYSE FUNCTION ───────────────────────────────
  async function handleAnalyse() {
    if (queue.length === 0) return

    setIsAnalysing(true)
    setCurrentStep(0)
    setIsDone(false)

    try {
      const results = []

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i]

        // Step 0 — Upload
        setCurrentStep(0)

        const res = await scanService.processImage(
          item.file,
          item.file.name
        )
        const payload =
          res && typeof res === 'object' && 'data' in res
            ? res.data
            : (res ?? null)

        // Step progression (UX)
        setCurrentStep(1)
        await new Promise(r => setTimeout(r, 300))

        setCurrentStep(2)
        await new Promise(r => setTimeout(r, 300))

        setCurrentStep(3)
        await new Promise(r => setTimeout(r, 300))

        results.push(payload)
      }

      setIsDone(true)
      toast.success('Analysis complete!')

      await new Promise(r => setTimeout(r, 600))

      const latest = results[results.length - 1] || results[0] || {}

      navigate('/results', {
        state: {
          resultId:
            latest.result?.id ??
            latest.result_id ??
            latest.scan_id ??
            latest.id,

          scanId:
            latest.scan_id ??
            latest.result?.id ??
            latest.id,

          result: latest,
          apiResponse: latest,
        }
      })

    } catch (err) {
      console.error('Upload error:', err)

      toast.error(
        err?.response?.data?.message ||
        err.message ||
        'Upload failed. Check backend connection.'
      )

      setIsAnalysing(false)
      setIsDone(false)
    }
  }


  // ── UI ──────────────────────────────
  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-800">
          Upload component image
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload images for AI identification and pricing.
        </p>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT */}
        <div className="lg:col-span-2 space-y-4">

          {!isAnalysing && (
            <DropZone onFilesSelected={handleFilesSelected} />
          )}

          {/* Processing UI */}
          {isAnalysing && (
            <div className="bg-white border rounded-2xl p-8 flex flex-col items-center gap-5">

              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center
                ${isDone ? 'bg-green-50' : 'bg-orange-50'}`}>

                {isDone
                  ? <CheckCircle size={32} className="text-green-500" />
                  : <Loader2 size={32} className="text-orange-500 animate-spin" />
                }
              </div>

              <div className="space-y-3">
                {STEPS.map((step, i) => {
                  const done = i < currentStep || isDone
                  const active = i === currentStep && !isDone

                  return (
                    <div key={step.label} className="flex gap-3">
                      <div className={`w-5 h-5 rounded-full
                        ${done ? 'bg-green-500' : active ? 'bg-orange-500' : 'bg-gray-200'}`} />
                      <span>{step.label}</span>
                    </div>
                  )
                })}
              </div>

              <p className="text-xs text-gray-400">
                {isDone ? 'Complete! Redirecting...' : 'Processing...'}
              </p>
            </div>
          )}

          {/* Queue */}
          {queue.length > 0 && !isAnalysing && (
            <div>
              <div className="flex justify-between mb-3">
                <p>
                  {queue.length} files · {formatTotal(totalSize)}
                </p>

                <button onClick={clearQueue}>
                  <Trash2 size={14} /> Clear
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {queue.map((item, i) => (
                  <ImagePreviewCard
                    key={item.previewUrl}
                    file={item.file}
                    previewUrl={item.previewUrl}
                    onRemove={() => removeFile(i)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>


        {/* RIGHT */}
        <div className="space-y-4">

          <button
            onClick={handleAnalyse}
            disabled={queue.length === 0 || isAnalysing}
            className="w-full bg-orange-600 text-white py-3 rounded-xl"
          >
            <Zap size={14} />
            {isAnalysing ? 'Analysing...' : 'Analyse with AI'}
          </button>

          <div>
            <h2 className="text-sm font-semibold">Tips</h2>
            {TIPS.map((tip, i) => (
              <p key={i} className="text-xs">{tip}</p>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
