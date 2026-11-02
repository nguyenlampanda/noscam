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


// NOSCAM_POPUP_MULTILINK_V1
function renderLinkedContent(content) {
  const text = String(content || '')
  const urlPattern = /https?:\/\/[^\s<>"']+/gi
  const result = []
  let lastIndex = 0
  let match

  while ((match = urlPattern.exec(text)) !== null) {
    const raw = match[0]
    const clean = raw.replace(/[.,;!?)}\]]+$/, '')
    const href = safeUrl(clean)

    if (!href) continue

    result.push(text.slice(lastIndex, match.index))

    result.push(
      <a
        key={`${match.index}-${clean}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-blue-600 underline underline-offset-4 hover:text-blue-800"
      >
        {clean}
      </a>
    )

    const suffix = raw.slice(clean.length)
    result.push(suffix)

    lastIndex = match.index + raw.length
  }

  result.push(text.slice(lastIndex))
  return result
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

  // NOSCAM_POPUP_VIEWER_DESIGN_V2
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-[3px]"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) dismiss()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="noscam-popup-title"
        aria-describedby="noscam-popup-content"
        className="relative w-full max-w-[490px] overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_100px_rgba(2,6,23,0.3)]"
      >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Đóng thông báo"
              className="absolute right-4 top-4 z-20 shadow-md flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
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
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
            </div>


          </div>

          <p className="text-[11px] font-extrabold uppercase tracking-[0.17em] text-blue-600">
            Thông báo từ NoScam.vn
          </p>

          <h2
            id="noscam-popup-title"
            className="mt-2 break-words text-2xl font-black tracking-tight text-slate-950"
          >
            {current.title}
          </h2>

          <p
            id="noscam-popup-content"
            className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-600"
          >
            {renderLinkedContent(current.content)}
          </p>



          <div className="mt-7 flex justify-end border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={dismiss}
              className="min-w-28 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Đóng
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
