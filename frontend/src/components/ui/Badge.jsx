// Reusable status badge — used across dashboard, inventory, history
export function Badge({ children, variant = 'orange' }) {
  const styles = {
    orange: 'bg-orange-50  text-orange-700 border-orange-200',
    green:  'bg-green-50   text-green-700  border-green-200',
    blue:   'bg-blue-50    text-blue-700   border-blue-200',
    red:    'bg-red-50     text-red-600    border-red-200',
    navy:   'bg-navy-50    text-navy-700   border-navy-200',
    gray:   'bg-gray-100   text-gray-600   border-gray-200',
  }

  return (
    <span className={`
      inline-flex items-center text-[11px] font-medium
      px-2 py-0.5 rounded-full border
      ${styles[variant] ?? styles.gray}
    `}>
      {children}
    </span>
  )
}