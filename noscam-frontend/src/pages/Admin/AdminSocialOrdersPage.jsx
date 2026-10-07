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

const statusMap = {
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

function StatusBadge({ status }) {
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
      {label}
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

  const [busyId, setBusyId] =
    useState(null)

  const [
    cancelOrder,
    setCancelOrder,
  ] = useState(null)

  const load = useCallback(
    async () => {
      setLoading(true)
      setError('')

      try {
        const response =
          await adminService
            .getSocialOrders({
              search,
              status,
              page,
            })

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
        setLoading(false)
      }
    },
    [page, search, status],
  )

  useEffect(() => {
    const timer =
      setTimeout(load, 250)

    return () =>
      clearTimeout(timer)
  }, [load])

  async function confirmCancel() {
    if (!cancelOrder?.id) return

    setBusyId(cancelOrder.id)
    setError('')

    try {
      await adminService
        .cancelSocialOrder(
          cancelOrder.id,
        )

      setCancelOrder(null)

      await load()
    } catch (err) {
      setError(
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

      <main className="mx-auto max-w-[1600px] px-5 py-8 lg:px-8">
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

          <select
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
          </select>
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1750px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-4">
                    Đơn
                  </th>

                  <th className="px-5 py-4">
                    Dịch vụ
                  </th>

                  <th className="px-5 py-4">
                    Link
                  </th>

                  <th className="px-5 py-4">
                    SL
                  </th>

                  <th className="px-5 py-4">
                    Giá vốn
                  </th>

                  <th className="px-5 py-4">
                    Giá bán
                  </th>

                  <th className="px-5 py-4">
                    Lợi nhuận
                  </th>

                  <th className="px-5 py-4">
                    Nguồn API
                  </th>

                  <th className="px-5 py-4">
                    API Order
                  </th>

                  <th className="px-5 py-4">
                    Trạng thái
                  </th>

                  <th className="px-5 py-4">
                    Hành động
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan="11"
                      className="px-5 py-16 text-center font-semibold text-slate-400"
                    >
                      Đang tải...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan="11"
                      className="px-5 py-16 text-center font-semibold text-slate-400"
                    >
                      Chưa có đơn hàng.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const profitMargin =
                      margin(item)

                    return (
                      <tr
                        key={item.id}
                        className="align-top transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div className="font-black text-slate-900">
                            {item.code}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            #{item.id}
                          </div>

                          {item.user?.username && (
                            <div className="mt-2 text-xs font-bold text-blue-600">
                              @{item.user.username}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex max-w-[260px] gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                              <PlatformIcon
                                platform={
                                  item.service
                                    ?.platform ||
                                  'other'
                                }
                                className="h-5 w-5"
                              />
                            </span>

                            <div className="min-w-0">
                              <div className="font-bold leading-5 text-slate-800">
                                {item.service
                                  ?.name || '—'}
                              </div>

                              <div className="mt-1 text-xs font-black uppercase text-slate-400">
                                {item.service
                                  ?.category || ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {item.target ? (
                            <a
                              href={safeTarget(
                                item.target,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={item.target}
                              className="block max-w-[230px] truncate text-sm font-bold text-blue-600 underline decoration-blue-200 underline-offset-4 transition hover:text-blue-800"
                            >
                              {item.target}
                            </a>
                          ) : (
                            <span className="text-slate-400">
                              —
                            </span>
                          )}

                          <div className="mt-1 text-[11px] font-semibold text-slate-400">
                            Mở liên kết ↗
                          </div>
                        </td>

                        <td className="px-5 py-4 font-black text-slate-800">
                          {number(
                            item.quantity,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-500">
                            {money(
                              item.cost_amount,
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-black text-slate-950">
                            {money(
                              item.sell_amount,
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div
                            className={`font-black ${
                              Number(
                                item.profit_amount,
                              ) >= 0
                                ? 'text-emerald-600'
                                : 'text-red-600'
                            }`}
                          >
                            {money(
                              item.profit_amount,
                            )}
                          </div>

                          <div className="mt-1 text-xs font-black text-slate-400">
                            {profitMargin.toLocaleString(
                              'vi-VN',
                              {
                                maximumFractionDigits: 1,
                              },
                            )}
                            %
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-black text-slate-800">
                            {item.provider
                              ?.name || '—'}
                          </div>

                          {item.providerService && (
                            <>
                              <div className="mt-1 text-xs font-bold text-blue-600">
                                #
                                {
                                  item
                                    .providerService
                                    .provider_service_id
                                }
                              </div>

                              <div className="mt-1 max-w-[220px] text-xs leading-4 text-slate-400">
                                {item
                                  .providerService
                                  .provider_service_name ||
                                  ''}
                              </div>
                            </>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <ApiBadge
                            item={item}
                          />

                          {item.provider_order_id && (
                            <div className="mt-2 max-w-[150px] break-all text-xs font-black text-slate-700">
                              {
                                item.provider_order_id
                              }
                            </div>
                          )}

                          {item.provider_error && (
                            <div
                              title={
                                item.provider_error
                              }
                              className="mt-2 max-w-[180px] truncate text-xs font-semibold text-red-500"
                            >
                              {
                                item.provider_error
                              }
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              item.status
                            }
                          />

                          {item.provider_order_id ? (
                            <div className="mt-2 text-[11px] font-semibold text-slate-400">
                              Đồng bộ từ API
                            </div>
                          ) : (
                            <div className="mt-2 text-[11px] font-semibold text-slate-400">
                              Chờ gửi API
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {canCancel(item) ? (
                            <button
                              type="button"
                              disabled={
                                busyId ===
                                item.id
                              }
                              onClick={() =>
                                setCancelOrder(
                                  item,
                                )
                              }
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-600 transition hover:border-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Hủy
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-slate-300">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
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

      {cancelOrder &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl font-black text-red-600">
                ×
              </div>

              <h2 className="mt-5 text-2xl font-black text-slate-950">
                {cancelOrder.provider_order_id
                  ? 'Yêu cầu hủy đơn hàng?'
                  : 'Hủy đơn & hoàn tiền?'}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {cancelOrder.provider_order_id
                  ? 'Đơn đã được gửi đến nhà cung cấp. Tiền chỉ được hoàn sau khi nhà cung cấp xác nhận hủy.'
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

                {!cancelOrder.provider_order_id && (
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

              {cancelOrder.provider_order_id && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-sm font-black text-amber-800">
                    Chưa hoàn tiền ngay
                  </div>

                  <p className="mt-1 text-sm font-semibold leading-6 text-amber-700">
                    NoScam sẽ gửi yêu cầu hủy đến nhà cung cấp.
                    Chỉ khi nhà cung cấp xác nhận đơn đã hủy,
                    hệ thống mới hoàn tiền cho khách.
                  </p>
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
                  onClick={
                    confirmCancel
                  }
                  className="rounded-2xl bg-red-600 px-4 py-3 font-black text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {busyId ===
                  cancelOrder.id
                    ? 'Đang xử lý...'
                    : cancelOrder.provider_order_id
                      ? 'Gửi yêu cầu hủy'
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
