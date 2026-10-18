import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Link,
  useLocation,
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
    label: 'Một phần',
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
  const location =
    useLocation()

  const [orders, setOrders] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [status, setStatus] =
    useState('all')

  const [search, setSearch] =
    useState('')

  const [createdNotice, setCreatedNotice] =
    useState(
      Boolean(
        location.state
          ?.orderCreated,
      ),
    )

  useEffect(() => {
    let active = true

    customerService
      .orders()
      .then((response) => {
        if (!active) return

        setOrders(
          response?.data || [],
        )
      })
      .catch((err) => {
        if (!active) return

        setError(
          err?.message ||
            'Không tải được đơn hàng.',
        )
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!createdNotice) {
      return undefined
    }

    const timer = setTimeout(
      () => {
        setCreatedNotice(false)
      },
      4500,
    )

    return () =>
      clearTimeout(timer)
  }, [createdNotice])

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

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
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
          className="flex flex-wrap items-end justify-between gap-5"
        >
          <div>
            <div className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
              Tài khoản
            </div>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Đơn của tôi
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Theo dõi tiến độ các đơn tăng tương tác.
            </p>
          </div>

          <Link
            to="/social-services"
            className="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-sm transition hover:bg-blue-700"
          >
            + Tạo đơn mới
          </Link>
        </motion.div>

        <AnimatePresence>
          {createdNotice && (
            <motion.div
              initial={{
                opacity: 0,
                y: -8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -8,
              }}
              className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 font-black text-white">
                ✓
              </span>

              <div>
                <div className="font-black text-emerald-700">
                  Tạo đơn thành công
                </div>

                <div className="text-sm text-emerald-600">
                  Đơn hàng đã được ghi nhận và đang chờ xử lý.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          {tabs.map(
            (item) => {
              const active =
                status ===
                item.value

              return (
                <motion.button
                  type="button"
                  key={
                    item.value
                  }
                  whileTap={{
                    scale: 0.98,
                  }}
                  onClick={() =>
                    setStatus(
                      item.value,
                    )
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                      : 'border-slate-200 bg-white hover:border-blue-200'
                  }`}
                >
                  <div
                    className={`text-xs font-black uppercase ${
                      active
                        ? 'text-blue-100'
                        : 'text-slate-400'
                    }`}
                  >
                    {item.label}
                  </div>

                  <div className="mt-1 text-2xl font-black">
                    {item.count}
                  </div>
                </motion.button>
              )
            },
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3">
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
              placeholder="Tìm mã đơn, dịch vụ hoặc target..."
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
            filteredOrders.map(
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
                      delay:
                        Math.min(
                          index *
                            0.03,
                          0.2,
                        ),
                    }}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="p-5 md:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-4">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50">
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

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Target
                          </div>

                          <div
                            title={
                              item.target
                            }
                            className="mt-1 truncate text-sm font-bold text-slate-700"
                          >
                            {item.target}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Số lượng
                          </div>

                          <div className="mt-1 text-lg font-black text-slate-900">
                            {number(
                              item.quantity,
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            Còn lại
                          </div>

                          <div className="mt-1 text-lg font-black text-slate-900">
                            {item.remains ===
                              null ||
                            item.remains ===
                              undefined
                              ? '—'
                              : number(
                                  item.remains,
                                )}
                          </div>
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
      </div>
    </main>
  )
}
