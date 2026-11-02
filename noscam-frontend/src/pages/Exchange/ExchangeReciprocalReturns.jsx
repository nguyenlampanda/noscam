import { useCallback, useEffect, useState } from 'react'
import exchangeService from '../../services/exchangeService'

const platformHosts = {
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com'],
  facebook: ['facebook.com', 'fb.com', 'fb.watch'],
}

function safeLink(value, platform) {
  try {
    const url = new URL(String(value || '').trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    const host = url.hostname.toLowerCase()
    const allowed = platformHosts[String(platform || '').toLowerCase()] || []
    if (!allowed.some(domain => host === domain || host.endsWith('.' + domain))) return null
    return url.href
  } catch {
    return null
  }
}

export default function ExchangeReciprocalReturns({ campaignId, onSuccess }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await exchangeService.reciprocal()
      const payload =
        response?.data?.data ??
        response?.data ??
        response

      setData(payload)
    } catch (err) {
      setError(err?.message || 'Không tải được lượt tương tác.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const campaign = (data?.campaigns || []).find(
    item => String(item.id) === String(campaignId)
  )
  const returns = (data?.returns || []).filter(
    item => String(item.campaign_id) === String(campaignId)
  )

  async function confirmReturn(item) {
    if (busyId !== null) return
    setBusyId(item.id)
    setError('')
    setSuccess('')
    try {
      await exchangeService.confirmReciprocal(item.id)
      setSuccess('Đã xác nhận tương tác lại thành công.')
      await load()
      if (onSuccess) await onSuccess()
    } catch (err) {
      setError(err?.message || 'Không thể xác nhận. Vui lòng thử lại.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
        <h4 className="text-lg font-black text-slate-900">
          Quản lý lượt tương tác
        </h4>
        <p className="mt-1 text-sm text-slate-500">
          Chiến dịch #{campaignId}
        </p>
        {campaign && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-slate-500">Số lượt mong muốn</p>
              <p className="text-xl font-black">{campaign.quantity}</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-slate-500">Đã tham gia</p>
              <p className="text-xl font-black">{campaign.completed}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <h4 className="font-black text-slate-900">Chờ tương tác lại ({returns.length})</h4>
        <button type="button" onClick={load} disabled={loading || busyId !== null}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-50">
          Làm mới
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p>}
      {loading && <p className="text-sm text-slate-500">Đang tải...</p>}

      {!loading && returns.length === 0 && (
        <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
          Hiện chưa có lượt tương tác nào đang chờ xác nhận.
        </p>
      )}

      <div className="space-y-3">
        {returns.map(item => {
          const url = safeLink(item.profile_url, item.platform)
          return (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">
                    {item.username || 'Tài khoản chưa có tên'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.platform} · {item.task_type} · Lượt #{item.id}
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                  Chờ tương tác lại
                </span>
              </div>

              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="mt-3 block break-all text-sm font-semibold text-blue-600 underline">
                  {url} ↗
                </a>
              )}

              <button type="button"
                onClick={() => confirmReturn(item)}
                disabled={busyId !== null}
                className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                {busyId === item.id ? 'Đang xác nhận...' : 'Xác nhận đã tương tác lại'}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
