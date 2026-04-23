export function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-600
                      rounded-full animate-spin" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}