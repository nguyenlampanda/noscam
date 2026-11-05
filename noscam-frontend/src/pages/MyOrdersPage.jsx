import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Link,
} from 'react-router-dom'
import {
  AnimatePresence,
  motion,
} from 'motion/react'
import PlatformIcon from '../components/social/PlatformIcon'
import customerService from '../services/customerService'

function money(value) {
  return `${Math.round(
    Number(value || 0),
  ).toLocaleString('vi-VN')}đ`
}

function number(value) {
  return Number(
    value || 0,
  ).toLocaleString('vi-VN')
}

function dateTime(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '—'
  }

  return date.toLocaleString(
    'vi-VN',
    {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  )
}

const statusMeta = {
  pending: {
    label: 'Chờ xử lý',
    badge:
      'bg-amber-50 text-amber-600 border-amber-100',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
  },

  processing: {
    label: 'Đang xử lý',
    badge:
      'bg-blue-50 text-blue-600 border-blue-100',
    dot: 'bg-blue-500',
    bar: 'bg-blue-500',
  },

  in_progress: {
    label: 'Đang chạy',
    badge:
      'bg-violet-50 text-violet-600 border-violet-100',
    dot: 'bg-violet-500',
    bar: 'bg-violet-500',
  },

  completed: {
    label: 'Hoàn thành',
    badge:
      'bg-emerald-50 text-emerald-600 border-emerald-100',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
  },

  partial: {
    label: 'Hoàn thành một phần',
    badge:
      'bg-orange-50 text-orange-600 border-orange-100',
    dot: 'bg-orange-500',
    bar: 'bg-orange-500',
  },

  cancelled: {
    label: 'Đã hủy',
    badge:
      'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-500',
    bar: 'bg-slate-400',
  },

  failed: {
    label: 'Thất bại',
    badge:
      'bg-red-50 text-red-600 border-red-100',
    dot: 'bg-red-500',
    bar: 'bg-red-500',
  },
}

function getStatus(status) {
  return (
    statusMeta[status] || {
      label: status || 'Không rõ',
      badge:
        'bg-slate-100 text-slate-600 border-slate-200',
      dot: 'bg-slate-400',
      bar: 'bg-slate-400',
    }
  )
}

function progressOf(order) {
  if (
    order.status ===
    'completed'
  ) {
    return 100
  }

  if (
    order.status ===
      'cancelled' ||
    order.status ===
      'failed'
  ) {
    return 0
  }

  const quantity =
    Number(order.quantity) || 0

  const remains =
    Number(order.remains)

  if (
    quantity > 0 &&
    Number.isFinite(remains) &&
    remains >= 0
  ) {
    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          ((quantity - remains) /
            quantity) *
            100,
        ),
      ),
    )
  }

  if (
    order.status ===
    'in_progress'
  ) {
    return 50
  }

  if (
    order.status ===
    'processing'
  ) {
    return 20
  }

  return 0
}

export default function MyOrdersPage() {
  // NOSCAM_ORDER_PLATFORM_COMMENT_V1
  const [platformFilter, setPlatformFilter] = useState('all')
  const [commentDialogOrder, setCommentDialogOrder] = useState(null)

const [cancelBusyId, setCancelBusyId] = useState(null)
  const [cancelDialogOrder, setCancelDialogOrder] = useState(null)
  const [cancelNotice, setCancelNotice] = useState(null)

  const [orders, setOrders] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [status, setStatus] =
    useState('all')

  // NOSCAM_MYORDERS_PAGINATION_V1
  const PAGE_SIZE = 10
  const [currentPage, setCurrentPage] = useState(1)

  const [search, setSearch] =
    useState('')


  useEffect(() => {
    let active = true
    let inFlight = false

    const refreshOrders = async (initial = false) => {
      if (!active || inFlight || document.visibilityState !== 'visible') return
      inFlight = true

      try {
        const allOrders = []
        let page = 1
        let lastPage = 1

        do {
          const response = await customerService.orders(page)
          if (!active) return

          const items = Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.data?.data)
              ? response.data.data
              : []

          allOrders.push(...items)
          lastPage = Number(response?.last_page ?? response?.data?.last_page ?? 1)
          page += 1
        } while (page <= lastPage && page <= 100)

        if (!active) return
        setOrders(allOrders)
        setError('')
      } catch (err) {
        if (active && initial) {
          setError(err?.message || 'Không tải được đơn hàng.')
        }
      } finally {
        inFlight = false
        if (active && initial) setLoading(false)
      }
    }

    refreshOrders(true)

    const timer = window.setInterval(() => refreshOrders(), 15000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshOrders()
    }

    document.addEventListener('visibilitychange', onVisible)

    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])


