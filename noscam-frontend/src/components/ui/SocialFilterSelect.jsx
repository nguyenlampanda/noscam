import { Children, isValidElement, useEffect, useRef, useState } from 'react'

export default function SocialFilterSelect({
  value,
  onChange,
  children,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(0)
  const rootRef = useRef(null)
  const optionRefs = useRef([])

  const options = Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return []
    if (child.type === 'option') return [child]
    return Children.toArray(child.props?.children).filter(
      (item) => isValidElement(item) && item.type === 'option'
    )
  })

  const selectedIndex = options.findIndex(
    (option) => String(option.props.value ?? '') === String(value ?? '')
  )

  const selected = options[selectedIndex]

  const choose = (index) => {
    const option = options[index]
    if (!option || option.props.disabled) return
    onChange?.({ target: { value: String(option.props.value ?? '') } })
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return

    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
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
  }, [open])

  useEffect(() => {
    if (open) optionRefs.current[focused]?.scrollIntoView?.({ block: 'nearest' })
  }, [open, focused])

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setFocused(Math.max(0, selectedIndex))
        setOpen(true)
      } else {
        const direction = event.key === 'ArrowDown' ? 1 : -1
        setFocused((previous) =>
          Math.max(0, Math.min(options.length - 1, previous + direction))
        )
      }
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open) choose(focused)
      else {
        setFocused(Math.max(0, selectedIndex))
        setOpen(true)
      }
    }
  }

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setFocused(Math.max(0, selectedIndex))
          setOpen((previous) => !previous)
        }}
        onKeyDown={handleKeyDown}
        className={`flex h-12 w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 text-left text-sm font-medium text-slate-700 outline-none transition ${
          open
            ? 'border-blue-500 ring-2 ring-blue-100'
            : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
        }`}
      >
        <span className="min-w-0 truncate">
          {selected?.props?.children ?? 'Chọn'}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          {options.map((option, index) => {
            const active = index === selectedIndex
            return (
              <button
                key={option.key ?? index}
                ref={(element) => { optionRefs.current[index] = element }}
                type="button"
                role="option"
                aria-selected={active}
                onMouseEnter={() => setFocused(index)}
                onClick={() => choose(index)}
                className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  active
                    ? 'bg-blue-50 font-semibold text-blue-700'
                    : focused === index
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {option.props.children}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
