import { useCallback, useEffect, useState } from 'react'
import exchangeService from '../../services/exchangeService'

// NOSCAM_RECIPROCAL_PENDING_V1
const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? response

const formatDate = (value) => {
  if (!value) return 'Chưa có thời gian'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Chưa có thời gian'
    : date.toLocaleString('vi-VN')
}

export default function ExchangePendingUsers({
  campaignId,
  pendingCount,
  onConfirmed,
}) {
  const [expanded, setExpanded] = useState(false)
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('awaiting_return')
  const [filterOpen, setFilterOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [confirmItem, setConfirmItem] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    try {
      const response = await exchangeService.reciprocalCampaignUsers(
        campaignId,
        page,
        { status, search: keyword },
      )
      if (signal?.aborted) return

      const candidates = [
        response,
        response?.data,
        response?.data?.data,
        response?.data?.data?.data,
      ]

      const result = candidates.find(
        (value) => value &&
          typeof value === 'object' &&
          Array.isArray(value.data) &&
          ('total' in value || 'last_page' in value)
      )

      if (!result) {
        throw new Error(
          'Không đọc được dữ liệu phân trang từ API. Vui lòng kiểm tra phản hồi máy chủ.'
        )
      }

      const rows = result.data

      setItems(rows)
      setTotal(Number(result.total || 0))
      setLastPage(Math.max(1, Number(result.last_page || 1)))
    } catch (err) {
      if (!signal?.aborted) {
        setError(err?.message || 'Không tải được danh sách.')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [campaignId, page, status, keyword])

  useEffect(() => {
    if (!expanded) return undefined
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [expanded, load, revision])

  const confirm = async (item) => {
    if (busyId !== null || confirmItem?.id !== item.id) return
    setBusyId(item.id)
    setError('')
    setNotice('')

    try {
      await exchangeService.confirmReciprocal(item.id)
      setNotice(`Đã xác nhận ${item.username || '#' + item.id}.`)
      setRevision((value) => value + 1)
      if (typeof onConfirmed === 'function') {
        await onConfirmed()
      }
    } catch (err) {
      setError(err?.message || 'Xác nhận thất bại.')
      setRevision((value) => value + 1)
    } finally {
      setBusyId(null)
      setConfirmItem(null)
    }
  }

  return (
    <section className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">
            Danh sách tương tác lại
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {Number(pendingCount || 0).toLocaleString('vi-VN')} người đang chờ
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100"
        >
          {expanded ? 'Thu gọn' : `Hiển thị người chờ (${pendingCount || 0})`}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_190px] md:items-center">
            <form
              className="flex min-w-0 items-stretch gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                setPage(1)
                setKeyword(search.trim())
              }}
            >
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                maxLength={100}
                placeholder="Tìm tên tài khoản..."
                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                className="h-11 shrink-0 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Tìm kiếm
              </button>
            </form>

            <div className="relative z-20 w-full">
              <button
                type="button"
                onClick={() => setFilterOpen((value) => !value)}
                aria-expanded={filterOpen}
                aria-haspopup="listbox"
                className={`flex h-11 w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 text-left text-sm font-semibold shadow-sm transition ${
                  filterOpen
                    ? 'border-blue-500 text-blue-700 ring-2 ring-blue-100'
                    : 'border-slate-200 text-slate-700 hover:border-blue-300'
                }`}
              >
                <span>
                  {status === 'awaiting_return'
                    ? 'Chờ xác nhận'
                    : status === 'confirmed'
                      ? 'Đã xác nhận'
                      : 'Tất cả'}
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`shrink-0 transition-transform ${
                    filterOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {filterOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Đóng bộ lọc"
                    onClick={() => setFilterOpen(false)}
                    className="fixed inset-0 z-30 cursor-default"
                  />
                  <div
                    role="listbox"
                    aria-label="Lọc trạng thái tương tác"
                    className="absolute right-0 top-full z-40 mt-2 w-full min-w-[190px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
                  >
                    {[
                      { value: 'awaiting_return', label: 'Chờ xác nhận' },
                      { value: 'confirmed', label: 'Đã xác nhận' },
                      { value: 'all', label: 'Tất cả' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={status === option.value}
                        onClick={() => {
                          setStatus(option.value)
                          setPage(1)
                          setFilterOpen(false)
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
                          status === option.value
                            ? 'bg-blue-50 font-bold text-blue-700'
                            : 'font-medium text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{option.label}</span>
                        {status === option.value && (
                          <span className="text-blue-600">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
              <button
                type="button"
                onClick={() => setRevision((value) => value + 1)}
                className="ml-3 font-bold underline"
              >
                Thử lại
              </button>
            </div>
          )}

          {notice && (
            <p role="status" className="text-sm font-medium text-green-700">
              {notice}
            </p>
          )}

          {loading ? (
            <p className="py-4 text-sm text-slate-500">Đang tải danh sách...</p>
          ) : (
            <>
              {items.length === 0 && !error && (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  Không có tài khoản phù hợp.
                </p>
              )}

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {items.map((item) => {
                  const confirmed = item.reciprocal_status === 'confirmed'
                  let profileUrl = null
                  try {
                    const url = new URL(item.profile_url)
                    if (['https:', 'http:'].includes(url.protocol)) {
                      profileUrl = url.href
                    }
                  } catch {
                    profileUrl = null
                  }

                  return (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                          <svg width="19" height="19" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round"
                            aria-hidden="true">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
                          </svg>
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {item.username || `Tài khoản #${item.id}`}
                          </p>
                          <p className="text-xs text-slate-500">
                            {confirmed ? 'Xác nhận: ' : 'Gửi: '}
                            {formatDate(
                              confirmed ? item.confirmed_at : item.submitted_at
                            )}
                          </p>
                          {profileUrl && (
                            <a
                              href={profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-blue-700 hover:underline"
                            >
                              Xem tài khoản ↗
                            </a>
                          )}
                        </div>
                      </div>

                      {confirmed ? (
                        <span className="rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-green-700">
                          Đã xác nhận
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => setConfirmItem(item)}
                          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-50"
                        >
                          {busyId === item.id ? 'Đang xử lý...' : 'Xác nhận'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {total.toLocaleString('vi-VN')} tài khoản · Trang {page}/{lastPage}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={loading || page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={loading || page >= lastPage}
                    onClick={() => setPage((value) => value + 1)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {confirmItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="presentation"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reciprocal-confirm-title"
            aria-describedby="reciprocal-confirm-description"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>

            <h3
              id="reciprocal-confirm-title"
              className="text-xl font-black text-slate-950"
            >
              Xác nhận tương tác lại?
            </h3>

            <p
              id="reciprocal-confirm-description"
              className="mt-3 text-sm leading-6 text-slate-600"
            >
              Bạn xác nhận rằng mình đã thực hiện tương tác lại
              với tài khoản dưới đây?
            </p>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-semibold text-slate-500">
                Tài khoản cần xác nhận
              </p>
              <p className="mt-1 break-all text-base font-black text-slate-900">
                {confirmItem.username || `Tài khoản #${confirmItem.id}`}
              </p>
            </div>

            <p className="mt-4 text-xs leading-5 text-amber-700">
              Chỉ xác nhận sau khi đã thực hiện tương tác thật sự.
              Hệ thống sẽ ghi nhận tài khoản này là đã hoàn thành.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => setConfirmItem(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => confirm(confirmItem)}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {busyId !== null
                  ? 'Đang xử lý...'
                  : 'Xác nhận đã tương tác'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
