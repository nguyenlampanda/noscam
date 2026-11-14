import { useCallback, useEffect, useState } from 'react'
import { adminService } from '../../services/adminService'

const initial = {
  name: '',
  description: '',
  mode: 'recurring',
  bonus_percent: '10',
  min_topup: '100000',
  max_bonus: '',
  max_uses_per_user: '',
  max_total_uses: '',
  weekdays: [],
  month_days: [],
  specific_dates: [],
  start_date: '',
  end_date: '',
  start_time: '19:00',
  end_time: '23:00',
}

const modes = {
  recurring: 'Định kỳ',
  specific_dates: 'Nổi hứng theo ngày',
  time_window: 'Nổi hứng theo giờ',
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm'

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function parseList(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  try {
    const result = JSON.parse(value)
    return Array.isArray(result) ? result : []
  } catch {
    return []
  }
}

function normalize(item) {
  return {
    ...initial,
    ...item,
    weekdays: parseList(item.weekdays),
    month_days: parseList(item.month_days),
    specific_dates: parseList(item.specific_dates),
    start_time: item.start_time?.slice(0, 5) || '19:00',
    end_time: item.end_time?.slice(0, 5) || '23:00',
  }
}

function money(value) {
  return Number(value || 0).toLocaleString('vi-VN') + ' đ'
}

export default function AdminTopupPromotions() {
  const [items, setItems] = useState([])
  const [auditHistory, setAuditHistory] = useState([])
  const [form, setForm] = useState(initial)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [dateInput, setDateInput] = useState('')

  const load = useCallback(async () => {
    const response = await adminService.getFinancePromotions()
    const payload = Array.isArray(response?.data)
        ? response
        : (response?.data?.data !== undefined
          ? response.data
          : response)

      setItems(Array.isArray(payload?.data) ? payload.data : [])
      setAuditHistory(
        Array.isArray(payload?.audit_history)
          ? payload.audit_history
          : []
      )
  }, [])

  useEffect(() => {
    let active = true
    adminService.getFinancePromotions()
      .then((response) => {
        if (active) {
          const payload = Array.isArray(response?.data)
        ? response
        : (response?.data?.data !== undefined
          ? response.data
          : response)

      setItems(Array.isArray(payload?.data) ? payload.data : [])
      setAuditHistory(
        Array.isArray(payload?.audit_history)
          ? payload.audit_history
          : []
      )
        }
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Không tải được khuyến mãi.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const set = (key, value) =>
    setForm((previous) => ({ ...previous, [key]: value }))

  const toggleValue = (key, value) =>
    setForm((previous) => ({
      ...previous,
      [key]: previous[key].includes(value)
        ? previous[key].filter((x) => x !== value)
        : [...previous[key], value].sort((a, b) => a - b),
    }))

  const save = async (event) => {
    event.preventDefault()
    if (busy) return
    if (editingId && !window.confirm('Xác nhận lưu các thay đổi của chương trình này?')) return
    setBusy(true)
    setError('')
    setMessage('')

    const payload = {
      ...form,
      bonus_percent: Number(form.bonus_percent),
      min_topup: Number(form.min_topup),
      max_bonus: form.max_bonus === '' ? null : Number(form.max_bonus),
      max_uses_per_user: form.max_uses_per_user === ''
        ? null : Number(form.max_uses_per_user),
      max_total_uses: form.max_total_uses === ''
        ? null : Number(form.max_total_uses),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      start_time: form.mode === 'time_window' ? form.start_time : null,
      end_time: form.mode === 'time_window' ? form.end_time : null,
    }

    try {
      if (editingId) {
        await adminService.updateFinancePromotion(editingId, payload)
      } else {
        await adminService.createFinancePromotion(payload)
      }
      await load()
      setForm({ ...initial })
      setEditingId(null)
      setMessage('Đã lưu chương trình khuyến mãi.')
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Lưu thất bại.')
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (item) => {
    if (busy) return
    const action = item.is_enabled ? 'TẮT' : 'BẬT'
    if (!window.confirm(`Xác nhận ${action} khuyến mãi "${item.name}"?`)) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await adminService.toggleFinancePromotion(item.id, !item.is_enabled)
      await load()
      setMessage('Đã cập nhật trạng thái áp dụng.')
    } catch (err) {
      setError(err?.message || 'Không thể thay đổi trạng thái.')
    } finally {
      setBusy(false)
    }
  }

  const edit = (item) => {
    setForm(normalize(item))
    setEditingId(item.id)
    setError('')
    setMessage('')
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-950">
          Khuyến mãi nạp tiền
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Cấu hình chương trình. Chưa tự động cộng thưởng khi chưa tích hợp SePay.
        </p>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <form onSubmit={save}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold">
          {editingId ? `Chỉnh sửa chương trình #${editingId}` : 'Tạo chương trình mới'}
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên chương trình">
            <input required maxLength={150} className={inputClass}
              value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Loại chương trình">
            <select className={inputClass} value={form.mode}
              onChange={(e) => set('mode', e.target.value)}>
              {Object.entries(modes).map(([key, label]) =>
                <option key={key} value={key}>{label}</option>
              )}
            </select>
          </Field>
          <Field label="Thưởng (%)">
            <input required type="number" min="0.0001" max="100"
              step="0.0001" className={inputClass}
              value={form.bonus_percent}
              onChange={(e) => set('bonus_percent', e.target.value)} />
          </Field>
          <Field label="Nạp tối thiểu (đ)">
            <input required type="number" min="0" step="1"
              className={inputClass} value={form.min_topup}
              onChange={(e) => set('min_topup', e.target.value)} />
          </Field>
          <Field label="Thưởng tối đa (đ), để trống nếu không giới hạn">
            <input type="number" min="1" step="1" className={inputClass}
              value={form.max_bonus}
              onChange={(e) => set('max_bonus', e.target.value)} />
          </Field>
          <Field label="Giới hạn mỗi khách, để trống nếu không giới hạn">
            <input type="number" min="1" step="1" className={inputClass}
              value={form.max_uses_per_user}
              onChange={(e) => set('max_uses_per_user', e.target.value)} />
          </Field>
          <Field label="Tổng lượt áp dụng tối đa">
            <input type="number" min="1" step="1" className={inputClass}
              value={form.max_total_uses}
              onChange={(e) => set('max_total_uses', e.target.value)} />
          </Field>
          <Field label="Mô tả">
            <input maxLength={2000} className={inputClass}
              value={form.description || ''}
              onChange={(e) => set('description', e.target.value)} />
          </Field>
        </div>

        {form.mode === 'recurring' && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold">Thứ trong tuần</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((day) =>
                  <label key={day} className="rounded-xl border p-2 text-sm">
                    <input type="checkbox" className="mr-2"
                      checked={form.weekdays.includes(day)}
                      onChange={() => toggleValue('weekdays', day)} />
                    {day === 7 ? 'Chủ nhật' : `Thứ ${day + 1}`}
                  </label>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Ngày trong tháng</p>
              <div className="grid grid-cols-7 gap-2 sm:grid-cols-10">
                {Array.from({ length: 31 }, (_, index) => index + 1)
                  .map((day) =>
                    <label key={day} className="rounded-lg border p-2 text-center text-xs">
                      <input type="checkbox" className="mb-1 block mx-auto"
                        checked={form.month_days.includes(day)}
                        onChange={() => toggleValue('month_days', day)} />
                      {day}
                    </label>
                  )}
              </div>
            </div>
          </div>
        )}

        {form.mode === 'specific_dates' && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Chọn các ngày riêng lẻ</p>
            <div className="flex flex-wrap gap-2">
              <input type="date" className={inputClass + ' max-w-52'}
                value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
              <button type="button" className="rounded-xl bg-slate-100 px-4"
                onClick={() => {
                  if (dateInput && !form.specific_dates.includes(dateInput))
                    set('specific_dates', [...form.specific_dates, dateInput].sort())
                  setDateInput('')
                }}>Thêm ngày</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.specific_dates.map((day) =>
                <button type="button" key={day}
                  onClick={() => set('specific_dates',
                    form.specific_dates.filter((d) => d !== day))}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                  {day} ×
                </button>
              )}
            </div>
          </div>
        )}

        {form.mode !== 'recurring' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ngày bắt đầu">
              <input type="date" className={inputClass}
                value={form.start_date || ''}
                onChange={(e) => set('start_date', e.target.value)} />
            </Field>
            <Field label="Ngày kết thúc">
              <input type="date" className={inputClass}
                value={form.end_date || ''}
                onChange={(e) => set('end_date', e.target.value)} />
            </Field>
          </div>
        )}

        {form.mode === 'time_window' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Giờ bắt đầu (Việt Nam)">
              <input type="time" className={inputClass}
                value={form.start_time}
                onChange={(e) => set('start_time', e.target.value)} />
            </Field>
            <Field label="Giờ kết thúc (Việt Nam)">
              <input type="time" className={inputClass}
                value={form.end_time}
                onChange={(e) => set('end_time', e.target.value)} />
            </Field>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button disabled={busy} type="submit"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo khuyến mãi'}
          </button>
          {editingId && (
            <button type="button" onClick={() => {
              setEditingId(null)
              setForm({ ...initial })
            }} className="rounded-xl border px-5 py-2.5 text-sm">
              Hủy chỉnh sửa
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        <h3 className="text-lg font-bold">Danh sách chương trình</h3>
        {loading && <p className="text-sm text-slate-500">Đang tải...</p>}
        {!loading && items.length === 0 &&
          <p className="text-sm text-slate-500">Chưa có chương trình.</p>}
        {items.map((item) =>
          <div key={item.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm ${item.is_enabled ? 'border-emerald-200' : 'border-slate-200'}`}>
            <div>
              <p className="font-semibold">{item.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {modes[item.mode]} · Thưởng {item.bonus_percent}% ·
                Nạp tối thiểu {money(item.min_topup)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Tạo: {new Date(item.created_at).toLocaleString('vi-VN')} · Cập nhật: {new Date(item.updated_at).toLocaleString('vi-VN')}
              </p>
              <p className="mt-1 text-xs">
                {item.is_enabled ? 'Đang áp dụng cấu hình' : 'Chưa áp dụng'}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => edit(item)}
                className="rounded-xl border px-3 py-2 text-sm">Sửa</button>
              <button type="button" disabled={busy}
                onClick={() => toggle(item)}
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50">
                {item.is_enabled ? 'Tắt áp dụng' : 'Áp dụng'}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-lg font-bold">Nhật ký quản lý khuyến mãi</h3>
        <p className="mt-1 text-xs text-slate-500">30 thao tác gần nhất · Ghi nhận ở máy chủ sau khi lưu thành công</p>
        <div className="mt-4 space-y-2">
          {auditHistory.length === 0 && <p className="text-sm text-slate-500">Chưa có thao tác nào được ghi nhận.</p>}
          {auditHistory.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-3 text-sm">
              <div>
                <strong>#{entry.promotion_id}</strong> · {({ created: 'Tạo chương trình', updated: 'Chỉnh sửa', toggled: 'Bật/tắt áp dụng' })[entry.action] || entry.action}
                <p className="mt-1 text-xs text-slate-500">{entry.actor_name || entry.actor_email || 'Không xác định'}</p>
              </div>
              <time className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString('vi-VN')}</time>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
