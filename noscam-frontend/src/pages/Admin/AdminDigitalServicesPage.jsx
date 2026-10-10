import { useCallback, useEffect, useRef, useState } from 'react'
import AdminNav from '../../components/admin/AdminNav'
import apiClient from '../../services/apiClient'
import { getAdminToken } from '../../services/adminService'

const endpoint = '/admin/digital/services'

const emptyForm = {
  code: '',
  category: 'press_pr',
  name: '',
  description: '',
  pricing_type: 'fixed',
  price_vnd: '',
  platform: 'other',
  requirements: [],
  is_active: false,
  sort_order: 0,
}

function auth() {
  const token = getAdminToken()
  if (!token) throw new Error('Vui lòng đăng nhập Admin.')
  return { headers: { Authorization: `Bearer ${token}` } }
}

function money(value) {
  if (value === null || value === undefined) return 'Báo giá'
  return `${Number(value).toLocaleString('vi-VN')}đ`
}

function normalizeList(response) {
  const value = response?.data ?? response

  if (Array.isArray(value)) {
    return {
      items: value,
      currentPage: 1,
      lastPage: 1,
      total: value.length,
    }
  }

  if (Array.isArray(value?.data)) {
    return {
      items: value.data,
      currentPage: Number(value.current_page ?? 1),
      lastPage: Number(value.last_page ?? 1),
      total: Number(value.total ?? value.data.length),
    }
  }

  if (Array.isArray(value?.services)) {
    return {
      items: value.services,
      currentPage: 1,
      lastPage: 1,
      total: value.services.length,
    }
  }

  throw new Error('Định dạng danh sách API chưa được hỗ trợ.')
}


const CATEGORY_OPTIONS = [
  { value: 'press_pr', label: 'Báo chí / PR' },
  { value: 'account_support', label: 'Hỗ trợ tài khoản' },
  { value: 'digital_other', label: 'Dịch vụ khác' },
]

const PLATFORM_OPTIONS = [
  { value: 'other', label: 'Khác / Tổng hợp' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'website', label: 'Website' },
]

const PRICE_OPTIONS = [
  { value: 'fixed', label: 'Giá cố định' },
  { value: 'quote', label: 'Yêu cầu báo giá' },
]

