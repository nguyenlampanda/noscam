import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import adminService from '../../../services/adminService'

const results = [
  { value: 'uncertain', label: 'Chưa xác định kết quả' },
  { value: 'provider_received', label: 'Provider đã nhận đơn' },
  { value: 'provider_not_received', label: 'Provider xác nhận không nhận đơn' },
]

function unwrap(response) {
  const value = response?.data ?? response
  return value?.data ?? value
}

export default function SocialOrderAuditModal({ order, onClose }) {
  const [history, setHistory] = useState([])
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [resolutions, setResolutions] = useState([])
  const [resolutionLoading, setResolutionLoading] = useState(true)
  const [resolutionError, setResolutionError] = useState('')
  const [result, setResult] = useState('uncertain')
  const [providerOrderId, setProviderOrderId] = useState('')
  const [note, setNote] = useState('')
  const [evidence, setEvidence] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const eligible =
    order?.status === 'pending' &&
    !order?.provider_order_id &&
    Number(order?.attempts || 0) >= 1

  useEffect(() => {
    let active = true

    async function loadHistory() {
      setLoading(true)
      try {
        const response = await adminService.getSocialOrderAudits(order.id)
        const payload = unwrap(response)
        if (active) {
          setHistory(Array.isArray(payload?.data) ? payload.data : [])
        }
      } catch (err) {
        if (active) setError(err?.data?.message || err?.message || 'Không tải được lịch sử.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadHistory()
    return () => { active = false }
  }, [order.id])

  useEffect(() => {
    let active = true

    async function loadResolutions() {
      setResolutionLoading(true)
      setResolutionError('')

      try {
        const response = await adminService.getSocialOrderResolutions(order.id)
        const payload = unwrap(response)

        if (active) {
          setResolutions(Array.isArray(payload?.data) ? payload.data : [])
        }
      } catch (err) {
        if (active) {
          setResolutionError(
            err?.response?.data?.message ||
            err?.message ||
            'Không tải được lịch sử xử lý.'
          )
        }
      } finally {
        if (active) setResolutionLoading(false)
      }
    }

    loadResolutions()

    return () => { active = false }
  }, [order.id])

  useEffect(() => {
    let active = true

    async function loadPreview() {
      setPreviewLoading(true)

      try {
        const response =
          await adminService.getSocialOrderReconciliationPreview(order.id)

        if (active) {
          setPreview(unwrap(response))
        }
      } catch {
        if (active) setPreview(null)
      } finally {
        if (active) setPreviewLoading(false)
      }
    }

    loadPreview()

    return () => { active = false }
  }, [order.id, history.length])

  async function submit(event) {
    event.preventDefault()
    if (!eligible || saving) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await adminService.createSocialOrderAudit(order.id, {
        result,
        provider_order_id: result === 'provider_received' ? providerOrderId.trim() : null,
        note: note.trim(),
        evidence: evidence.trim(),
      })

      const response = await adminService.getSocialOrderAudits(order.id)
      const payload = unwrap(response)
      setHistory(Array.isArray(payload?.data) ? payload.data : [])
      setNote('')
      setEvidence('')
      setProviderOrderId('')
      setResult('uncertain')
      setSuccess('Đã lưu biên bản đối soát. Trạng thái đơn và ví không thay đổi.')
    } catch (err) {
      setError(
        err?.data?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Không lưu được biên bản.'
      )
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/65 p-4">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Đối soát đơn hàng"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-blue-600">
              NoScam · Social Services
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Đối soát đơn {order.code}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Provider: {order.provider?.name || '—'} · Lần thử gửi: {order.attempts || 0}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 font-black text-slate-600">
            Đóng
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          Biên bản chỉ ghi nhận kết quả kiểm tra. Không tự gửi lại đơn, cập nhật trạng thái hoặc hoàn tiền.
          {order.provider_error && (
            <p className="mt-2 break-words font-semibold">
              Lỗi API: {order.provider_error}
            </p>
          )}
        </div>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{success}</div>}

        {eligible ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Ghi nhận kết quả</h3>

            <label className="block text-sm font-bold text-slate-700">
              Kết quả đối soát
              <select value={result} onChange={(e) => setResult(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 p-3">
                {results.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            {result === 'provider_received' && (
              <label className="block text-sm font-bold text-slate-700">
                Mã đơn Provider
                <input required maxLength={191} value={providerOrderId}
                  onChange={(e) => setProviderOrderId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 p-3"
                  placeholder="Mã đơn đã xác minh từ Provider" />
              </label>
            )}

            <label className="block text-sm font-bold text-slate-700">
              Ghi chú kiểm tra
              <textarea required minLength={10} maxLength={5000} rows={3}
                value={note} onChange={(e) => setNote(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 p-3"
                placeholder="Mô tả kết quả kiểm tra..." />
            </label>

            <label className="block text-sm font-bold text-slate-700">
              Bằng chứng / tham chiếu
              <textarea required minLength={10} maxLength={10000} rows={3}
                value={evidence} onChange={(e) => setEvidence(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 p-3"
                placeholder="Mã ticket, thời gian kiểm tra, nội dung phản hồi Provider..." />
            </label>

            <button type="submit" disabled={saving}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Đang lưu...' : 'Lưu biên bản đối soát'}
            </button>
          </form>
        ) : (
          <p className="mt-5 text-sm font-semibold text-slate-500">
            Đơn này không thuộc diện ghi biên bản đối soát chưa rõ kết quả gửi API.
          </p>
        )}

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <h3 className="font-black text-slate-900">
            Xem trước quyết định đối soát
          </h3>

          {previewLoading ? (
            <p className="mt-2 text-sm text-slate-500">
              Đang kiểm tra điều kiện...
            </p>
          ) : !preview ? (
            <p className="mt-2 text-sm text-red-600">
              Không tải được thông tin đối soát.
            </p>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              <p className="font-bold text-slate-700">
                {preview.message}
              </p>

              <p>
                Trạng thái: <strong>{preview.status}</strong>
              </p>

              <p>
                Kết quả: <strong>{preview.audit_result || 'Chưa có'}</strong>
              </p>

              {preview.action === 'refund_after_reconciliation' && (
                <p className="font-black text-emerald-700">
                  Dự kiến hoàn: {Number(preview.estimated_refund || 0).toLocaleString('vi-VN')}đ
                </p>
              )}

              {preview.action === 'provider_order_recovered' && (
                <p className="break-all font-bold text-blue-700">
                  Mã Provider: {preview.provider_order_id}
                </p>
              )}

              <p className="font-black text-amber-700">
                Chức năng thực thi hiện đang khóa.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-slate-100 pt-5">
          <h3 className="text-lg font-black text-slate-900">
            Lịch sử xử lý cuối cùng
          </h3>

          {resolutionLoading ? (
            <p className="mt-3 text-sm text-slate-400">
              Đang tải lịch sử xử lý...
            </p>
          ) : resolutionError ? (
            <p className="mt-3 text-sm font-semibold text-red-600">
              {resolutionError}
            </p>
          ) : resolutions.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">
              Chưa có quyết định xử lý nào.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {resolutions.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm"
                >
                  <div className="font-black text-slate-900">
                    {entry.action}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {entry.admin?.name || 'Admin'} · {entry.created_at || ''}
                  </div>

                  <div className="mt-2 font-semibold text-slate-700">
                    {entry.status_before} → {entry.status_after}
                  </div>

                  {entry.provider_order_id && (
                    <p className="mt-2 break-all text-slate-600">
                      Mã Provider: {entry.provider_order_id}
                    </p>
                  )}

                  {Number(entry.refund_amount || 0) > 0 && (
                    <p className="mt-2 font-black text-emerald-700">
                      Hoàn tiền: {Number(entry.refund_amount).toLocaleString('vi-VN')}đ
                    </p>
                  )}

                  {entry.note && (
                    <p className="mt-2 whitespace-pre-wrap text-slate-600">
                      {entry.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-slate-100 pt-5">
          <h3 className="text-lg font-black text-slate-900">Lịch sử đối soát</h3>
          {loading ? (
            <p className="mt-3 text-sm text-slate-400">Đang tải lịch sử...</p>
          ) : history.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Chưa có biên bản.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
                  <div className="font-black text-slate-900">
                    {results.find((item) => item.value === entry.result)?.label || entry.result}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {entry.admin?.name || 'Admin'} · {entry.created_at || ''}
                  </div>
                  {entry.provider_order_id && <p className="mt-2">Mã Provider: {entry.provider_order_id}</p>}
                  <p className="mt-2 whitespace-pre-wrap">{entry.note}</p>
                  <p className="mt-2 whitespace-pre-wrap text-slate-500">Bằng chứng: {entry.evidence}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
