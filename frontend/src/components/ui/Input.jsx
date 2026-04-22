// Generic input component with optional left icon
import { Search } from 'lucide-react'

export function Input({
  placeholder = '',
  value,
  onChange,
  icon: Icon = null,
  type = 'text',
  className = '',
}) {
  return (
    <div className={`relative flex items-center ${className}`}>
      {Icon && (
        <Icon
          size={15}
          className="absolute left-3 text-gray-400 pointer-events-none"
        />
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`
          w-full text-sm bg-white border border-surface-border
          rounded-xl py-2.5 pr-4 outline-none
          focus:border-orange-400 focus:ring-2 focus:ring-orange-100
          placeholder-gray-400 text-navy-800 transition-all duration-200
          ${Icon ? 'pl-9' : 'pl-4'}
        `}
      />
    </div>
  )
}