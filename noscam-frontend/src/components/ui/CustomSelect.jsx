import { useEffect, useRef, useState } from 'react'

export default function CustomSelect({
  value, onChange, options = [], placeholder = 'Chọn giá trị',
  disabled = false, className = '',
}) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    const onPointer = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-800 transition hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
      >
        <span>{selected?.label ?? placeholder}</span>
        <span className={`text-lg text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          ⌄
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-[80] mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          {options.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              onClick={() => {
                onChange?.(option.value)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-blue-50 disabled:opacity-40 ${
                option.value === value
                  ? 'bg-blue-50 font-bold text-blue-700'
                  : 'text-slate-700'
              }`}
            >
              <span>{option.label}</span>
              {option.value === value && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
