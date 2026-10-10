import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../services/apiClient'

const categories = [
  { value: '', label: 'Tất cả danh mục' },
  { value: 'press_pr', label: 'Báo chí / PR' },
  { value: 'account_support', label: 'Hỗ trợ tài khoản' },
  { value: 'digital_other', label: 'Dịch vụ khác' },
]

const platforms = [
  { value: '', label: 'Tất cả nền tảng' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'website', label: 'Website' },
  { value: 'other', label: 'Khác / Tổng hợp' },
]

function money(value) {
  const number = Number(value)
  return Number.isFinite(number)
    ? number.toLocaleString('vi-VN') + ' ₫'
    : 'Liên hệ báo giá'
}

function FilterDropdown({ id, value, onChange, options }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const button = useRef(null)
  const optionRefs = useRef([])

  const selected = options.find(item => item.value === value)
    ?? options[0]

  useEffect(() => {
    if (!open) return undefined

    function handlePointer(event) {
      if (!root.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleKey(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function openMenu() {
    setOpen(true)
    requestAnimationFrame(() => {
      const index = Math.max(
        0,
        options.findIndex(item => item.value === value)
      )
      optionRefs.current[index]?.focus()
    })
  }

  function handleOptionKey(event, index) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      const next = (index + step + options.length) % options.length
      optionRefs.current[next]?.focus()
    }

    if (event.key === 'Home') {
      event.preventDefault()
      optionRefs.current[0]?.focus()
    }

    if (event.key === 'End') {
      event.preventDefault()
      optionRefs.current[options.length - 1]?.focus()
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      button.current?.focus()
    }

    if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        onClick={() => {
          if (open) setOpen(false)
          else openMenu()
        }}
        className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 text-left text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 ${
          open
            ? 'border-blue-500 ring-4 ring-blue-100'
            : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
        }`}
      >
        <span className="truncate">{selected?.label}</span>

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
          id={`${id}-options`}
          role="listbox"
          aria-label={id === 'digital-category' ? 'Danh mục' : 'Nền tảng'}
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-blue-100 bg-white p-2 shadow-xl shadow-blue-100/60"
        >
          {options.map((item, index) => {
            const active = item.value === value

            return (
              <button
                key={item.value}
                ref={element => {
                  optionRefs.current[index] = element
                }}
                type="button"
                role="option"
                aria-selected={active}
                tabIndex={-1}
                onKeyDown={event => handleOptionKey(event, index)}
                onClick={() => {
                  onChange(item.value)
                  setOpen(false)
                  button.current?.focus()
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700 focus:outline-none'
                }`}
              >
                <span>{item.label}</span>
                {active && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function DigitalServicesPage() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [platform, setPlatform] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams()

        if (search.trim()) params.set('search', search.trim())
        if (category) params.set('category', category)
        if (platform) params.set('platform', platform)

        const query = params.toString()
        const response = await apiClient.get(
          `/digital/services${query ? '?' + query : ''}`,
          { signal: controller.signal }
        )

        if (!controller.signal.aborted) {
          const list = response?.data
          if (!Array.isArray(list)) {
            throw new Error('Dữ liệu dịch vụ không hợp lệ.')
          }
          setItems(list)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message)
          setItems([])
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [search, category, platform])

  return (
    <div className="min-h-screen bg-slate-50">

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 p-8 text-white shadow-xl shadow-blue-100 sm:p-12">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-100">
            NOSCAM.VN
          </p>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            Dịch vụ số
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-50 sm:text-base">
            Khám phá các dịch vụ hỗ trợ tài khoản, truyền thông,
            báo chí và những giải pháp số khác.
          </p>
        </div>

        <section className="mt-8 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-extrabold text-slate-900">
            Tìm dịch vụ phù hợp
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="digital-search" className="mb-2 block text-xs font-bold text-slate-600">
                Tìm kiếm
              </label>
              <input
                id="digital-search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Nhập tên dịch vụ..."
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label htmlFor="digital-category" className="mb-2 block text-xs font-bold text-slate-600">
                Danh mục
              </label>
              <FilterDropdown
                id="digital-category"
                value={category}
                onChange={setCategory}
                options={categories}
              />
            </div>

            <div>
              <label htmlFor="digital-platform" className="mb-2 block text-xs font-bold text-slate-600">
                Nền tảng
              </label>
              <FilterDropdown
                id="digital-platform"
                value={platform}
                onChange={setPlatform}
                options={platforms}
              />
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-slate-900">
              Danh sách dịch vụ
            </h2>
            <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
              {loading ? 'Đang tải...' : `${items.length} dịch vụ`}
            </span>
          </div>

          {error ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              {error}
            </div>
          ) : loading ? (
            <p className="rounded-2xl bg-white p-8 text-center text-slate-500">
              Đang tải dịch vụ...
            </p>
          ) : items.length === 0 ? (
            <p className="rounded-2xl bg-white p-8 text-center text-slate-500">
              Chưa có dịch vụ phù hợp.
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {items.map(item => (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                >
                  <div className="h-1 bg-blue-600" />
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {categories.find(c => c.value === item.category)?.label ?? item.category}
                      </span>
                      <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {platforms.find(p => p.value === item.platform)?.label ?? item.platform}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-extrabold text-slate-900">
                      {item.name}
                    </h3>

                    <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                      {item.description || 'Xem chi tiết để biết thêm thông tin về dịch vụ.'}
                    </p>

                    <div className="mt-auto pt-6">
                      <p className="text-xs font-bold text-slate-500">Giá dịch vụ</p>
                      <p className="mt-1 text-xl font-extrabold text-blue-700">
                        {item.pricing_type === 'quote'
                          ? 'Yêu cầu báo giá'
                          : money(item.price_vnd)}
                      </p>

                      <Link
                        to={`/digital-services/${item.id}`}
                        className="mt-5 block rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-700"
                      >
                        Xem chi tiết
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
