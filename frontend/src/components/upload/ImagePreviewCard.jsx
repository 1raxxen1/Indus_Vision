// ImagePreviewCard.jsx
// Shows a thumbnail, file name, size, and a remove button.
// onRemove() tells the parent to remove this file from the queue.

import { X, CheckCircle } from 'lucide-react'

// Convert bytes to human-readable size string
function formatSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ImagePreviewCard({ file, previewUrl, onRemove }) {
  return (
    <div className="relative group bg-white border border-surface-border
                    rounded-xl overflow-hidden transition-shadow duration-200
                    hover:shadow-md">

      {/* Thumbnail */}
      <div className="relative h-28 bg-gray-50 overflow-hidden">
        <img
          src={previewUrl}
          alt={file.name}
          className="w-full h-full object-cover transition-transform
                     duration-300 group-hover:scale-105"
        />

        {/* Ready indicator — bottom-left of image */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1
                        bg-white/90 backdrop-blur-sm rounded-full
                        px-2 py-0.5">
          <CheckCircle size={10} className="text-green-500" />
          <span className="text-[9px] font-medium text-green-700">Ready</span>
        </div>
      </div>

      {/* File info */}
      <div className="px-3 py-2">
        <p className="text-xs font-medium text-navy-800 truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">{formatSize(file.size)}</p>
      </div>

      {/* Remove button — top right, appears on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation()  // Don't trigger parent click handlers
          onRemove()
        }}
        className="absolute top-2 right-2 w-6 h-6
                   bg-navy-800/70 hover:bg-red-500
                   rounded-full flex items-center justify-center
                   opacity-0 group-hover:opacity-100
                   transition-all duration-200"
        title="Remove image"
      >
        <X size={11} className="text-white" />
      </button>
    </div>
  )
}