const styles = {
  safe: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  low: 'border-green-200 bg-green-50 text-green-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  high: 'border-red-200 bg-red-50 text-red-700',
  dangerous: 'border-red-300 bg-red-100 text-red-800',
}

function RiskBadge({ level = 'medium', children }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        styles[level] || styles.medium
      }`}
    >
      {children}
    </span>
  )
}

export default RiskBadge