import NoScamSelect from '../../components/ui/NoScamSelect'
import { useNoScamUI } from '../../components/ui/NoScamUI'
import { useEffect, useRef, useState } from 'react'
import adminExchangeService from '../../services/adminExchangeService'

export default function ExchangeDisputeList() {
  const { confirm } = useNoScamUI()
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('pending')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [selected, setSelected] = useState(null)
  const [decision, setDecision] = useState('approve')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const submitLock = useRef(false)

  useEffect(() => {
    let active = true

    adminExchangeService.disputes({ status, page })
      .then(response => {
        if (!active) return
        setItems(response?.data ?? [])
        setLastPage(response?.last_page ?? 1)
        setError('')
      })
      .catch(err => {
        if (!active) return
        setItems([])
        setError(err.message || 'Không tải được khiếu nại.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [status, page, refresh])

  const reload = () => {
    setLoading(true)
    setRefresh(value => value + 1)
  }

  const openResolve = (item, value) => {
    if (item.status !== 'pending' || item.claim?.risk_hold) return
    setSelected(item)
    setDecision(value)
    setReason('')
    setActionError('')
  }

  const closeResolve = () => {
    if (submitLock.current) return
    setSelected(null)
    setActionError('')
  }

  const submitResolve = async () => {
    if (!selected || submitLock.current) return
    if (selected.status !== 'pending' || selected.claim?.risk_hold) return

    const cleanReason = reason.trim()

    if (!cleanReason || cleanReason.length > 2000) {
      setActionError('Lý do phải có từ 1 đến 2000 ký tự.')
      return
    }

    const label = decision === 'approve'
      ? 'DUYỆT nhiệm vụ và thưởng xu'
      : 'TỪ CHỐI nhiệm vụ và hoàn xu'

    if (!await confirm(
      `Xác nhận ${label} cho khiếu nại #${selected.id}?\n\n` +
      'Thao tác này ảnh hưởng đến số dư ví và không thể hoàn tác trực tiếp.'
    )) return

    submitLock.current = true
    setSubmitting(true)
    setActionError('')

    try {
      await adminExchangeService.resolveDispute(
        selected.id,
        { decision, reason: cleanReason }
      )
      setSelected(null)
      reload()
    } catch (err) {
      setActionError(
        err?.response?.data?.message ||
        err?.message ||
        'Phân xử thất bại. Vui lòng kiểm tra trạng thái trên server.'
      )
    } finally {
      submitLock.current = false
      setSubmitting(false)
    }
  }

  return (
    <section className="w-full min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-slate-900">
          Quản lý khiếu nại
        </h2>
        <button type="button" onClick={reload}
          disabled={loading}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-50">
          Làm mới
        </button>
      </div>

      <NoScamSelect aria-label="Lọc trạng thái khiếu nại"
        value={status}
        onChange={e => {
          setLoading(true)
          setPage(1)
          setStatus(e.target.value)
        }}
        className="rounded-xl border border-slate-200 bg-white p-3">
        <option value="pending">Chờ xử lý</option>
        <option value="approved">Đã duyệt</option>
        <option value="rejected">Đã từ chối</option>
      </NoScamSelect>

      {error && <p role="alert" className="text-red-600">{error}</p>}
      {loading && <p>Đang tải khiếu nại...</p>}
      {!loading && !error && items.length === 0 &&
        <p>Không có khiếu nại phù hợp.</p>}

      {!loading && !error && items.map(item => (
        <article key={item.id}
          className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap justify-between gap-3">
            <h3 className="font-black">Khiếu nại #{item.id}</h3>
            <span className="font-bold text-blue-600">{item.status}</span>
          </div>

          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>Claim: #{item.claim_id} · Người khiếu nại: #{item.opened_by}</p>
            <p>Chiến dịch: #{item.claim?.campaign_id ?? '—'}</p>
            <p>Người thực hiện: #{item.claim?.worker_user_id ?? '—'}</p>
            <p>Trạng thái claim: {item.claim?.status ?? '—'}</p>
            <p>Risk hold: {item.claim?.risk_hold ? 'Có' : 'Không'}</p>
            <p>Tài khoản gửi: {item.claim?.submitted_username ?? '—'}</p>
            <p className="whitespace-pre-wrap">
              Lý do khiếu nại: {item.appeal_reason || '—'}
            </p>
            {item.admin_reason && (
              <p className="whitespace-pre-wrap">
                Lý do phân xử: {item.admin_reason}
              </p>
            )}
          </div>

          {item.status === 'pending' && (
            <div className="mt-4 flex flex-wrap gap-3">
              {item.claim?.risk_hold ? (
                <p className="text-sm font-semibold text-amber-700">
                  Đang giữ để kiểm tra rủi ro. Không thể phân xử.
                </p>
              ) : (
                <>
                  <button type="button"
                    onClick={() => openResolve(item, 'approve')}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">
                    Duyệt và thưởng xu
                  </button>
                  <button type="button"
                    onClick={() => openResolve(item, 'refund')}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700">
                    Từ chối và hoàn xu
                  </button>
                </>
              )}
            </div>
          )}
        </article>
      ))}

      <div className="flex items-center justify-end gap-3">
        <button type="button" disabled={loading || page <= 1}
          onClick={() => { setLoading(true); setPage(p => p - 1) }}
          className="rounded-lg border px-4 py-2 disabled:opacity-40">
          Trước
        </button>
        <span>Trang {page}/{lastPage}</span>
        <button type="button" disabled={loading || page >= lastPage}
          onClick={() => { setLoading(true); setPage(p => p + 1) }}
          className="rounded-lg border px-4 py-2 disabled:opacity-40">
          Sau
        </button>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true"
            aria-label="Xác nhận phân xử khiếu nại"
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-black">
              Phân xử khiếu nại #{selected.id}
            </h3>
            <p className="text-sm text-slate-600">
              {decision === 'approve'
                ? 'Duyệt nhiệm vụ: thưởng xu cho người thực hiện.'
                : 'Từ chối nhiệm vụ: hoàn xu cho chủ chiến dịch.'}
            </p>

            <label htmlFor="exchange-admin-reason"
              className="block text-sm font-bold">
              Lý do phân xử
            </label>
            <textarea id="exchange-admin-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              maxLength={2000}
              rows={5}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 p-3"
              placeholder="Nhập lý do phân xử cụ thể..."
            />
            <p className="text-right text-xs text-slate-500">
              {reason.length}/2000
            </p>

            {actionError && (
              <p role="alert" className="text-sm text-red-600">
                {actionError}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={closeResolve}
                disabled={submitting}
                className="rounded-xl border px-4 py-2 disabled:opacity-50">
                Hủy
              </button>
              <button type="button" onClick={submitResolve}
                disabled={submitting || !reason.trim()}
                className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50">
                {submitting ? 'Đang xử lý...' : 'Xác nhận phân xử'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
