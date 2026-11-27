import { useEffect, useRef, useState } from 'react'

export default function ScrollableList({ children }) {
  const scrollRef = useRef(null)
  const contentRef = useRef(null)

  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const update = () => {
      const maxScroll = Math.max(
        0,
        element.scrollHeight - element.clientHeight
      )

      const itemCount = contentRef.current?.children.length || 0
      const hasOverflow = itemCount > 2 && maxScroll > 8

      if (!hasOverflow) {
        setCanScrollUp(false)
        setCanScrollDown(false)
        return
      }

      setCanScrollUp(element.scrollTop > 4)
      setCanScrollDown(element.scrollTop < maxScroll - 4)
    }

    element.scrollTop = 0
    update()

    element.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)

    const observer = new ResizeObserver(update)
    observer.observe(element)

    if (contentRef.current) {
      observer.observe(contentRef.current)
    }

    return () => {
      observer.disconnect()
      element.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div className="min-w-0">
      {canScrollUp && (
        <div className="mb-2 select-none rounded-lg bg-blue-50/80 px-3 py-2 text-center text-xs font-bold text-blue-600">
          ↑ Cuộn lên xem lại
        </div>
      )}

      <div
        ref={scrollRef}
        tabIndex={0}
        role="region"
        aria-label="Danh sách dịch vụ có thể cuộn"
        className="max-h-[280px] overflow-y-auto overflow-x-hidden rounded-xl pr-1 outline-none focus-visible:ring-2 focus-visible:ring-blue-200 sm:max-h-[340px]"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#bfdbfe transparent',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div ref={contentRef} className="space-y-2 py-0.5 pr-1">
          {children}
        </div>
      </div>

      {canScrollDown && (
        <div className="mt-2 select-none rounded-lg bg-blue-50/80 px-3 py-2 text-center text-xs font-bold text-blue-600">
          ↓ Cuộn xuống xem thêm
        </div>
      )}
    </div>
  )
}