async function handleCancelOrder(item) {
    if (cancelBusyId !== null) return

    const allowed = ['pending', 'processing', 'in_progress']
    if (!allowed.includes(item.status)) return

    setCancelBusyId(item.id)
    setCancelNotice(null)

    try {
      const result = await customerService.cancelSocialOrder(item.id)

      setCancelNotice({
        type: 'success',
        message:
          result?.data?.message ||
          result?.message ||
          'Đã tiếp nhận yêu cầu hủy. Vui lòng kiểm tra trạng thái đơn.',
      })

      setCancelDialogOrder(null)

      const refreshed = await customerService.orders()
      setOrders(refreshed?.data || [])
    } catch (err) {
      setCancelNotice({
        type: 'error',
        message:
          err?.response?.data?.message ||
          err?.data?.message ||
          err?.message ||
          'Không thể gửi yêu cầu hủy đơn.',
      })
    } finally {
      setCancelBusyId(null)
    }
  }

  const counts = useMemo(
    () => ({
      all: orders.length,

      active: orders.filter(
        (item) =>
          [
            'pending',
            'processing',
            'in_progress',
          ].includes(
            item.status,
          ),
      ).length,

      completed:
        orders.filter(
          (item) =>
            item.status ===
            'completed',
        ).length,

      problem:
        orders.filter(
          (item) =>
            [
              'partial',
              'cancelled',
              'failed',
            ].includes(
              item.status,
            ),
        ).length,
    }),
    [orders],
  )


  const availablePlatforms = useMemo(() => {
    const found = new Map()

    orders.forEach((item) => {
      const value = String(item.service?.platform || '').trim()
      if (value) {
        const key = value.toLowerCase()
        if (!found.has(key)) found.set(key, value)
      }
    })

    return [...found.values()].sort((a, b) =>
      a.localeCompare(b, 'vi')
    )
  }, [orders])

  const platformLabel = (value) => {
    const labels = {
      facebook: 'Facebook',
      instagram: 'Instagram',
      tiktok: 'TikTok',
      youtube: 'YouTube',
      telegram: 'Telegram',
      threads: 'Threads',
      twitter: 'Twitter / X',
      x: 'X',
      zalo: 'Zalo',
      shopee: 'Shopee',
    }
    return labels[String(value).toLowerCase()] || value
  }

  const getOrderComments = (item) => {
    // NOSCAM_COMMENT_DEMO_V1 - Chỉ dùng để thử giao diện.
    if (String(item?.code || '').trim() === 'NS-000002') {
      return [
        ...Array.from(
          { length: 20 },
          (_, index) =>
            `Bình luận mẫu số ${index + 1}: Đây là nội dung bình luận để kiểm tra chức năng cuộn trong popup NoScam.vn.`
        ),
      ]
    }

    const paths = [
      item?.comments,
      item?.comment_lines,
      item?.custom_comments,
      item?.comments_text,
      item?.comment_text,
      item?.comment_content,
      item?.options?.comments,
      item?.parameters?.comments,
      item?.provider_data?.comments,
      item?.provider_response?.comments,
      item?.provider_response?.data?.comments,
      item?.provider_response?.payload?.comments,
      item?.provider_response?.request?.comments,
      item?.provider_response?.data?.comment,
    ]

    const parse = (value) => {
      if (Array.isArray(value)) {
        return value.flatMap(parse)
      }

      if (typeof value === 'string') {
        return value
          .split(/\\r?\\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      }

      if (value && typeof value === 'object') {
        return parse(value.text ?? value.content ?? value.comment)
      }

      return []
    }

    for (const value of paths) {
      const lines = parse(value)
      if (lines.length) return lines
    }

    return []
  }

  const filteredOrders =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase()

      return orders.filter(
        (item) => {
          let statusMatch =
            true

          if (
            status ===
            'active'
          ) {
            statusMatch = [
              'pending',
              'processing',
              'in_progress',
            ].includes(
              item.status,
            )
          } else if (
            status ===
            'completed'
          ) {
            statusMatch =
              item.status ===
              'completed'
          } else if (
            status ===
            'problem'
          ) {
            statusMatch = [
              'partial',
              'cancelled',
              'failed',
            ].includes(
              item.status,
            )
          }

          if (!statusMatch) {
            return false
          }

          if (
            platformFilter !== 'all' &&
            String(item.service?.platform || '').toLowerCase() !==
              platformFilter.toLowerCase()
          ) {
            return false
          }

          if (!keyword) {
            return true
          }

          const haystack = [
            item.code,
            item.target,
            item.service?.name,
            item.service
              ?.platform,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          return haystack.includes(
            keyword,
          )
        },
      )
    }, [
      orders,
      status,
      search,
      platformFilter,
    ])

  const tabs = [
    {
      value: 'all',
      label: 'Tất cả',
      count: counts.all,
    },
    {
      value: 'active',
      label: 'Đang chạy',
      count: counts.active,
    },
    {
      value: 'completed',
      label: 'Hoàn thành',
      count:
        counts.completed,
    },
    {
      value: 'problem',
      label: 'Khác',
      count: counts.problem,
    },
  ]

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / PAGE_SIZE)
  )

  const safePage = Math.min(currentPage, totalPages)

  const paginatedOrders = filteredOrders.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [status, search, platformFilter])

  function goToPage(page) {
    const nextPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(nextPage)
  }

  return (
    <main className="bg-white min-h-screen px-4 pb-24 pt-7 sm:px-6 sm:pb-12 md:py-12">
      {commentDialogOrder && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCommentDialogOrder(null)
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="noscam-comments-title"
            className="w-full max-w-xl overflow-hidden rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="noscam-comments-title"
                  className="text-xl font-black text-slate-950"
                >
                  Nội dung bình luận
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Đơn hàng {commentDialogOrder.code}
                </p>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setCommentDialogOrder(null)}
                className="rounded-xl bg-slate-100 px-3 py-2 font-bold text-slate-600 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 max-h-[55vh] space-y-2 overflow-y-auto overscroll-contain pr-1">
              {getOrderComments(commentDialogOrder).length > 0 ? (
                getOrderComments(commentDialogOrder).map((line, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700"
                  >
                    <span className="mr-2 font-black text-blue-600">
                      {index + 1}.
                    </span>
                    <span className="whitespace-pre-wrap break-words">
                      {line}
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  Chưa có nội dung bình luận trong dữ liệu đơn hàng
                  được API trả về.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setCommentDialogOrder(null)}
              className="mt-6 min-h-11 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"
            >
              Đóng
            </button>
          </section>
        </div>
      )}

      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="flex flex-wrap items-end justify-between gap-5 rounded-[32px] border border-blue-100/80 bg-white/90 p-6 shadow-[0_20px_65px_-35px_rgba(37,99,235,0.35)] backdrop-blur-xl sm:p-9"
        >
          <div>
            <div className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
              Tài khoản
            </div>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Đơn của tôi
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Theo dõi trạng thái, tiến độ và lịch sử đơn tăng tương tác.
            </p>
          </div>

          <Link
            to="/social-services"
            className="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-sm transition hover:bg-blue-700"
          >
            + Tạo đơn mới
          </Link>
        </motion.div>


{error && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 font-semibold text-red-600">
            {error}
          </div>
        )}

        {cancelNotice && (
          <div
            role="status"
            className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              cancelNotice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {cancelNotice.message}
          </div>
        )}

        <div className="mt-7 grid grid-cols-4 gap-1.5 sm:gap-3">
          {tabs.map((item) => {
            const active = status === item.value

            const colors = {
              all: {
                selected: 'border-blue-600 bg-blue-600 text-white',
                normal: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
              },
              active: {
                selected: 'border-violet-600 bg-violet-600 text-white',
                normal: 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
              },
              completed: {
                selected: 'border-emerald-600 bg-emerald-600 text-white',
                normal: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
              },
              problem: {
                selected: 'border-orange-500 bg-orange-500 text-white',
                normal: 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100',
              },
            }

            const palette = colors[item.value] || colors.all

            return (
              <motion.button
                type="button"
                key={item.value}
                whileTap={{ scale: 0.96 }}
                onClick={() => setStatus(item.value)}
                aria-pressed={active}
                className={`flex min-w-0 flex-col items-center justify-center
                  rounded-xl border px-0.5 py-3 text-center
                  shadow-sm transition-all duration-300
                  hover:-translate-y-1 hover:shadow-md
                  sm:min-h-[108px] sm:rounded-2xl sm:px-3 sm:py-4
                  ${active ? palette.selected : palette.normal}`}
              >
                <span
                  className="block w-full whitespace-nowrap text-center
                    text-[clamp(7px,1.9vw,11px)] font-extrabold
                    leading-tight tracking-tight sm:text-xs"
                >
                  {item.label}
                </span>

                <span className="mt-2 text-xl font-black leading-none sm:text-2xl">
                  {item.count}
                </span>
              </motion.button>
            )
          })}
        </div>


        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label
            htmlFor="noscam-order-platform"
            className="text-sm font-bold text-slate-600"
          >
            Nền tảng
          </label>

          <div
            role="group"
            aria-label="Lọc theo nền tảng"
            className="flex flex-wrap items-center gap-2"
          >
            {[
              { value: 'all', label: 'Tất cả' },
              ...[
                'facebook',
                'instagram',
                'telegram',
                'threads',
                'tiktok',
                'youtube',
              ].map((value) => ({
                value,
                label: platformLabel(value),
              })),
            ].map((item) => {
              const active = platformFilter === item.value

              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPlatformFilter(item.value)}
                  className={`flex min-w-[76px] flex-col items-center gap-1.5 rounded-xl border px-3 py-2.5 transition ${
                    active
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  {item.value === 'all' ? (
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-lg font-black text-white">
                      ✓
                    </span>
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center">
                      <PlatformIcon platform={item.value} size={32} />
                    </span>
                  )}
                  <span className="text-xs font-bold">
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_12px_35px_-25px_rgba(15,23,42,0.4)] transition-all duration-300 hover:border-blue-200 hover:shadow-lg focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50">
          <div className="flex items-center gap-3">
            <span className="pl-2 text-slate-400">
              ⌕
            </span>

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value,
                )
              }
              placeholder="Tìm mã đơn, tên dịch vụ hoặc liên kết..."
              className="min-w-0 flex-1 bg-transparent py-2 text-sm font-semibold outline-none"
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch('')
                }
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-500"
              >
                Xóa
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-14 text-center text-slate-400">
              Đang tải đơn hàng...
            </div>
          ) : filteredOrders.length ===
            0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                ◫
              </div>

              <div className="mt-4 text-lg font-black text-slate-800">
                {orders.length === 0
                  ? 'Chưa có đơn hàng'
                  : 'Không tìm thấy đơn'}
              </div>

              <p className="mt-2 text-sm text-slate-400">
                {orders.length === 0
                  ? 'Tạo đơn đầu tiên để bắt đầu.'
                  : 'Thử thay đổi bộ lọc hoặc từ khóa.'}
              </p>

              {orders.length ===
                0 && (
                <Link
                  to="/social-services"
                  className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
                >
                  Tạo đơn ngay
                </Link>
              )}
            </div>
          ) : (
            paginatedOrders.map(
              (item, index) => {
                const meta =
                  getStatus(
                    item.status,
                  )

                const progress =
                  progressOf(item)

                return (
                  <motion.article
                    key={item.id}
                    initial={{
                      opacity: 0,
                      y: 8,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.45,
                      ease: [0.22, 1, 0.36, 1],
                      delay:
                        Math.min(
                          index *
                            0.03,
                          0.2,
                        ),
                    }}
                    className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_12px_35px_-25px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_25px_55px_-28px_rgba(37,99,235,0.35)]"
                  >
                    <div className="p-5 md:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-4">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                            <PlatformIcon
                              platform={
                                item.service
                                  ?.platform ||
                                'other'
                              }
                              className="h-7 w-7"
                            />
                          </span>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-slate-950">
                                {item.code}
                              </span>

                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${meta.badge}`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
                                />

                                {
                                  meta.label
                                }
                              </span>
                            </div>

                            <div className="mt-2 max-w-3xl font-bold leading-5 text-slate-700">
                              {item
                                .service
                                ?.name ||
                                'Dịch vụ'}
                            </div>

                            <div className="mt-2 text-xs font-semibold text-slate-400">
                              {dateTime(
                                item.created_at,
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-xs font-bold uppercase text-slate-400">
                            Thành tiền
                          </div>

                          <div className="mt-1 text-xl font-black text-blue-600">
                            {money(
                              item.sell_amount,
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 transition-all duration-300 hover:border-blue-200 hover:bg-blue-50/40 md:grid-cols-[minmax(0,1fr)_90px_90px_90px_90px]">
                          <div className="col-span-2 flex min-w-0 items-center gap-2 md:col-span-1">
                            <span className="shrink-0 text-[10px] font-black uppercase text-slate-400">Target</span>
                            {/^https?:\/\//i.test(String(item.target || '').trim()) ? (
                              <a href={String(item.target).trim()} target="_blank" rel="noopener noreferrer"
                                title={item.target}
                                className="group/link inline-flex min-w-0 items-center gap-1 text-xs font-bold text-blue-600 transition-colors hover:text-blue-800">
                                <span className="truncate group-hover/link:underline">{item.target}</span>
                                <span className="shrink-0 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5">↗</span>
                              </a>
                            ) : (
                              <span className="truncate text-xs font-semibold" title={item.target}>{item.target || '—'}</span>
                            )}
                          </div>

                          
                          <div className="flex items-center justify-between gap-2 md:flex-col md:items-end md:justify-center md:gap-0">
                            <span className="text-[10px] font-bold uppercase text-slate-400">
                              Ban đầu
                            </span>
                            <span className="text-xs font-black tabular-nums text-blue-600">
                              {item.start_count == null
                                ? '—'
                                : number(item.start_count)}
                            </span>
                          </div>

<div className="flex items-center justify-between gap-2 md:flex-col md:items-end md:justify-center md:gap-0">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Số lượng</span>
                            <span className="text-xs font-black tabular-nums">{number(item.quantity)}</span>
                          </div>

                          <div className="flex items-center justify-between gap-2 md:flex-col md:items-end md:justify-center md:gap-0">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Đã chạy</span>
                            <span className="text-xs font-black tabular-nums text-blue-600">
                              {item.remains == null ? '—' : number(Math.max(0, Number(item.quantity || 0) - Number(item.remains || 0)))}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 md:flex-col md:items-end md:justify-center md:gap-0">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Còn lại</span>
                            <span className="text-xs font-black tabular-nums">
                              {item.remains == null ? '—' : number(item.remains)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-xs font-black text-slate-500">
                            Tiến độ
                          </span>

                          <span className="text-xs font-black text-slate-700">
                            {progress}%
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <motion.div
                            initial={{
                              width: 0,
                            }}
                            animate={{
                              width: `${progress}%`,
                            }}
                            transition={{
                              duration: 0.6,
                            }}
                            className={`h-full rounded-full ${meta.bar}`}
                          />
                        </div>
                      </div>


                      {/comment|bình luận/i.test(
                        String(item.service?.name || '')
                      ) && (
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => setCommentDialogOrder(item)}
                            className="inline-flex min-h-10 items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:border-blue-400 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
                          >
                            Xem nội dung bình luận
                          </button>
                        </div>
                      )}

                      {['pending', 'processing', 'in_progress'].includes(item.status) && (
                        <div className="mt-4 flex justify-stretch sm:justify-end">
                          <button
                            type="button"
                            disabled={cancelBusyId !== null}
                            onClick={() => { setCancelNotice(null); setCancelDialogOrder(item) }}
                            className="min-h-11 w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-black text-red-600 transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                          >
                            {cancelBusyId === item.id
                              ? 'Đang gửi yêu cầu...'
                              : 'Hủy đơn'}
                          </button>
                        </div>
                      )}

                      {Number(
                        item.refunded_amount ||
                          0,
                      ) > 0 && (
                        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-600">
                          Đã hoàn{' '}
                          {money(
                            item.refunded_amount,
                          )}{' '}
                          vào ví.
                        </div>
                      )}
                    </div>
                  </motion.article>
                )
              },
            )
          )}
        </div>

        {!loading && !error && filteredOrders.length > 0 && (
          <nav
            aria-label="Phân trang đơn hàng"
            className="mt-8 flex flex-col items-center gap-4"
          >
            <p className="text-center text-sm font-medium text-slate-500">
              Hiển thị{' '}
              {(safePage - 1) * PAGE_SIZE + 1}
              {' - '}
              {Math.min(safePage * PAGE_SIZE, filteredOrders.length)}
              {' / '}
              {filteredOrders.length} đơn hàng
            </p>

            <div className="flex max-w-full flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => goToPage(safePage - 1)}
                className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ‹ Trước
              </button>

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1
              )
                .filter((page) =>
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - safePage) <= 1
                )
                .reduce((items, page, index, pages) => {
                  if (index > 0 && page - pages[index - 1] > 1) {
                    items.push('ellipsis-' + page)
                  }
                  items.push(page)
                  return items
                }, [])
                .map((page) =>
                  typeof page === 'string' ? (
                    <span
                      key={page}
                      className="px-1 text-slate-400"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      type="button"
                      key={page}
                      aria-label={'Trang ' + page}
                      aria-current={safePage === page ? 'page' : undefined}
                      onClick={() => goToPage(page)}
                      className={
                        'flex min-h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-black transition ' +
                        (safePage === page
                          ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600')
                      }
                    >
                      {page}
                    </button>
                  )
                )}

              <button
                type="button"
                disabled={safePage === totalPages}
                onClick={() => goToPage(safePage + 1)}
                className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Tiếp ›
              </button>
            </div>
          </nav>
        )}
      </div>

      <AnimatePresence>
        {cancelDialogOrder && (
          <motion.div
            key="cancel-order-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && cancelBusyId === null) {
                setCancelDialogOrder(null)
              }
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-order-title"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl md:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-600">
                  !
                </div>

                <button
                  type="button"
                  aria-label="Đóng popup"
                  disabled={cancelBusyId !== null}
                  onClick={() => setCancelDialogOrder(null)}
                  className="rounded-full px-2 py-1 text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <h2 id="cancel-order-title" className="mt-5 text-xl font-black text-slate-950">
                Xác nhận hủy đơn hàng
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Bạn có chắc chắn muốn gửi yêu cầu hủy đơn hàng này?
              </p>

              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase text-slate-400">
                  Mã đơn hàng
                </div>
                <div className="mt-1 font-black text-slate-900">
                  {cancelDialogOrder.code || cancelDialogOrder.id}
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-600">
                  {cancelDialogOrder.service?.name || 'Dịch vụ tăng tương tác'}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                Đơn đã gửi đến nhà cung cấp có thể không hủy được.
                Tiền chỉ được hoàn khi đơn đủ điều kiện và có kết quả xử lý hợp lệ.
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={cancelBusyId !== null}
                  onClick={() => setCancelDialogOrder(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Giữ đơn hàng
                </button>

                <button
                  type="button"
                  disabled={cancelBusyId !== null}
                  onClick={() => handleCancelOrder(cancelDialogOrder)}
                  className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {cancelBusyId !== null ? 'Đang xử lý...' : 'Xác nhận hủy'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
