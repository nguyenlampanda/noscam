import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

export default function AlertEvidenceGallery({
  images = [],
  publicImages,
}) {
  const [activeIndex, setActiveIndex] = useState(null)

  const items = (
    Array.isArray(publicImages) ? publicImages : images
  ).filter(Boolean).slice(0, 3)

  useEffect(() => {
    if (activeIndex === null) return

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setActiveIndex(null)
      }

      if (event.key === 'ArrowLeft') {
        setActiveIndex(index => Math.max(0, index - 1))
      }

      if (event.key === 'ArrowRight') {
        setActiveIndex(index =>
          Math.min(items.length - 1, index + 1)
        )
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeIndex, items.length])

  if (!items.length) return null

  const getSrc = item =>
    typeof item === 'string'
      ? item
      : item?.url || item?.src || item?.image_url || ''

  return (
    <>
      <div className="flex items-center justify-center gap-2">
        {items.map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setActiveIndex(index)}
            className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
            aria-label={`Xem ảnh bằng chứng ${index + 1}`}
          >
            <img
              src={getSrc(item)}
              alt={`Bằng chứng ${index + 1}`}
              loading="lazy"
              className="h-20 w-20 object-cover transition hover:scale-105"
            />
          </button>
        ))}
      </div>

      {activeIndex !== null && createPortal(
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setActiveIndex(null)
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Ảnh bằng chứng"
            className="flex max-h-[90dvh] w-full max-w-[850px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-3">
              <h3 className="text-sm font-bold text-slate-900">
                Ảnh bằng chứng
              </h3>

              <button
                type="button"
                onClick={() => setActiveIndex(null)}
                aria-label="Đóng"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-700 hover:bg-slate-200"
              >
                ×
              </button>
            </header>

            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-slate-50 p-4 sm:px-14">
              <img
                src={getSrc(items[activeIndex])}
                alt={`Bằng chứng ${activeIndex + 1}`}
                className="block max-h-[70dvh] max-w-full object-contain"
              />

              {items.length > 1 && (
                <>
                  <button
                    type="button"
                    disabled={activeIndex === 0}
                    onClick={() =>
                      setActiveIndex(i => Math.max(0, i - 1))
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-2 text-2xl shadow disabled:opacity-30"
                    aria-label="Ảnh trước"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    disabled={activeIndex === items.length - 1}
                    onClick={() =>
                      setActiveIndex(i =>
                        Math.min(items.length - 1, i + 1)
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-2 text-2xl shadow disabled:opacity-30"
                    aria-label="Ảnh tiếp theo"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            <footer className="shrink-0 border-t border-slate-200 px-5 py-3 text-center text-xs font-semibold text-slate-500">
              {activeIndex + 1} / {items.length}
            </footer>
          </section>
        </div>,
        document.body
      )}
    </>
  )
}