function Dropdown({ value, onChange, options, placeholder = 'Tất cả' }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)

  useEffect(() => {
    if (!open) return

    function close(event) {
      if (!root.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    function escape(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)

    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  const selected = options.find(item => item.value === value)

  return (
    <div ref={root} className="relative min-w-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(current => !current)}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left text-sm font-semibold shadow-sm transition-all duration-200 ${
          open
            ? 'border-blue-500 ring-4 ring-blue-100'
            : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
        }`}
      >
        <span className="truncate text-slate-800">
          {selected?.label ?? placeholder}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-4 w-4 shrink-0 text-blue-600 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70"
        >
          {options.map(item => (
            <button
              key={item.value}
              type="button"
              role="option"
              aria-selected={item.value === value}
              onClick={() => {
                onChange(item.value)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                item.value === value
                  ? 'bg-blue-50 font-bold text-blue-700'
                  : 'font-medium text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{item.label}</span>
              {item.value === value && (
                <span className="text-blue-600" aria-hidden="true">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminDigitalServicesPage() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
  })
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    platform: 'all',
    pricing: 'all',
  })

  function setFilter(key, value) {
    setPage(1)
    setFilters(previous => ({ ...previous, [key]: value }))
  }

  function resetFilters() {
    setPage(1)
    setFilters({
      status: 'all',
      category: 'all',
      platform: 'all',
      pricing: 'all',
    })
    setSearch('')
  }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      params.set('page', String(page))

      if (search.trim()) params.set('search', search.trim())

      if (filters.category !== 'all') {
        params.set('category', filters.category)
      }

      if (filters.platform !== 'all') {
        params.set('platform', filters.platform)
      }

      if (filters.pricing !== 'all') {
        params.set('pricing_type', filters.pricing)
      }

      if (filters.status !== 'all') {
        params.set('status', filters.status)
      }

      const response = await apiClient.get(
        `${endpoint}?${params.toString()}`,
        auth()
      )

      const result = normalizeList(response)

      setItems(result.items)
      setPagination({
        currentPage: result.currentPage,
        lastPage: result.lastPage,
        total: result.total,
      })
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, search, filters])

  useEffect(() => {
    load()
  }, [load])

  function change(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function edit(item) {
    setEditingId(item.id)
    setForm({
      code: item.code ?? '',
      category: item.category ?? '',
      name: item.name ?? '',
      description: item.description ?? '',
      pricing_type: item.pricing_type ?? 'fixed',
      price_vnd: item.price_vnd ?? '',
      platform: item.platform ?? '',
      requirements: item.requirements ?? [],
      is_active: Boolean(item.is_active),
      sort_order: item.sort_order ?? 0,
    })
    setError('')
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function addRequirement() {
    setForm(previous => ({
      ...previous,
      requirements: [
        ...(Array.isArray(previous.requirements)
          ? previous.requirements
          : []),
        {
          key: '',
          label: '',
          type: 'text',
          required: false,
        },
      ],
    }))
  }

  function updateRequirement(index, field, value) {
    setForm(previous => ({
      ...previous,
      requirements: previous.requirements.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  function removeRequirement(index) {
    setForm(previous => ({
      ...previous,
      requirements: previous.requirements.filter((_, i) => i !== index),
    }))
  }

  function reset() {
    setEditingId(null)
    setForm({ ...emptyForm, requirements: [] })
  }

  async function save(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (form.pricing_type === 'fixed' &&
        (!Number.isFinite(Number(form.price_vnd)) ||
         Number(form.price_vnd) <= 0)) {
      setError('Giá cố định phải lớn hơn 0.')
      return
    }

    const requirements = Array.isArray(form.requirements)
      ? form.requirements.map(item => ({
          ...item,
          key: String(item.key ?? '').trim().toLowerCase(),
          label: String(item.label ?? '').trim(),
          type: item.type ?? 'text',
          required: Boolean(item.required),
        }))
      : []

    const allowedTypes = ['text', 'textarea', 'url', 'email']
    const usedKeys = new Set()

    for (let index = 0; index < requirements.length; index++) {
      const item = requirements[index]
      const position = index + 1

      if (!item.label) {
        setError(`Trường #${position}: Vui lòng nhập tên hiển thị.`)
        return
      }

      if (!item.key) {
        setError(`Trường #${position}: Vui lòng nhập mã trường.`)
        return
      }

      if (!/^[a-z][a-z0-9_]*$/.test(item.key)) {
        setError(
          `Trường #${position}: Mã phải bắt đầu bằng chữ thường, chỉ chứa a-z, 0-9 và dấu gạch dưới.`
        )
        return
      }

      if (usedKeys.has(item.key)) {
        setError(`Mã trường "${item.key}" đang bị trùng.`)
        return
      }

      if (!allowedTypes.includes(item.type)) {
        setError(`Trường #${position}: Loại dữ liệu không hợp lệ.`)
        return
      }

      usedKeys.add(item.key)
    }

    const payload = {
      ...form,
      requirements,
      code: form.code.trim(),
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      platform: form.platform.trim(),
      sort_order: Number(form.sort_order),
      price_vnd: form.pricing_type === 'fixed'
        ? Number(form.price_vnd)
        : null,
    }

    setSaving(true)
    try {
      if (editingId !== null) {
        await apiClient.put(`${endpoint}/${editingId}`, payload, auth())
      } else {
        await apiClient.post(endpoint, payload, auth())
      }
      reset()
      setMessage('Đã lưu dịch vụ thành công.')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggle(item) {
    const next = !item.is_active
    if (!window.confirm(
      `${next ? 'Bật' : 'Tắt'} dịch vụ "${item.name}"?`
    )) return

    setError('')
    setMessage('')
    try {
      await apiClient.patch(
        `${endpoint}/${item.id}/status`,
        { is_active: next },
        auth()
      )
      setMessage('Đã cập nhật trạng thái dịch vụ.')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const filtered = items

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500'

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-7xl space-y-6 px-5 py-8 lg:px-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Quản lý dịch vụ số
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Quản lý dịch vụ PR, hỗ trợ tài khoản và các dịch vụ khác.
            Dịch vụ mới mặc định tắt.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        <form onSubmit={save} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold">
            {editingId === null ? 'Thêm dịch vụ' : `Chỉnh sửa dịch vụ #${editingId}`}
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold">
              <span>Mã dịch vụ</span>
              <input className={fieldClass} required maxLength={100}
                value={form.code}
                onChange={e => change('code', e.target.value)} />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>Tên dịch vụ</span>
              <input className={fieldClass} required
                value={form.name}
                onChange={e => change('name', e.target.value)} />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>Danh mục</span>
              <Dropdown
                value={form.category}
                onChange={value => change('category', value)}
                options={[
                  ...CATEGORY_OPTIONS,
                  ...(!CATEGORY_OPTIONS.some(o => o.value === form.category)
                    ? [{ value: form.category, label: form.category }]
                    : []),
                ]}
              />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>Nền tảng</span>
              <Dropdown
                value={form.platform}
                onChange={value => change('platform', value)}
                options={[
                  ...PLATFORM_OPTIONS,
                  ...(!PLATFORM_OPTIONS.some(o => o.value === form.platform)
                    ? [{ value: form.platform, label: form.platform }]
                    : []),
                ]}
              />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>Hình thức giá</span>
              <Dropdown
                value={form.pricing_type}
                onChange={value => change('pricing_type', value)}
                options={PRICE_OPTIONS}
              />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>Giá (VNĐ)</span>
              <input type="number" min="0" step="1"
                className={fieldClass}
                disabled={form.pricing_type === 'quote'}
                required={form.pricing_type === 'fixed'}
                value={form.pricing_type === 'quote' ? '' : form.price_vnd}
                onChange={e => change('price_vnd', e.target.value)} />
            </label>

            <label className="space-y-2 text-sm font-semibold">
              <span>Thứ tự hiển thị</span>
              <input type="number" min="0" className={fieldClass}
                value={form.sort_order}
                onChange={e => change('sort_order', e.target.value)} />
            </label>

            <label className="flex items-center gap-3 text-sm font-semibold">
              <input type="checkbox" checked={form.is_active}
                onChange={e => change('is_active', e.target.checked)} />
              Bật hiển thị cho khách hàng
            </label>
          </div>

          <label className="block space-y-2 text-sm font-semibold">
            <span>Mô tả dịch vụ</span>
            <textarea rows={4} className={fieldClass}
              value={form.description}
              onChange={e => change('description', e.target.value)} />
          </label>

          <section className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">
                  Thông tin khách hàng cần cung cấp
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Tự cấu hình các trường thông tin cho từng dịch vụ.
                </p>
              </div>
              <button
                type="button"
                onClick={addRequirement}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                + Thêm trường
              </button>
            </div>

            {!form.requirements?.length ? (
              <div className="rounded-xl border border-dashed border-blue-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                Chưa có trường thông tin nào.
              </div>
            ) : (
              <div className="space-y-3">
                {form.requirements.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                        Trường #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRequirement(index)}
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                      >
                        Xóa trường
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm font-semibold">
                        <span>Tên hiển thị</span>
                        <input
                          className={fieldClass}
                          placeholder="Ví dụ: Link Facebook"
                          value={item.label ?? ''}
                          onChange={e => updateRequirement(index, 'label', e.target.value)}
                        />
                      </label>

                      <label className="space-y-2 text-sm font-semibold">
                        <span>Mã trường</span>
                        <input
                          className={fieldClass}
                          placeholder="Ví dụ: facebook_url"
                          value={item.key ?? ''}
                          onChange={e => updateRequirement(index, 'key', e.target.value)}
                        />
                      </label>

                      <div className="space-y-2 text-sm font-semibold">
                        <span>Loại dữ liệu</span>
                        <Dropdown
                          value={item.type ?? 'text'}
                          onChange={value => updateRequirement(index, 'type', value)}
                          options={[
                            { value: 'text', label: 'Văn bản ngắn' },
                            { value: 'textarea', label: 'Văn bản dài' },
                            { value: 'url', label: 'Đường dẫn URL' },
                            { value: 'email', label: 'Email' },
                          ]}
                        />
                      </div>

                      <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={Boolean(item.required)}
                          onChange={e => updateRequirement(index, 'required', e.target.checked)}
                        />
                        Bắt buộc nhập
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-wrap gap-3">
            <button disabled={saving} type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
              {saving ? 'Đang lưu...' : editingId === null ? 'Thêm dịch vụ' : 'Lưu thay đổi'}
            </button>
            {editingId !== null && (
              <button type="button" onClick={reset}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold">
                Hủy chỉnh sửa
              </button>
            )}
          </div>
        </form>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Danh sách dịch vụ ({items.length})</h2>
            <button type="button" onClick={load}
              className="rounded-xl border px-4 py-2 text-sm font-semibold">
              Tải lại
            </button>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">Bộ lọc nâng cao</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Lọc nhanh theo trạng thái, danh mục, nền tảng và giá.
                </p>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
              >
                Đặt lại bộ lọc
              </button>
            </div>

            <input
              className={fieldClass}
              placeholder="Tìm tên dịch vụ, mã, danh mục..."
              value={search}
              onChange={e => {
                setPage(1)
                setSearch(e.target.value)
              }}
            />

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600">Trạng thái</p>
                <Dropdown
                  value={filters.status}
                  onChange={value => setFilter('status', value)}
                  options={[
                    { value: 'all', label: 'Tất cả trạng thái' },
                    { value: 'active', label: 'Đang bật' },
                    { value: 'inactive', label: 'Đang tắt' },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600">Danh mục</p>
                <Dropdown
                  value={filters.category}
                  onChange={value => setFilter('category', value)}
                  options={[
                    { value: 'all', label: 'Tất cả danh mục' },
                    ...CATEGORY_OPTIONS,
                  ]}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600">Nền tảng</p>
                <Dropdown
                  value={filters.platform}
                  onChange={value => setFilter('platform', value)}
                  options={[
                    { value: 'all', label: 'Tất cả nền tảng' },
                    ...PLATFORM_OPTIONS,
                  ]}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600">Hình thức giá</p>
                <Dropdown
                  value={filters.pricing}
                  onChange={value => setFilter('pricing', value)}
                  options={[
                    { value: 'all', label: 'Tất cả hình thức' },
                    ...PRICE_OPTIONS,
                  ]}
                />
              </div>
            </div>
            <p className="mt-4 text-xs font-semibold text-blue-700">
              Hiển thị {filtered.length} dịch vụ trên trang này · Tổng {pagination.total} dịch vụ
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500">Không có dịch vụ phù hợp.</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map(item => {
                const categoryLabel =
                  CATEGORY_OPTIONS.find(option => option.value === item.category)?.label
                  ?? item.category

                const platformLabel =
                  PLATFORM_OPTIONS.find(option => option.value === item.platform)?.label
                  ?? item.platform
                  ?? 'Khác'

                const requirementCount = Array.isArray(item.requirements)
                  ? item.requirements.length
                  : 0

                return (
                  <article
                    key={item.id}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/50"
                  >
                    <div className={`h-1 w-full ${
                      item.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                    }`} />

                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                              {categoryLabel}
                            </span>

                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                              {platformLabel}
                            </span>
                          </div>

                          <h3 className="break-words text-lg font-extrabold leading-snug text-slate-900">
                            {item.name}
                          </h3>

                          <p className="mt-1 break-all text-xs font-medium text-slate-400">
                            Mã: {item.code}
                          </p>
                        </div>

                        <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                          item.is_active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${
                            item.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                          }`} />
                          {item.is_active ? 'Đang hoạt động' : 'Đã tắt'}
                        </span>
                      </div>

                      {item.description && (
                        <p className="mt-4 line-clamp-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-5 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          {item.pricing_type === 'quote'
                            ? 'Hình thức thanh toán'
                            : 'Giá dịch vụ'}
                        </p>

                        <p className="mt-1 text-xl font-extrabold tracking-tight text-blue-700">
                          {item.pricing_type === 'quote'
                            ? 'Yêu cầu báo giá'
                            : money(item.price_vnd)}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="rounded-lg bg-slate-50 px-3 py-2 font-semibold">
                          {requirementCount} trường thông tin khách hàng
                        </span>

                        <span className="font-medium">
                          Thứ tự: {item.sort_order ?? 0}
                        </span>
                      </div>

                      <div className="mt-auto flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() => edit(item)}
                          className="flex-1 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                          Chỉnh sửa
                        </button>

                        <button
                          type="button"
                          onClick={() => toggle(item)}
                          className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
                            item.is_active
                              ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:outline-rose-600'
                              : 'border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-emerald-600'
                          }`}
                        >
                          {item.is_active ? 'Tắt dịch vụ' : 'Bật dịch vụ'}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {pagination.lastPage > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
              <p className="text-sm font-semibold text-slate-600">
                Trang {pagination.currentPage} / {pagination.lastPage}
                {' · '}
                {pagination.total} dịch vụ
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={loading || page <= 1}
                  onClick={() => setPage(current => Math.max(1, current - 1))}
                  className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Trang trước
                </button>

                <button
                  type="button"
                  disabled={loading || page >= pagination.lastPage}
                  onClick={() => setPage(current => current + 1)}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Trang sau →
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
