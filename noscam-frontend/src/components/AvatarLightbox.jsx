import { useEffect, useState } from 'react'

export default function AvatarLightbox({
  src,
  alt = 'Ảnh đại diện',
  className = '',
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!src) return null

  return (
    <>
      <button
        type="button"
        title="Bấm để xem ảnh đại diện"
        aria-label="Phóng to ảnh đại diện"
        onClick={(event) => {
          event.stopPropagation()
          setOpen(true)
        }}
        className="inline-flex cursor-zoom-in overflow-hidden rounded-full"
      >
        <img src={src} alt={alt} className={className} />
      </button>

      {open && (
        <div
          role="presentation"
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 p-5 backdrop-blur-sm"
          onClick={(event) => {
            event.stopPropagation()
            setOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Ảnh đại diện phóng to"
            className="relative w-full max-w-[440px]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Đóng ảnh"
              onClick={() => setOpen(false)}
              className="absolute -right-2 -top-12 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white hover:bg-white/30 sm:-right-12 sm:top-0"
            >
              ×
            </button>

            <div className="aspect-square w-full overflow-hidden rounded-3xl border-4 border-white bg-slate-100 shadow-2xl">
              <img
                src={src}
                alt={alt}
                className="h-full w-full object-cover object-center"
              />
            </div>

            <p className="mt-4 text-center text-sm font-medium text-white/80">
              Ảnh đại diện trung gian
            </p>
          </div>
        </div>
      )}
    </>
  )
}
