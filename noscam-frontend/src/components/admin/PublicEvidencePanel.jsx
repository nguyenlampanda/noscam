import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../../services/apiClient'
import { getAdminToken } from '../../services/adminService'

const API = API_BASE_URL.replace(/\/$/, '')

async function request(path, method = 'GET', body) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getAdminToken()}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || `Lỗi HTTP ${response.status}`)
  }

  return response.json()
}

function PublicEvidenceItem({ evidence, approved }) {
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const base = `/admin/evidences/${evidence.id}`

  useEffect(() => {
    let alive = true

    request(`${base}/public-status`)
      .then(data => {
        if (alive) setStatus(data)
      })
      .catch(error => {
        if (alive) setMessage(error.message)
      })

    return () => { alive = false }
  }, [base])

  async function change(publish) {
    if (publish) {
      const confirmed = window.confirm(
        'Bạn xác nhận đã kiểm tra ảnh và đồng ý công khai? ' +
        'Ảnh sẽ được đóng watermark NOSCAM.VN và mọi người có thể xem.'
      )
      if (!confirmed) return
    } else if (!window.confirm('Thu hồi ảnh công khai này?')) {
      return
    }

    setBusy(true)
    setMessage('')

    try {
      await request(
        `${base}/publish`,
        publish ? 'POST' : 'DELETE',
        publish ? { confirm_redacted: true } : undefined
      )

      const next = await request(`${base}/public-status`)
      setStatus(next)
      setMessage(publish ? 'Đã công khai ảnh.' : 'Đã thu hồi ảnh.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="break-all text-sm font-semibold text-slate-800">
            {evidence.original_name || `Ảnh #${evidence.id}`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {status === null
              ? 'Đang kiểm tra...'
              : status.is_public ? 'Đã công khai' : 'Riêng tư'}
          </p>
        </div>

        {approved && status !== null && (
          <button
            type="button"
            disabled={busy}
            onClick={() => change(!status.is_public)}
            className={`rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${
              status.is_public
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {busy
              ? 'Đang xử lý...'
              : status.is_public
                ? 'Thu hồi công khai'
                : 'Đóng dấu & công khai'}
          </button>
        )}
      </div>

      {message && (
        <p className="mt-2 text-xs text-slate-600">{message}</p>
      )}
    </div>
  )
}

export default function PublicEvidencePanel({ evidences = [], approved }) {
  const images = evidences.filter(item =>
    item.mime_type?.startsWith('image/')
  )

  if (!images.length) return null

  return (
    <div className="mt-6 border-t border-slate-200 pt-5">
      <h3 className="text-sm font-bold text-slate-900">
        Công khai ảnh bằng chứng
      </h3>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Xem ảnh trong phần Bằng chứng phía trên trước khi xác nhận.
        Watermark NOSCAM.VN không che thông tin cá nhân.
        Chỉ công khai ảnh đã kiểm tra và phù hợp để chia sẻ.
      </p>

      <div className="mt-4 space-y-3">
        {images.map(item => (
          <PublicEvidenceItem
            key={item.id}
            evidence={item}
            approved={approved}
          />
        ))}
      </div>
    </div>
  )
}
