
import NoScamSelect from '../../components/ui/NoScamSelect'
import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import AdminNav from '../../components/admin/AdminNav'
import SocialAdminNav from '../../components/admin/social/SocialAdminNav'
import PlatformIcon from '../../components/social/PlatformIcon'
import adminService from '../../services/adminService'
import SocialOrderAuditModal from '../../components/admin/social/SocialOrderAuditModal'

function orderDateTime(value) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date).replace(', ', ' ')
}

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


// NOSCAM_ORDER_PROGRESS_V2
function OrderProgress({ item }) {
  const readNumber = (value) => {
    if (value === null || value === undefined || value === '') {
      return null
    }

    const n = Number(value)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  const quantity = readNumber(item.quantity)
  const start = readNumber(item.start_count)
  const remains = readNumber(item.remains)

  const validProgress =
    quantity !== null &&
    quantity > 0 &&
    remains !== null &&
    remains <= quantity

  const delivered = validProgress
    ? quantity - remains
    : null

  const percent = validProgress
    ? Math.min(100, Math.max(0, delivered / quantity * 100))
    : null

  const formatNumber = (value) =>
    value === null
      ? 'Chưa có dữ liệu'
      : value.toLocaleString('vi-VN')

  const fields = [
    { label: 'Start count', value: start },
    { label: 'Số lượng đặt', value: quantity },
    { label: 'Đã tăng', value: delivered },
    { label: 'Còn lại', value: remains },
  ]

  const syncedAt = item.last_synced_at
    ? new Date(item.last_synced_at)
    : null

  return (
    <section className="mt-4 min-w-0 rounded-2xl border border-blue-100 bg-blue-50/40 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-slate-900">
          Tiến độ đơn hàng
        </h3>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">
          {percent === null
            ? 'Chưa có tiến độ'
            : `${percent.toLocaleString('vi-VN', {
                maximumFractionDigits: 1,
              })}%`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {fields.map((field) => (
          <div
            key={field.label}
            className="min-w-0 rounded-xl border border-slate-100 bg-white p-3"
          >
            <p className="text-[11px] font-semibold text-slate-500">
              {field.label}
            </p>

            <p className="mt-1 break-words text-base font-black tabular-nums text-slate-950">
              {formatNumber(field.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300"
          style={{ width: `${percent ?? 0}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span>
          Cập nhật API:{' '}
          {syncedAt && !Number.isNaN(syncedAt.getTime())
            ? syncedAt.toLocaleString('vi-VN')
            : 'Chưa có dữ liệu'}
        </span>

        <span>
          Mã đơn API: {item.provider_order_id || 'Chưa có'}
        </span>
      </div>
    </section>
  )
}

function margin(item) {
  const sell = Number(
    item.sell_amount || 0,
  )

  const profit = Number(
    item.profit_amount || 0,
  )

  if (sell <= 0) return 0

  return profit / sell * 100
}

function safeTarget(target) {
  if (!target) return ''

  const value = String(target).trim()

  if (
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return value
  }

  return `https://${value}`
}

// NOSCAM_API_RECONCILIATION_BADGE_V1
// NOSCAM_SOCIAL_ORDER_FILTER_V3
const statusMap = {
  api_reconciliation: [
    'Chờ đối soát API',
    'bg-orange-100 text-orange-800',
  ],
  pending: [
    'Chờ xử lý',
    'bg-amber-50 text-amber-700',
  ],
  processing: [
    'Đang xử lý',
    'bg-blue-50 text-blue-700',
  ],
  in_progress: [
    'Đang chạy',
    'bg-indigo-50 text-indigo-700',
  ],
  completed: [
    'Hoàn thành',
    'bg-emerald-50 text-emerald-700',
  ],
  partial: [
    'Hoàn thành một phần',
    'bg-violet-50 text-violet-700',
  ],
  cancelled: [
    'Đã hủy',
    'bg-slate-100 text-slate-600',
  ],
  failed: [
    'Thất bại',
    'bg-red-50 text-red-600',
  ],
}

function refundStatusLabel(order) {
  const status = String(order?.status || '').toLowerCase()

  if (!['cancelled', 'canceled'].includes(status)) {
    return null
  }

  const total = Number(order?.sell_amount)
  const refunded = Number(order?.refunded_amount || 0)

  if (!Number.isFinite(total) || total <= 0 ||
      !Number.isFinite(refunded) || refunded < 0) {
    return 'Đã hủy · Chưa hoàn tiền'
  }

  if (refunded >= total - 0.0001) {
    return 'Đã hủy & hoàn tiền'
  }

  if (refunded > 0) {
    return 'Đã hủy · Hoàn một phần'
  }

  return 'Đã hủy · Chưa hoàn tiền'
}

function StatusBadge({ status, order }) {
  const refundLabel = refundStatusLabel(order)

  const [
    label,
    className,
  ] =
    statusMap[status] || [
      status || '—',
      'bg-slate-100 text-slate-600',
    ]

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-black ${className}`}
    >
      {refundLabel || label}
    </span>
  )
}

function ApiBadge({ item }) {
  if (item.provider_order_id) {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-600">
        Đã gửi API
      </span>
    )
  }

  if (
    item.status === 'pending' &&
    Number(item.attempts || 0) >= 1 &&
    !item.provider_order_id
  ) {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-black text-orange-800">
        Cần đối soát API
      </span>
    )
  }

  if (item.provider_error) {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-600">
        Lỗi API
      </span>
    )
  }

  return (
    <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
      Chưa gửi API
    </span>
  )
}

function canCancel(item) {
  return [
    'pending',
    'processing',
    'in_progress',
  ].includes(item.status)
}

export default function AdminSocialOrdersPage() {
  const [items, setItems] =
    useState([])

  const [meta, setMeta] =
    useState({})

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [search, setSearch] =
    useState('')

  const [status, setStatus] =
    useState('')

  const [page, setPage] =
    useState(1)

  const [auditOnly, setAuditOnly] =
    useState(false)

  const [auditCount, setAuditCount] =
    useState(0)

  const [auditOrder, setAuditOrder] = useState(null)

  const [noRefundOrder, setNoRefundOrder] = useState(null)
  const [noRefundReason, setNoRefundReason] = useState('')
  const [noRefundConfirm, setNoRefundConfirm] = useState(false)
  const [noRefundError, setNoRefundError] = useState('')
  const [cancelError, setCancelError] = useState('')

  const [busyId, setBusyId] =
    useState(null)

  const [
    cancelOrder,
    setCancelOrder,
  ] = useState(null)

  const loadAuditCount = useCallback(async () => {
    try {
      const response =
        await adminService.getSocialAuditOrders()

      const payload = response?.data?.data
        ? response.data
        : response

      setAuditCount(Number(payload?.total || 0))
    } catch {
      setAuditCount(0)
    }
  }, [])

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true)
        setError('')
      }

      try {
        const response =
          await (auditOnly
            ? adminService.getSocialAuditOrders({ page })
            : adminService.getSocialOrders({
                search,
                status,
                page,
              }))

        const payload =
          response?.data?.data
            ? response.data
            : response

        setItems(
          Array.isArray(payload?.data)
            ? payload.data
            : [],
        )

        setMeta({
          current_page:
            payload?.current_page || 1,
          last_page:
            payload?.last_page || 1,
          total:
            payload?.total || 0,
        })
      } catch (err) {
        setError(
          err?.data?.message ||
            err?.message ||
            'Không tải được đơn hàng.',
        )
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [auditOnly, page, search, status],
  )

  useEffect(() => {
    const timer =
      setTimeout(load, 250)

    return () =>
      clearTimeout(timer)
  }, [load])

  useEffect(() => {
    loadAuditCount()
  }, [loadAuditCount])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        load(true)
        loadAuditCount()
      }
    }, 15000)

    return () => window.clearInterval(timer)
  }, [load, loadAuditCount])

  async function confirmNoRefund() {
    // NOSCAM_NO_REFUND_AUTO_REASON_V1
    if (!noRefundOrder?.id || !noRefundConfirm) return
    setBusyId(noRefundOrder.id)
    setNoRefundError('')
    try {
      await adminService.cancelSocialOrderWithoutRefund(noRefundOrder.id, 'Admin hủy đơn không hoàn tiền')
      setNoRefundOrder(null)
      setNoRefundReason('')
      setNoRefundConfirm(false)
      await load()
      await loadAuditCount()
    } catch (err) {
      setNoRefundError(err?.response?.data?.message || err?.data?.message || err?.message || 'Không thể đóng đơn.')
    } finally {
      setBusyId(null)
    }
  }


  const isOrderFinal = (order) => {
    const status = String(order?.status || '').toLowerCase()
    return [
      'completed',
      'cancelled',
      'canceled',
      'admin_closed',
      'failed',
    ].includes(status) || Boolean(order?.admin_no_refund)
  }

  async function confirmCancel() {
    if (!cancelOrder?.id) return

    const reasonInput = document.getElementById('noscam-refund-reason')
    const refundReason = reasonInput?.value?.trim() || ''

    const canRefundNow =
      !cancelOrder.provider_order_id &&
      Number(cancelOrder.attempts || 0) === 0

    if (canRefundNow && !refundReason) {
      setCancelError('Vui lòng nhập lý do hoàn tiền.')
      return
    }

    setBusyId(cancelOrder.id)
    setCancelError('')

    try {
      await adminService
        .cancelSocialOrder(
          cancelOrder.id,
          refundReason,
        )

      setCancelOrder(null)

      await load()
      await loadAuditCount()
    } catch (err) {
      setCancelError(
        err?.response?.data?.message ||
        err?.data?.message ||
          err?.message ||
          'Không hủy được đơn hàng.',
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
            Social Services
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Đơn hàng
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Theo dõi đơn hàng, giá vốn,
            giá bán, lợi nhuận và tiến độ xử lý.
          </p>
        </div>

        <SocialAdminNav />

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_240px]">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Tìm mã đơn, link, Provider Order ID..."
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
          />

          <NoScamSelect
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none"
          >
            <option value="">
              Tất cả trạng thái
            </option>

            {Object.entries(
              statusMap,
            ).map(
              ([
                value,
                [label],
              ]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ),
            )}
          </NoScamSelect>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setAuditOnly((value) => !value)
              setPage(1)
            }}
            className={`rounded-2xl border px-5 py-3 text-sm font-black transition ${
              auditOnly
                ? 'border-amber-500 bg-amber-500 text-white shadow-lg shadow-amber-100'
                : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Cần đối soát ({auditCount})
          </button>

          {auditOnly && (
            <span className="text-xs font-semibold text-amber-700">
              Các đơn đã thử gửi API nhưng chưa xác định kết quả.
              Không tự gửi lại hoặc hoàn tiền.
            </span>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-500">
            <strong className="text-slate-950">
              {meta.total || 0}
            </strong>{' '}
            đơn hàng
          </div>

          <div className="text-sm font-semibold text-slate-400">
            Trang{' '}
            {meta.current_page || 1}
            {' / '}
            {meta.last_page || 1}
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="px-5 py-16 text-center text-sm font-semibold text-slate-400">
                Đang tải...
              </div>
            ) : items.length === 0 ? (
              <div className="px-5 py-16 text-center text-sm font-semibold text-slate-400">
                Chưa có đơn hàng.
              </div>
            ) : (
              items.map((item) => {
                const profitMargin = margin(item)

                return (
                  <article
                    key={item.id}
                    className="p-4 transition hover:bg-slate-50/70 sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                      <div className="min-w-0">
                        <div className="text-base font-black text-slate-950">
                          {item.code}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          #{item.id}
                          {' · Tài khoản #' + (item.user_id ?? item.user?.id ?? '—')}
                          {item.user?.username ? ` · @${item.user.username}` : ''}
                        </div>
                        <div className="mt-2 text-xs font-semibold text-slate-700">
                          Người đặt: {item.user?.name || 'Chưa có tên'}
                        </div>
                        <div className="mt-1 break-all text-xs text-slate-500">
                          {item.user?.email || 'Chưa có email'}
                        </div>
                         <div className="mt-1 text-xs font-semibold text-slate-500">
                           Thời gian đặt: {orderDateTime(item.created_at)}
                         </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge
                          status={item.status}
                          order={item}
                        />
                        <span className="text-[11px] font-medium text-slate-400">
                          {item.provider_order_id
                            ? 'Đã gửi API'
                            : 'Chưa có mã đơn API'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                            <PlatformIcon
                              platform={item.service?.platform || 'other'}
                              className="h-5 w-5"
                            />
                          </span>
                          <div className="min-w-0">
                            <div className="break-words text-sm font-bold text-slate-900">
                              {item.service?.name || '—'}
                            </div>
                            <div className="mt-1 text-xs font-semibold uppercase text-slate-400">
                              {item.service?.category || ''}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 min-w-0">
                          <div className="text-xs font-semibold text-slate-400">
                            Liên kết
                          </div>
                          {item.target ? (
                            <a
                              href={safeTarget(item.target)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={item.target}
                              className="mt-1 block max-w-full break-all text-sm font-semibold text-blue-600 hover:underline"
                            >
                              {item.target}
                            </a>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                          <span className="text-slate-500">
                            Số lượng: <strong className="text-slate-900">{number(item.quantity)}</strong>
                          </span>
                          <span className="text-slate-500">
                            API: <strong className="text-slate-900">{item.provider?.name || '—'}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-[11px] font-semibold text-slate-500">Giá vốn</div>
                          <div className="mt-1 text-sm font-black text-slate-800">{money(item.cost_amount)}</div>
                        </div>
                        <div className="rounded-xl bg-blue-50 p-3">
                          <div className="text-[11px] font-semibold text-blue-600">Giá bán</div>
                          <div className="mt-1 text-sm font-black text-slate-950">{money(item.sell_amount)}</div>
                        </div>
                        <div className="col-span-2 rounded-xl bg-emerald-50 p-3 sm:col-span-1 lg:col-span-2">
                          <div className="text-[11px] font-semibold text-emerald-700">Lợi nhuận dự kiến</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className={`text-sm font-black ${Number(item.profit_amount) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                              {money(item.profit_amount)}
                            </span>
                            <span className="text-xs font-semibold text-emerald-700">
                              {profitMargin.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <OrderProgress item={item} />

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                      <div className="min-w-0">
                        <ApiBadge item={item} />
                        {item.provider_order_id && (
                          <div className="mt-1 break-all text-xs font-semibold text-slate-600">
                            API Order: {item.provider_order_id}
                          </div>
                        )}
                        {item.providerService && (
                          <div className="mt-1 break-words text-xs text-slate-500">
                            Dịch vụ nguồn #{item.providerService.provider_service_id}
                            {item.providerService.provider_service_name
                              ? ` · ${item.providerService.provider_service_name}`
                              : ''}
                          </div>
                        )}
                        {item.provider_error && (
                          <div className="mt-1 break-words text-xs font-semibold text-red-600">
                            {item.provider_error}
                          </div>
                        )}
                      </div>

                      
<div className="flex w-full flex-wrap gap-2 sm:w-auto">
<button
                          type="button"
                          onClick={() => setAuditOrder(item)}
                          className="flex-1 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-black text-blue-700 transition hover:bg-blue-50 sm:flex-none"
                        >
                          Đối soát
                        </button>

{!(['completed', 'cancelled', 'canceled', 'admin_closed'].includes(String(item.status || '').toLowerCase()) || Boolean(item.admin_no_refund)) && (
  <>

    <button
      type="button"
      disabled={busyId === item.id}
      onClick={() => setCancelOrder(item)}
      className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50 sm:flex-none"
    >
      Hủy &amp; hoàn tiền
    </button>
  </>
)}
</div>

                    </div>
                  </article>
                )
              })
            )}
          </div>
        </motion.div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={
              Number(
                meta.current_page,
              ) <= 1
            }
            onClick={() =>
              setPage((value) =>
                Math.max(
                  1,
                  value - 1,
                ),
              )
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            Trước
          </button>

          <button
            type="button"
            disabled={
              Number(
                meta.current_page,
              ) >=
              Number(
                meta.last_page,
              )
            }
            onClick={() =>
              setPage(
                (value) =>
                  value + 1,
              )
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      </main>

      {auditOrder && (
        <SocialOrderAuditModal
          order={auditOrder}
          onClose={() => setAuditOrder(null)}
        />
      )}

      {noRefundOrder && createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-slate-950">Hủy không hoàn tiền</h2>
            <p className="mt-2 text-sm text-slate-600">Đơn {noRefundOrder.code}. Chỉ đóng trong NoScam, không hoàn xu và không gửi yêu cầu hủy tới nhà cung cấp. Dịch vụ có thể vẫn tiếp tục chạy.</p>
            <label className="mt-3 flex gap-2 text-sm font-semibold text-rose-800">
              <input type="checkbox" checked={noRefundConfirm} onChange={(e) => setNoRefundConfirm(e.target.checked)} />
              Tôi xác nhận không hoàn tiền cho đơn này.
            </label>
            {noRefundError && <p className="mt-2 text-sm font-bold text-red-600">{noRefundError}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" disabled={busyId === noRefundOrder.id} onClick={() => setNoRefundOrder(null)} className="rounded-xl border border-slate-200 p-3 font-bold">Quay lại</button>
              <button type="button" disabled={busyId === noRefundOrder.id || !noRefundConfirm} onClick={confirmNoRefund} className="rounded-xl bg-rose-800 p-3 font-bold text-white disabled:opacity-40">{busyId === noRefundOrder.id ? 'Đang xử lý...' : 'Xác nhận hủy'}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {cancelOrder &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <button
                type="button"
                aria-label="Đóng cửa sổ hủy đơn"
                disabled={busyId === cancelOrder.id}
                onClick={() => setCancelOrder(null)}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl font-black text-red-600 transition hover:bg-red-100 disabled:opacity-50"
              >
                ×
              </button>

              <h2 className="mt-5 text-2xl font-black text-slate-950">
                {(cancelOrder.provider_order_id || Number(cancelOrder.attempts || 0) >= 1)
                  ? 'Kiểm tra trạng thái trước khi hủy?'
                  : 'Hủy đơn & hoàn tiền?'}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {(cancelOrder.provider_order_id || Number(cancelOrder.attempts || 0) >= 1)
                  ? 'Đơn đã thử gửi API. Không được hoàn tiền trước khi xác minh kết quả với Provider.'
                  : 'Đơn chưa được gửi đến nhà cung cấp. Khi hủy, toàn bộ số tiền của đơn sẽ được hoàn lại vào ví khách hàng.'}
              </p>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-400">
                    Mã đơn
                  </span>

                  <span className="text-right text-sm font-black text-slate-900">
                    {cancelOrder.code}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-400">
                    Số lượng
                  </span>

                  <span className="font-black text-slate-900">
                    {number(
                      cancelOrder.quantity,
                    )}
                  </span>
                </div>

                <div
                  className={`flex items-center justify-between gap-4 px-4 py-3 ${
                    !cancelOrder.provider_order_id
                      ? 'border-b border-slate-100'
                      : ''
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-400">
                    Giá bán
                  </span>

                  <span className="font-black text-slate-900">
                    {money(
                      cancelOrder.sell_amount,
                    )}
                  </span>
                </div>

                {!cancelOrder.provider_order_id && Number(cancelOrder.attempts || 0) === 0 && (
                  <div className="flex items-center justify-between gap-4 bg-emerald-50 px-4 py-4">
                    <div>
                      <div className="text-sm font-black text-emerald-700">
                        Hoàn lại khách
                      </div>

                      <div className="mt-0.5 text-xs font-semibold text-emerald-600">
                        Cộng lại vào số dư ví
                      </div>
                    </div>

                    <span className="text-lg font-black text-emerald-700">
                      {money(
                        Math.max(
                          0,
                          Number(
                            cancelOrder.sell_amount ||
                              0,
                          ) -
                            Number(
                              cancelOrder.refunded_amount ||
                                0,
                            ),
                        ),
                      )}
                    </span>
                  </div>
                )}
              </div>

              {(cancelOrder.provider_order_id || Number(cancelOrder.attempts || 0) >= 1) && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-sm font-black text-amber-800">
                    Chưa hoàn tiền ngay
                  </div>

                  <p className="mt-1 text-sm font-semibold leading-6 text-amber-700">
                    Đơn đã thử gửi API. Hãy mở mục Đối soát và kiểm tra trực tiếp với nhà cung cấp. Chỉ hoàn tiền sau khi xác minh nhà cung cấp không nhận đơn hoặc đã xác nhận hủy và không tính phí.
                  </p>
                </div>
              )}

              {!cancelOrder.provider_order_id &&
                Number(cancelOrder.attempts || 0) === 0 && (
                  <div className="mt-4">
                    <label
                      htmlFor="noscam-refund-reason"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Lý do hoàn tiền
                    </label>
                    <textarea
                      id="noscam-refund-reason"
                      rows={3}
                      maxLength={1000}
                      placeholder="Ví dụ: Chưa mở công khai"
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                )}

              {cancelError && (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {cancelError}
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={
                    busyId ===
                    cancelOrder.id
                  }
                  onClick={() =>
                    setCancelOrder(null)
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Quay lại
                </button>

                <button
                  type="button"
                  disabled={
                    busyId ===
                    cancelOrder.id
                  }
                  onClick={() => {
                    if (cancelOrder.provider_order_id || Number(cancelOrder.attempts || 0) >= 1) {
                      setCancelOrder(null)
                      setAuditOrder(cancelOrder)
                      return
                    }
                    confirmCancel()
                  }}
                  className="rounded-2xl bg-red-600 px-4 py-3 font-black text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {busyId ===
                  cancelOrder.id
                    ? 'Đang xử lý...'
                    : (cancelOrder.provider_order_id || Number(cancelOrder.attempts || 0) >= 1)
                      ? 'Mở đối soát'
                      : `Hủy & hoàn ${money(
                          Math.max(
                            0,
                            Number(
                              cancelOrder.sell_amount ||
                                0,
                            ) -
                              Number(
                                cancelOrder.refunded_amount ||
                                  0,
                              ),
                          ),
                        )}`}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
