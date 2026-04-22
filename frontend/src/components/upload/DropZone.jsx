// DropZone.jsx
// Handles drag-and-drop AND click-to-browse file selection.
// It does NOT store files itself — it calls onFilesSelected() and
// lets the parent page manage state. This keeps it reusable.

import { useState, useRef } from 'react'
import { UploadCloud } from 'lucide-react'

const ACCEPTED_TYPES  = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES  = 10 * 1024 * 1024  // 10 MB

export function DropZone({ onFilesSelected }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  // ── Validate each file before accepting it ──────────────────
  function validateAndFilter(fileList) {
    const valid   = []
    const invalid = []

    Array.from(fileList).forEach(file => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        invalid.push(`${file.name}: unsupported format`)
      } else if (file.size > MAX_SIZE_BYTES) {
        invalid.push(`${file.name}: exceeds 10 MB limit`)
      } else {
        valid.push(file)
      }
    })

    if (invalid.length > 0) {
      alert(`Some files were skipped:\n\n${invalid.join('\n')}`)
    }

    if (valid.length > 0) onFilesSelected(valid)
  }

  // ── Drag events ──────────────────────────────────────────────
  function handleDragOver(e) {
    e.preventDefault()          // Required — without this, drop won't fire
    setIsDragging(true)
  }

  function handleDragLeave(e) {
    // Only fire if leaving the zone entirely (not a child element)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    validateAndFilter(e.dataTransfer.files)
  }

  // ── Click to browse ──────────────────────────────────────────
  function handleInputChange(e) {
    validateAndFilter(e.target.files)
    // Reset input so the same file can be re-selected if removed
    e.target.value = ''
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center
        w-full min-h-[200px] rounded-2xl border-2 border-dashed
        cursor-pointer transition-all duration-200 p-8 text-center
        ${isDragging
          ? 'border-orange-400 bg-orange-50 scale-[1.01]'
          : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/40'
        }
      `}
    >
      {/* Hidden file input — triggered by clicking the zone */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Upload icon */}
      <div className={`
        w-14 h-14 rounded-2xl flex items-center justify-center mb-4
        transition-colors duration-200
        ${isDragging ? 'bg-orange-100' : 'bg-gray-100'}
      `}>
        <UploadCloud
          size={26}
          className={`transition-colors duration-200
            ${isDragging ? 'text-orange-500' : 'text-gray-400'}`}
        />
      </div>

      {/* Text */}
      <p className="text-sm font-semibold text-navy-800">
        {isDragging ? 'Release to upload' : 'Drop images here'}
      </p>
      <p className="text-xs text-gray-400 mt-1">
        or click to browse from your device
      </p>

      {/* Format hint */}
      <div className="mt-4 flex items-center gap-2">
        {['JPG', 'PNG', 'WEBP'].map(fmt => (
          <span key={fmt} className="text-[10px] font-medium px-2 py-0.5
                                     bg-gray-100 text-gray-500 rounded-full">
            {fmt}
          </span>
        ))}
        <span className="text-[10px] text-gray-400">· Max 10 MB each</span>
      </div>
    </div>
  )
}