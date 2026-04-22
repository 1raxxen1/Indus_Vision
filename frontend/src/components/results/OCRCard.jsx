// OCRCard.jsx
// Shows all text extracted from the image via PaddleOCR.
// Each piece of text is shown as a copyable chip.

import { useState }           from 'react'
import { FileText, Copy, Check } from 'lucide-react'

function CopyChip({ text }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                 bg-gray-50 border border-gray-200 text-xs text-navy-700
                 hover:bg-orange-50 hover:border-orange-200
                 hover:text-orange-700 transition-all duration-150 group"
    >
      <span className="font-mono">{text}</span>
      {copied
        ? <Check size={11} className="text-green-500" />
        : <Copy  size={11} className="text-gray-400 group-hover:text-orange-400" />
      }
    </button>
  )
}

export function OCRCard({ texts = [] }) {
  return (
    <div className="bg-white border border-surface-border rounded-xl p-5">

      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
          <FileText size={14} className="text-blue-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-navy-800">OCR extraction</h3>
          <p className="text-[11px] text-gray-400">Text detected in image</p>
        </div>
      </div>

      {texts.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          No readable text found in this image.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {texts.map((t, i) => (
            <CopyChip key={i} text={t} />
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-400 mt-3">
        Click any chip to copy to clipboard
      </p>
    </div>
  )
}