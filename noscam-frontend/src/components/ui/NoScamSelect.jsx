import { forwardRef } from 'react'

// Giữ nguyên hành vi native của select: form submission, keyboard,
// disabled, option động và onChange(event).
const NoScamSelect = forwardRef(function NoScamSelect(
  { className = '', children, ...props }, ref
) {
  return (
    <select
      {...props}
      ref={ref}
      className={`noscam-native-select ${className}`.trim()}
    >
      {children}
    </select>
  )
})

export default NoScamSelect
