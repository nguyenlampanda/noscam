import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { sitePopupService, popupPages } from '../../services/sitePopupService'

const storageKey = popup =>
  `noscam_popup_seen_${popup.id}_v${popup.version}`

function safeUrl(value) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

export default function SitePopupViewer() {
  const location = useLocation()
  const [queue, setQueue] = useState([])
  const [current, setCurrent] = useState(null)

  useEffect(() => {
    let active = true
    const path = popupPages
      .map(([url]) => url)
      .find(url => url === location.pathname)

    setCurrent(null)
    setQueue([])

    if (!path) return () => { active = false }

    sitePopupService.publicList(path)
      .then(response => {
        if (!active) return
        const unseen = (response.data || []).filter(popup => {
          try {
            return localStorage.getItem(storageKey(popup)) !== '1'
          } catch {
            return true
          }
        })
        setCurrent(unseen[0] || null)
        setQueue(unseen.slice(1))
      })
      .catch(() => {})

    return () => { active = false }
  }, [location.pathname])

  useEffect(() => {
    if (!current) return
    const onKey = event => {
      if (event.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [current, queue])

  function dismiss() {
    if (!current) return
    try {
      localStorage.setItem(storageKey(current), '1')
    } catch {
      // Trình duyệt có thể chặn lưu trữ.
    }
    setCurrent(queue[0] || null)
    setQueue(items => items.slice(1))
  }

  if (!current) return null

  const image = current.image_url && safeUrl(current.image_url)
  const link = current.button_url && safeUrl(current.button_url)

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/65 p-4"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) dismiss()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="noscam-popup-title"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Đóng thông báo"
          className="absolute right-3 top-3 z-10 rounded-full bg-white/95 px-3 py-1.5 text-xl text-slate-700 shadow"
        >
          ×
        </button>

        {image && (
          <img
            src={image}
            alt=""
            className="max-h-64 w-full object-cover"
            loading="lazy"
          />
        )}

        <div className="p-6 sm:p-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">
            Thông báo từ NoScam.vn
          </p>

          <h2
            id="noscam-popup-title"
            className="pr-7 text-2xl font-bold text-slate-900"
          >
            {current.title}
          </h2>

          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
            {current.content}
          </p>

          <div className="mt-7 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Đã hiểu
            </button>

            {link && current.button_text && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={dismiss}
                className="rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white"
              >
                {current.button_text}
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
