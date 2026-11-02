import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCustomerToken } from '../services/customerService'
import apiClient from '../services/apiClient'
import DigitalPlatformIcon from '../components/ui/DigitalPlatformIcon'
import DigitalServiceDetailPage from './DigitalServiceDetailPage'

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
        <span className="flex min-w-0 items-center gap-2">
          {id === 'digital-platform' && (
            <DigitalPlatformIcon platform={selected?.value} size={20} />
          )}
          <span className="truncate">{selected?.label}</span>
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
                <span className="flex items-center gap-2">
                  {id === 'digital-platform' && (
                    <DigitalPlatformIcon platform={item.value} size={20} />
                  )}
                  <span>{item.label}</span>
                </span>
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
  // NOSCAM_DIGITAL_AUTH_GATE_V2
  const loggedIn = Boolean(getCustomerToken())
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (selectedServiceId === null) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setSelectedServiceId(null)
      }

      if (event.key === 'Tab' && modalRef.current) {
        const focusable = Array.from(
          modalRef.current.querySelectorAll(
            'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter(element => element.getClientRects().length > 0)

        if (!focusable.length) {
          event.preventDefault()
          modalRef.current.focus()
          return
        }

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      triggerRef.current?.focus()
    }
  }, [selectedServiceId])

  function openServiceModal(id, event) {
    if (!loggedIn) return
    triggerRef.current = event.currentTarget
    setSelectedServiceId(id)
  }

  // NOSCAM_PAGINATION_V2
  const PAGE_SIZE = 10
  const [currentPage, setCurrentPage] = useState(1)
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

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const visibleItems = items.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [search, category, platform])

  return (
    <div className="min-h-screen bg-slate-50">

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="noscam-digital-hero relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-[#10265c] to-blue-700 px-5 py-8 text-white shadow-2xl shadow-blue-950/20 sm:px-10 sm:py-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative z-10">
          <p className="inline-flex items-center rounded-full border border-blue-300/25 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-blue-100">
            NOSCAM.VN
          </p>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
            Dịch vụ số
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100/90 sm:text-base sm:leading-8">
            Khám phá các dịch vụ hỗ trợ tài khoản, truyền thông,
            báo chí và những giải pháp số khác.
          </p>
          </div>
        </div>

        <div className="relative mt-8">
          <div
            inert={!loggedIn}
            className={!loggedIn
              ? 'pointer-events-none select-none opacity-40 blur-[2.5px] transition-all duration-300'
              : 'transition-all duration-300'}
          >
        <section className="mt-8 rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_14px_45px_-30px_rgba(15,23,42,0.4)] transition-shadow duration-300 hover:shadow-lg sm:p-6">
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
              {visibleItems.map(item => (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                >
                  <div className="h-1 bg-blue-600" />
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
  <DigitalPlatformIcon platform={item.platform} size={16} />
  {platforms.find(p => p.value === item.platform)?.label ?? item.platform}
</span>
                      <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {categories.find(c => c.value === item.category)?.label ?? item.category}
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

                      <button
                        type="button"
                        onClick={event => openServiceModal(item.id, event)}
                        className="mt-5 block w-full rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-700"
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

        {!loading && items.length > 0 && !error && (
          <nav
            aria-label="Phân trang dịch vụ"
            className="mt-7 flex flex-col items-center gap-3"
          >
            <p className="text-sm font-medium text-slate-500">
              Trang {safePage}/{totalPages} · {items.length} dịch vụ
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(safePage - 1)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
              >
                ‹ Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                .reduce((result, n, i, pages) => {
                  if (i && n - pages[i - 1] > 1) result.push('dots-' + n)
                  result.push(n)
                  return result
                }, [])
                .map(n => typeof n === 'string' ? (
                  <span key={n} className="px-1 text-slate-400">...</span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    aria-current={safePage === n ? 'page' : undefined}
                    onClick={() => setCurrentPage(n)}
                    className={'min-w-10 rounded-xl border px-3 py-2 text-sm font-bold ' +
                      (safePage === n
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:text-blue-600')}
                  >
                    {n}
                  </button>
                ))}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(safePage + 1)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
              >
                Tiếp ›
              </button>
            </div>
          </nav>
        )}
        </section>
      
      
          </div>

          {!loggedIn && (
            <div className="absolute inset-x-0 top-8 z-10 flex justify-center px-3 sm:top-16">
              <div
                role="dialog"
                aria-labelledby="digital-login-title"
                aria-describedby="digital-login-description"
                className="w-full max-w-md rounded-[26px] border border-blue-100 bg-white p-6 text-center shadow-[0_25px_70px_-20px_rgba(15,23,42,0.3)] sm:p-8"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-7 w-7"
                    aria-hidden="true"
                  >
                    <rect x="4" y="10" width="16" height="11" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </div>

                <h2
                  id="digital-login-title"
                  className="mt-5 text-xl font-black text-slate-950"
                >
                  Đăng nhập để sử dụng Dịch vụ số
                </h2>

                <p
                  id="digital-login-description"
                  className="mt-3 text-sm leading-6 text-slate-500"
                >
                  Vui lòng đăng nhập hoặc đăng ký tài khoản NoScam.vn
                  để tìm kiếm, xem chi tiết và đặt dịch vụ.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Link
                    to="/login"
                    className="flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
                  >
                    Đăng nhập
                  </Link>

                  <Link
                    to="/register"
                    className="flex min-h-12 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 px-3 text-sm font-bold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100"
                  >
                    Đăng ký
                  </Link>
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  Đăng nhập để mở khóa toàn bộ chức năng dịch vụ số.
                </p>
              </div>
            </div>
          )}
        </div>
{selectedServiceId !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-2 backdrop-blur-sm sm:p-5"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setSelectedServiceId(null)
            }
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết dịch vụ số"
            tabIndex={-1}
            className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-7">
              <h2 className="text-lg font-extrabold text-slate-900">
                Chi tiết dịch vụ
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Đóng chi tiết dịch vụ"
                onClick={() => setSelectedServiceId(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-600"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <DigitalServiceDetailPage
                key={selectedServiceId}
                serviceId={selectedServiceId}
                onClose={() => setSelectedServiceId(null)}
              />
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
  )
}
