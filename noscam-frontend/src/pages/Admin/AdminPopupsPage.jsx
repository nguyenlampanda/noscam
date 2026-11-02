import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { popupPages, sitePopupService } from '../../services/sitePopupService'
import AdminNav from '../../components/admin/AdminNav'

const empty = {
  title: '',
  content: '',
  pages: ['/'],
  image_url: '',
  button_text: '',
  button_url: '',
  is_active: false,
  starts_at: '',
  ends_at: '',
}

const toInputDate = value =>
  value ? String(value).replace(' ', 'T').slice(0, 16) : ''

function PopupPreview({ popup, onClose }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-white px-3 py-1 text-2xl shadow"
        >
          ×
        </button>
        {popup.image_url && /^https?:\/\//i.test(popup.image_url) && (
          <img src={popup.image_url} alt="" className="max-h-64 w-full object-cover" />
        )}
        <div className="p-7">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
            Thông báo từ NoScam.vn
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {popup.title || 'Tiêu đề thông báo'}
          </h2>
          <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-slate-700">
            {popup.content || 'Nội dung thông báo'}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-xl border px-5 py-3">
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminPopupsPage() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ ...empty })
  const [editing, setEditing] = useState(null)
  // NOSCAM_POPUP_SCHEDULE_V2
  const [scheduleMode, setScheduleMode] = useState('now')
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  // NOSCAM_POPUP_IMAGE_UPLOAD_V1
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  // NOSCAM_POPUP_CONFIRM_SUCCESS_V2
  const [confirmAction, setConfirmAction] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  const load = useCallback(async () => {
    try {
      const response = await sitePopupService.list()
      setItems(response.data || [])
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function reset() {
    setEditing(null)
    setScheduleMode('now')
    setForm({ ...empty, pages: ['/'] })
  }

  function edit(item) {
    setEditing(item.id)
    setScheduleMode(item.starts_at ? 'custom' : 'now')
    setForm({
      title: item.title || '',
      content: item.content || '',
      pages: item.pages || [],
      image_url: item.image_url || '',
      button_text: item.button_text || '',
      button_url: item.button_url || '',
      is_active: Boolean(item.is_active),
      starts_at: toInputDate(item.starts_at),
      ends_at: toInputDate(item.ends_at),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function update(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function uploadPopupImage(event) {
    const file = event.target.files?.[0]
    if (!file) return

    event.target.value = ''

    const allowed = ['image/jpeg', 'image/png', 'image/webp']

    if (!allowed.includes(file.type)) {
      setError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh không được vượt quá 5 MB.')
      return
    }

    setUploadingImage(true)
    setError('')

    try {
      const result = await sitePopupService.uploadImage(file)
      if (!result?.url) {
        throw new Error('Máy chủ chưa trả về đường dẫn ảnh.')
      }
      update('image_url', result.url)
    } catch (err) {
      setError(err.message || 'Tải ảnh thất bại.')
    } finally {
      setUploadingImage(false)
    }
  }

  function togglePage(path) {
    setForm(current => ({
      ...current,
      pages: current.pages.includes(path)
        ? current.pages.filter(item => item !== path)
        : [...current.pages, path],
    }))
  }

  async function save(event, draft = false, confirmed = false) {
    event.preventDefault()

    if (!confirmed) {
      if (busy) return
      setConfirmAction({ draft, editing: Boolean(editing) })
      return
    }
    if (busy || uploadingImage) return

    setBusy(true)
    setError('')
    setNotice('')

    try {
      const payload = {
        ...form,
        is_active: draft ? false : form.is_active,
        image_url: form.image_url || null,
        button_text: form.button_text || null,
        button_url: form.button_url || null,
        starts_at:
          scheduleMode === 'custom'
            ? form.starts_at || null
            : editing
              ? form.starts_at || null
              : null,
        ends_at: form.ends_at || null,
      }

      if (editing) {
        await sitePopupService.update(editing, payload)
      } else {
        await sitePopupService.create(payload)
      }

      setSuccessMessage(
        draft
          ? 'Đã lưu bản nháp thành công!'
          : editing
            ? 'Cập nhật thông báo thành công!'
            : 'Đăng thông báo thành công!'
      )
      setConfirmAction(null)
      setNotice('')
      reset()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(item) {
    if (!window.confirm(`Xóa thông báo "${item.title}"?`)) return
    setError('')
    try {
      await sitePopupService.remove(item.id)
      if (editing === item.id) reset()
      await load()
      setNotice('')
    } catch (err) {
      setError(err.message)
    }
  }

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500'
  const labelClass = 'mb-2 block text-sm font-semibold text-slate-700'

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* NOSCAM_POPUP_SHARED_LAYOUT_V1 */}
      <AdminNav />
      <main className="w-full flex-1 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/admin" className="text-sm font-semibold text-blue-600">
              ← Quay lại Admin
            </Link>
            <h1 className="mt-3 text-3xl font-bold">Quản lý Popup</h1>
            <p className="mt-2 text-sm text-slate-600">
              Tùy chỉnh thông báo theo từng mục trên NoScam.vn.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            + Tạo thông báo mới
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}


        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <form onSubmit={save} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold">
              {editing ? `Sửa thông báo #${editing}` : 'Tạo thông báo'}
            </h2>

            <div>
              <label className={labelClass}>Tiêu đề *</label>
              <input
                required maxLength={180}
                value={form.title}
                onChange={e => update('title', e.target.value)}
                className={inputClass}
                placeholder="Ví dụ: Lưu ý khi sử dụng dịch vụ"
              />
            </div>

            <div>
              <label className={labelClass}>Nội dung *</label>
              <textarea
                required maxLength={10000} rows={7}
                value={form.content}
                onChange={e => update('content', e.target.value)}
                className={inputClass}
                placeholder="Nhập nội dung thông báo..."
              />
            </div>

            <fieldset>
              <legend className={labelClass}>Trang hiển thị *</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {popupPages.map(([path, name]) => (
                  <label key={path} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={form.pages.includes(path)}
                      onChange={() => togglePage(path)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    {name}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-3">
              <label className={labelClass}>
                Hình ảnh thông báo (không bắt buộc)
              </label>

              <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 px-5 py-7 text-center transition hover:bg-blue-50 ${uploadingImage ? 'pointer-events-none opacity-60' : ''}`}>
                <span className="text-3xl" aria-hidden="true">📷</span>
                <span className="text-sm font-bold text-blue-700">
                  {uploadingImage ? 'Đang tải ảnh...' : 'Chọn ảnh từ điện thoại hoặc máy tính'}
                </span>
                <span className="text-xs text-slate-500">
                  JPG, PNG, WebP · Tối đa 5 MB
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingImage || busy}
                  onChange={uploadPopupImage}
                  className="sr-only"
                />
              </label>

              {form.image_url && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 p-3">
                  <img
                    src={form.image_url}
                    alt="Ảnh xem trước của thông báo"
                    className="max-h-64 w-full rounded-xl object-contain"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      disabled={uploadingImage || busy}
                      onClick={() => update('image_url', '')}
                      className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                    >
                      Bỏ ảnh
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* NOSCAM_POPUP_MULTILINK_V1:
                Liên kết được nhập trực tiếp trong nội dung. */}
            <p className="rounded-xl bg-blue-50 p-3 text-xs leading-6 text-blue-700">
              Bạn có thể nhập nhiều URL trực tiếp trong nội dung thông báo.
              Các đường dẫn sẽ tự động bấm được khi hiển thị.
            </p>

            <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
              <div className="text-sm font-bold text-slate-900">
                Thời gian hiển thị
              </div>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="radio"
                  name="popup-schedule"
                  checked={scheduleMode === 'now'}
                  onChange={() => setScheduleMode('now')}
                />
                {editing ? 'Giữ thời gian bắt đầu hiện tại' : 'Đăng ngay khi bật popup'}
              </label>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="radio"
                  name="popup-schedule"
                  checked={scheduleMode === 'custom'}
                  onChange={() => setScheduleMode('custom')}
                />
                Tùy chỉnh ngày và giờ bắt đầu
              </label>

              {scheduleMode === 'custom' && (
                <div>
                  <label className={labelClass}>Ngày giờ bắt đầu *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.starts_at}
                    onChange={e => update('starts_at', e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className={labelClass}>
                  Kết thúc (để trống nếu không giới hạn)
                </label>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={e => update('ends_at', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-900">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => update('is_active', e.target.checked)}
                className="h-5 w-5 accent-blue-600"
              />
              Bật hiển thị popup
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPreview(true)}
                className="rounded-xl border border-slate-200 px-5 py-3 font-semibold"
              >
                Xem trước
              </button>
              <button
                type="button"
                disabled={busy || uploadingImage || form.pages.length === 0}
                onClick={() => {
                  const formElement = document.querySelector('form')
                  if (formElement?.reportValidity()) {
                    save({ preventDefault() {} }, true)
                  }
                }}
                className="rounded-xl border border-slate-200 px-5 py-3 font-semibold disabled:opacity-50"
              >
                Lưu nháp
              </button>
              <button
                type="submit"
                disabled={busy || uploadingImage || form.pages.length === 0}
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
              >
                {busy ? 'Đang lưu...' : editing ? 'Lưu cập nhật' : 'Đăng thông báo'}
              </button>
            </div>
          </form>

          <aside className="self-start rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold">Thông báo đã tạo ({items.length})</h2>

            {items.length === 0 && (
              <p className="text-sm text-slate-500">Chưa có thông báo nào.</p>
            )}

            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="break-words font-bold">{item.title}</h3>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.is_active ? 'Đang bật' : 'Đã tắt'}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Phiên bản {item.version} · {item.pages.length} trang
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => edit(item)}
                      className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="popup-confirm-title"
            className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-3xl text-blue-600">?</div>
            <h2 id="popup-confirm-title" className="text-xl font-black text-slate-900">
              Xác nhận {confirmAction.draft ? 'lưu nháp' : confirmAction.editing ? 'cập nhật' : 'đăng thông báo'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {confirmAction.draft
                ? 'Thông báo sẽ được lưu lại nhưng chưa hiển thị trên website.'
                : confirmAction.editing
                  ? 'Bạn có chắc chắn muốn cập nhật thông báo này?'
                  : 'Bạn có chắc chắn muốn đăng thông báo này lên NoScam.vn?'}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={busy}
                onClick={() => setConfirmAction(null)}
                className="rounded-xl border border-slate-200 px-5 py-3 font-bold">
                Hủy
              </button>
              <button type="button" disabled={busy}
                onClick={() => save({ preventDefault() {} }, confirmAction.draft, true)}
                className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">
                {busy ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/60 p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="popup-success-title"
            className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl font-black text-emerald-600">✓</div>
            <h2 id="popup-success-title" className="mt-5 text-xl font-black text-slate-900">
              {successMessage}
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              Thông báo đã được lưu vào hệ thống NoScam.vn.
            </p>
            <button type="button" onClick={() => setSuccessMessage('')}
              className="mt-7 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">
              Đóng
            </button>
          </div>
        </div>
      )}


      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-slate-500 lg:px-8">
          <span>© {new Date().getFullYear()} NoScam.vn</span>
          <span>Hệ thống quản trị · Quản lý thông báo</span>
        </div>
      </footer>

      {preview && (
        <PopupPreview popup={form} onClose={() => setPreview(false)} />
      )}
    </div>
  )
}
