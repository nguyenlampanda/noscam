import {
  useEffect,
  useState,
} from 'react'

import adminService from '../../services/adminService'

function EvidenceGallery({ evidences = [] }) {
  if (!evidences.length) {
    return (
      <div className="text-sm text-slate-400">
        Không có bằng chứng đính kèm.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">
          Bằng chứng
        </div>

        <div className="text-xs text-slate-400">
          {evidences.length} file
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {evidences.map((evidence) => (
          <EvidenceItem
            key={evidence.id}
            evidence={evidence}
          />
        ))}
      </div>
    </div>
  )
}

function EvidenceItem({ evidence }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] =
    useState(true)
  const [error, setError] =
    useState(false)

  const isImage =
    evidence.mime_type?.startsWith('image/')

  useEffect(() => {
    let objectUrl = ''
    let active = true

    async function loadEvidence() {
      try {
        const blob =
          await adminService.getEvidence(
            evidence.id,
          )

        if (!active) {
          return
        }

        objectUrl =
          URL.createObjectURL(blob)

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

    loadEvidence()

    return () => {
      active = false

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [evidence.id])

  if (loading) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400">
        Đang tải...
      </div>
    )
  }

  if (error || !url) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-red-100 bg-red-50 p-3 text-center text-xs text-red-500">
        Không tải được file
      </div>
    )
  }

  if (isImage) {
    return (
      <button
        type="button"
        onClick={() =>
          window.open(
            url,
            '_blank',
            'noopener,noreferrer',
          )
        }
        className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-left"
      >
        <div className="aspect-square overflow-hidden">
          <img
            src={url}
            alt={
              evidence.original_name ||
              'Evidence'
            }
            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
          />
        </div>

        <div className="truncate bg-white px-3 py-2 text-xs text-slate-600">
          {evidence.original_name}
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() =>
        window.open(
          url,
          '_blank',
          'noopener,noreferrer',
        )
      }
      className="flex aspect-square flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center transition hover:bg-slate-100"
    >
      <div className="text-3xl">
        📄
      </div>

      <div className="mt-3 line-clamp-2 text-xs font-medium text-slate-700">
        {evidence.original_name}
      </div>

      <div className="mt-1 text-[11px] text-slate-400">
        {evidence.mime_type}
      </div>
    </button>
  )
}

export default EvidenceGallery