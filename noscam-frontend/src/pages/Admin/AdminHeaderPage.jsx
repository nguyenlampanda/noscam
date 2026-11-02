import { useEffect, useState } from 'react'
import AdminNav from '../../components/admin/AdminNav'
import { API_BASE_URL } from '../../services/apiClient'
import { getAdminToken } from '../../services/adminService'

const endpoint = `${API_BASE_URL}/admin/header-settings`

async function adminFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${getAdminToken()}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(json.message || 'Không thể thực hiện yêu cầu.')
  return json
}

export default function AdminHeaderPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    adminFetch(`${API_BASE_URL}/header-settings`)
      .then(result => setItems(result.data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const changeVisible = (key) => {
    setItems(current => current.map(item =>
      item.key === key ? { ...item, visible: !item.visible } : item
    ))
    setMessage('')
  }

  const move = (index, offset) => {
    const target = index + offset
    if (target < 0 || target >= items.length) return

    setItems(current => {
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setMessage('')
  }

  const save = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await adminFetch(endpoint, {
        method: 'PUT',
        body: JSON.stringify({
          items: items.map(({ key, visible }) => ({ key, visible })),
        }),
      })
      setItems(result.data)
      setMessage('Đã lưu. Tải lại website để xem Header mới.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    if (!window.confirm('Khôi phục tất cả mục Header về mặc định?')) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await adminFetch(endpoint, { method: 'DELETE' })
      setItems(result.data)
      setMessage('Đã khôi phục Header mặc định.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
            NOSCAM.VN ADMIN
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Quản lý Header
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Bật/tắt và sắp xếp menu website. Không xóa trang hay thay đổi chức năng.
          </p>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900">Menu điều hướng</h2>
            <p className="mt-1 text-sm text-slate-500">
              Thứ tự dưới đây áp dụng cho desktop và điện thoại.
            </p>
          </div>

          {loading ? (
            <p className="p-6 text-slate-500">Đang tải...</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <div
                  key={item.key}
                  className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.path}</p>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={item.visible}
                      onChange={() => changeVisible(item.key)}
                      className="h-5 w-5 accent-blue-600"
                    />
                    <span className={item.visible ? 'text-blue-600' : 'text-slate-400'}>
                      {item.visible ? 'Hiển thị' : 'Đã ẩn'}
                    </span>
                  </label>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Di chuyển ${item.name} lên`}
                      className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      aria-label={`Di chuyển ${item.name} xuống`}
                      className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {error && <p role="alert" className="mt-5 text-sm text-red-600">{error}</p>}
        {message && <p role="status" className="mt-5 text-sm text-green-700">{message}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Đang xử lý...' : 'Lưu thay đổi'}
          </button>

          <button
            type="button"
            onClick={reset}
            disabled={saving || loading}
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Khôi phục mặc định
          </button>
        </div>
      </main>
    </div>
  )
}
