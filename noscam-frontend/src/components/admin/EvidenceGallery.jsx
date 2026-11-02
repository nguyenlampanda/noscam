import { createPortal } from 'react-dom'
import {
  useEffect,
  useRef,
  useState,
} from 'react'

import adminService
  from '../../services/adminService'

const INITIAL_LIMIT = 6

function EvidenceGallery({
  evidences = [],
}) {
  const [expanded, setExpanded] =
    useState(false)

  // NOSCAM_EVIDENCE_LIGHTBOX_V1
  const [activeImageIndex, setActiveImageIndex] = useState(null)

  const images = evidences.filter(
    item => item.mime_type?.startsWith('image/')
  )

  const closeImage = () => setActiveImageIndex(null)

  const openImage = (evidence) => {
    const index = images.findIndex(
      item => item.id === evidence.id
    )
    if (index >= 0) setActiveImageIndex(index)
  }

  if (!evidences.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
        Không có bằng chứng đính kèm.
      </div>
    )
  }

  const visibleEvidences =
    expanded
      ? evidences
      : evidences.slice(
          0,
          INITIAL_LIMIT,
        )

  const remaining =
    evidences.length -
    INITIAL_LIMIT

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            Bằng chứng
          </div>

          <div className="mt-1 text-xs text-slate-400">
            {evidences.length} file
          </div>
        </div>

        {evidences.length >
          INITIAL_LIMIT && (
          <button
            type="button"
            onClick={() =>
              setExpanded(
                (current) =>
                  !current,
              )
            }
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            {expanded
              ? 'Thu gọn'
              : `Xem thêm ${remaining} file`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {visibleEvidences.map(
          (evidence) => (
            <EvidenceItem
              key={evidence.id}
              evidence={evidence}
              onOpenImage={openImage}
            />
          ),
        )}
      </div>

      {activeImageIndex !== null && (
        <EvidenceLightbox
          images={images}
          initialIndex={activeImageIndex}
          onClose={closeImage}
        />
      )}
    </div>
  )
}

function EvidenceItem({
  evidence,
  onOpenImage,
}) {
  const containerRef =
    useRef(null)

  const [shouldLoad, setShouldLoad] =
    useState(false)

  const [url, setUrl] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState(false)

  const [opening, setOpening] =
    useState(false)

  const isImage =
    evidence.mime_type?.startsWith(
      'image/',
    )

  useEffect(() => {
    if (!isImage) {
      return
    }

    const element =
      containerRef.current

    if (!element) {
      return
    }

    if (
      typeof IntersectionObserver ===
      'undefined'
    ) {
      // oxlint-disable-next-line react/set-state-in-effect
      setShouldLoad(true)
      return
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          const entry =
            entries[0]

          if (
            entry?.isIntersecting
          ) {
            setShouldLoad(true)
            observer.disconnect()
          }
        },
        {
          rootMargin: '250px',
        },
      )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [isImage])

  useEffect(() => {
    if (
      !isImage ||
      !shouldLoad
    ) {
      return
    }

    let active = true
    let objectUrl = ''

    async function loadImage() {
      setLoading(true)
      setError(false)

      try {
        const blob =
          await adminService
            .getEvidence(
              evidence.id,
            )

        if (!active) {
          return
        }

        objectUrl =
          URL.createObjectURL(
            blob,
          )

        setUrl(objectUrl)
      } catch {
        if (active) {
          setError(true)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadImage()

    return () => {
      active = false

      if (objectUrl) {
        URL.revokeObjectURL(
          objectUrl,
        )
      }
    }
  }, [
    evidence.id,
    isImage,
    shouldLoad,
  ])

  async function openFile() {
    if (opening) {
      return
    }

    if (isImage) {
      onOpenImage(evidence)
      return
    }

    setOpening(true)
    setError(false)

    try {
      const blob =
        await adminService
          .getEvidence(
            evidence.id,
          )

      const objectUrl =
        URL.createObjectURL(
          blob,
        )

      window.open(
        objectUrl,
        '_blank',
        'noopener,noreferrer',
      )

      setTimeout(() => {
        URL.revokeObjectURL(
          objectUrl,
        )
      }, 60000)
    } catch {
      setError(true)
    } finally {
      setOpening(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      {isImage ? (
        <button
          type="button"
          onClick={openFile}
          className="block w-full text-left"
        >
          <div className="flex aspect-square items-center justify-center overflow-hidden bg-slate-100">
            {loading && (
              <span className="text-xs text-slate-400">
                Đang tải...
              </span>
            )}

            {!loading &&
              error && (
                <span className="px-3 text-center text-xs text-red-500">
                  Không tải được ảnh
                </span>
              )}

            {!loading &&
              !error &&
              url && (
                <img
                  src={url}
                  alt={
                    evidence.original_name ||
                    'Evidence'
                  }
                  className="h-full w-full object-cover transition duration-200 hover:scale-105"
                />
              )}

            {!loading &&
              !error &&
              !url && (
                <span className="text-xs text-slate-400">
                  Hình ảnh
                </span>
              )}
          </div>

          <FileInfo
            evidence={evidence}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={openFile}
          disabled={opening}
          className="block w-full text-left disabled:opacity-60"
        >
          <div className="flex aspect-square flex-col items-center justify-center bg-slate-50 p-4">
            <div className="text-3xl">
              {getFileIcon(
                evidence.mime_type,
              )}
            </div>

            <div className="mt-3 text-center text-xs font-semibold text-slate-600">
              {opening
                ? 'Đang mở...'
                : 'Bấm để xem'}
            </div>

            {error && (
              <div className="mt-2 text-center text-xs text-red-500">
                Không tải được file
              </div>
            )}
          </div>

          <FileInfo
            evidence={evidence}
          />
        </button>
      )}
    </div>
  )
}


function EvidenceLightbox({
  images,
  initialIndex,
  onClose,
}) {
  const [index, setIndex] = useState(initialIndex)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeRef.current()
      }

      if (event.key === 'ArrowLeft') {
        setIndex(current =>
          Math.max(0, current - 1)
        )
      }

      if (event.key === 'ArrowRight') {
        setIndex(current =>
          Math.min(images.length - 1, current + 1)
        )
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [images.length])

  useEffect(() => {
    const evidence = images[index]
    if (!evidence) return

    let active = true
    let objectUrl = ''

    async function load() {
      setLoading(true)
      setError(false)
      setUrl('')

      try {
        const blob = await adminService.getEvidence(evidence.id)

        if (!active) return

        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      } catch {
        if (active) setError(true)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [images, index])

  const evidence = images[index]

  if (!evidence) return null

  // NOSCAM_LIGHTBOX_PORTAL_V2

  // NOSCAM_COMPACT_LIGHTBOX_V3
  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[3px]"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Xem ảnh bằng chứng"
        className="flex max-h-[85dvh] w-full max-w-[650px] flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_25px_90px_rgba(0,0,0,0.3)]"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-extrabold text-slate-900">
              Ảnh bằng chứng
            </h3>
            <p className="mt-1 truncate text-xs text-slate-500">
              {evidence.original_name || `Ảnh #${evidence.id}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng ảnh"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-600 transition hover:bg-slate-200"
          >
            ×
          </button>
        </header>

        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-slate-50 px-12 py-4 sm:px-16">
          {loading ? (
            <p className="text-sm text-slate-500">Đang tải ảnh...</p>
          ) : error ? (
            <p className="text-sm text-red-600">Không tải được ảnh.</p>
          ) : (
            <img
              src={url}
              alt={evidence.original_name || 'Ảnh bằng chứng'}
              className="block max-h-[60dvh] max-w-full object-contain"
              draggable={false}
            />
          )}

          {images.length > 1 && (
            <>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => setIndex(i => Math.max(0, i - 1))}
                aria-label="Ảnh trước"
                className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-30 sm:left-3"
              >
                ‹
              </button>
              <button
                type="button"
                disabled={index === images.length - 1}
                onClick={() => setIndex(i => Math.min(images.length - 1, i + 1))}
                aria-label="Ảnh tiếp theo"
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-30 sm:right-3"
              >
                ›
              </button>
            </>
          )}
        </div>

        <footer className="shrink-0 border-t border-slate-100 px-5 py-3 text-center text-sm font-semibold text-slate-500">
          {index + 1} / {images.length}
        </footer>
      </section>
    </div>,
    document.body
  )
}

function FileInfo({
  evidence,
}) {
  return (
    <div className="p-3">
      <div
        title={
          evidence.original_name
        }
        className="truncate text-xs font-semibold text-slate-700"
      >
        {evidence.original_name ||
          `Evidence #${evidence.id}`}
      </div>

      <div className="mt-1 text-[11px] text-slate-400">
        {formatFileSize(
          evidence.file_size,
        )}
      </div>
    </div>
  )
}

function getFileIcon(
  mimeType = '',
) {
  if (
    mimeType.includes('pdf')
  ) {
    return 'PDF'
  }

  if (
    mimeType.includes('video')
  ) {
    return '▶'
  }

  return 'FILE'
}

function formatFileSize(bytes) {
  const size = Number(bytes)

  if (
    !Number.isFinite(size) ||
    size <= 0
  ) {
    return 'File đính kèm'
  }

  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`
}

export default EvidenceGallery