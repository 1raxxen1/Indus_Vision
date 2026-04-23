export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center
                      justify-center">
        <span className="text-red-500 text-lg">!</span>
      </div>
      <p className="text-sm font-medium text-gray-700">Something went wrong</p>
      <p className="text-xs text-gray-400 max-w-xs text-center">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 bg-orange-600 text-white text-sm
                     font-medium rounded-xl hover:bg-orange-700
                     transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  )
}