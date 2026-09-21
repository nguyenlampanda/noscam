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
            />
          ),
        )}
      </div>
    </div>
  )
}

function EvidenceItem({
  evidence,
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

    if (isImage && url) {
      window.open(
        url,
        '_blank',
        'noopener,noreferrer',
      )

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