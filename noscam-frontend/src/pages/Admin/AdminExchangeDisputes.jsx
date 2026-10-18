import NoScamSelect from '../../components/ui/NoScamSelect'
import { useNoScamUI } from '../../components/ui/NoScamUI'
import { useEffect, useRef, useState } from 'react'
import adminExchangeService from '../../services/adminExchangeService'

export default function AdminExchangeDisputes() {
  const { confirm } = useNoScamUI()
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('pending')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [reasons, setReasons] = useState({})
  const [busyId, setBusyId] = useState(null)
  const locked = useRef(false)

  useEffect(() => {
    let active = true

    adminExchangeService.disputes({ status, page })
      .then((response) => {
        if (!active) return
        setItems(response.data || [])
        setLastPage(response.last_page || 1)
        setError('')
      })
      .catch((err) => {
        if (active) setError(err.message || 'Không thể tải khiếu nại.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [status, page, reload])

  async function resolve(item, decision) {
    if (locked.current) return

    const reason = String(reasons[item.id] || '').trim()
    if (!reason || reason.length > 2000) {
      setError('Cần nhập lý do phân xử từ 1 đến 2000 ký tự.')
      return
    }

    const action = decision === 'approve'
      ? 'DUYỆT nhiệm vụ và thanh toán xu cho người thực hiện'
      : 'TỪ CHỐI nhiệm vụ và hoàn xu theo quy tắc ký quỹ'

    if (!await confirm(
      `Xác nhận ${action}?\\nKhiếu nại #${item.id}\\nLý do: ${reason}`
    )) return

    locked.current = true
    setBusyId(item.id)
    setError('')

    try {
      await adminExchangeService.resolveDispute(item.id, { decision, reason })
      setReload((n) => n + 1)
      setLoading(true)
    } catch (err) {
      setError(err.message || 'Phân xử thất bại.')
    } finally {
      locked.current = false
      setBusyId(null)
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">Quản lý khiếu nại</h2>
        <button type="button" onClick={() => {
          setReload((n) => n + 1); setLoading(true)
        }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">
          Làm mới
        </button>
      </div>

      <NoScamSelect value={status} onChange={(e) => {
        setStatus(e.target.value); setPage(1); setLoading(true)
      }} className="rounded-xl border border-slate-200 p-3">
        <option value="pending">Chờ xử lý</option>
        <option value="approved">Đã duyệt</option>
        <option value="rejected">Đã từ chối</option>
      </NoScamSelect>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Đang tải...</p>}

      {!loading && !error && items.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
          Không có khiếu nại ở trạng thái này.
        </p>
      )}

      <div className="grid gap-4">
        {!loading && !error && items.map((item) => (
          <article key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-900">
              Khiếu nại #{item.id} · Nhiệm vụ #{item.claim_id}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Người khiếu nại #{item.opened_by} · Trạng thái: {item.status}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
              Lý do: {item.appeal_reason}
            </p>
            {item.claim && (
              <p className="mt-2 text-sm text-slate-600">
                Chiến dịch #{item.claim.campaign_id} · Tài khoản: {item.claim.submitted_username || 'Chưa có'}
                {item.claim.risk_hold ? ' · Đang giữ kiểm tra rủi ro' : ''}
              </p>
            )}
            {item.admin_reason && (
              <p className="mt-2 text-sm text-slate-600">
                Kết quả: {item.admin_reason}
              </p>
            )}

            {item.status === 'pending' && (
              <div className="mt-4 space-y-3">
                <textarea value={reasons[item.id] || ''}
                  maxLength={2000}
                  onChange={(e) => setReasons((prev) => ({
                    ...prev, [item.id]: e.target.value,
                  }))}
                  placeholder="Nhập lý do phân xử (bắt buộc)"
                  className="w-full rounded-xl border border-slate-200 p-3"
                  rows={3}
                />
                <div className="flex flex-wrap gap-3">
                  <button type="button"
                    disabled={busyId !== null || Boolean(item.claim?.risk_hold)}
                    onClick={() => resolve(item, 'approve')}
                    className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-40">
                    {busyId === item.id ? 'Đang xử lý...' : 'Duyệt và thanh toán'}
                  </button>
                  <button type="button"
                    disabled={busyId !== null || Boolean(item.claim?.risk_hold)}
                    onClick={() => resolve(item, 'refund')}
                    className="rounded-xl border border-red-200 px-4 py-2 font-semibold text-red-700 disabled:opacity-40">
                    Từ chối và hoàn xu
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <button type="button" disabled={page <= 1 || loading}
          onClick={() => { setPage((p) => p - 1); setLoading(true) }}
          className="rounded-xl border border-slate-200 px-4 py-2 disabled:opacity-40">
          Trang trước
        </button>
        <span className="text-sm text-slate-600">{page} / {lastPage}</span>
        <button type="button" disabled={page >= lastPage || loading}
          onClick={() => { setPage((p) => p + 1); setLoading(true) }}
          className="rounded-xl border border-slate-200 px-4 py-2 disabled:opacity-40">
          Trang sau
        </button>
      </div>
    </section>
  )
}
