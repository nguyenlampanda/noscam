import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { motion } from 'framer-motion'
import AdminNav from '../../components/admin/AdminNav'
import SocialAdminNav from '../../components/admin/social/SocialAdminNav'
import adminService from '../../services/adminService'

function money(value) {
  return `${Number(value || 0).toLocaleString(
    'vi-VN',
    { maximumFractionDigits: 0 },
  )}đ`
}

const statusMap = {
  pending: ['Chờ xử lý', 'bg-amber-50 text-amber-700'],
  processing: ['Đang xử lý', 'bg-blue-50 text-blue-700'],
  in_progress: ['Đang chạy', 'bg-indigo-50 text-indigo-700'],
  completed: ['Hoàn thành', 'bg-emerald-50 text-emerald-700'],
  partial: ['Một phần', 'bg-violet-50 text-violet-700'],
  cancelled: ['Đã hủy', 'bg-slate-100 text-slate-600'],
  failed: ['Thất bại', 'bg-red-50 text-red-600'],
}

function StatusBadge({ status }) {
  const [label, className] =
    statusMap[status] || [
      status || '—',
      'bg-slate-100 text-slate-600',
    ]

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${className}`}
    >
      {label}
    </span>
  )
}

export default function AdminSocialOrdersPage() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response =
        await adminService.getSocialOrders({
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
  }, [page, search, status])

  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [load])

  async function changeStatus(
    order,
    nextStatus,
  ) {
    setBusyId(order.id)
    setError('')

    try {
      await adminService.updateSocialOrderStatus(
        order.id,
        nextStatus,
      )

      await load()
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.message ||
          'Không cập nhật được đơn.',
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
            Theo dõi đơn, doanh thu, giá vốn,
            lợi nhuận và trạng thái xử lý.
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
            placeholder="Tìm mã đơn, link, ID provider..."
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400"
          />

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="processing">Đang xử lý</option>
            <option value="in_progress">Đang chạy</option>
            <option value="completed">Hoàn thành</option>
            <option value="partial">Một phần</option>
            <option value="cancelled">Đã hủy</option>
            <option value="failed">Thất bại</option>
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
            Trang {meta.current_page || 1} /{' '}
            {meta.last_page || 1}
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1350px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-4">Đơn</th>
                  <th className="px-5 py-4">Dịch vụ</th>
                  <th className="px-5 py-4">Target</th>
                  <th className="px-5 py-4">SL</th>
                  <th className="px-5 py-4">Doanh thu</th>
                  <th className="px-5 py-4">Giá vốn</th>
                  <th className="px-5 py-4">Lãi</th>
                  <th className="px-5 py-4">Provider</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4">Xử lý</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-5 py-16 text-center font-semibold text-slate-400"
                    >
                      Đang tải...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-5 py-16 text-center font-semibold text-slate-400"
                    >
                      Chưa có đơn hàng.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="font-black text-slate-900">
                          {item.code}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          #{item.id}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="max-w-[220px] font-bold text-slate-800">
                          {item.service?.name || '—'}
                        </div>
                        <div className="mt-1 text-xs font-bold uppercase text-slate-400">
                          {item.service?.platform || ''}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="max-w-[220px] truncate text-sm font-semibold text-slate-600">
                          {item.target}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-bold">
                        {Number(
                          item.quantity || 0,
                        ).toLocaleString('vi-VN')}
                      </td>

                      <td className="px-5 py-4 font-black text-slate-900">
                        {money(item.sell_amount)}
                      </td>

                      <td className="px-5 py-4 font-bold text-slate-500">
                        {money(item.cost_amount)}
                      </td>

                      <td className="px-5 py-4 font-black text-emerald-600">
                        {money(item.profit_amount)}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-600">
                        {item.provider?.name || '—'}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={item.status}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <select
                          disabled={busyId === item.id}
                          value={item.status}
                          onChange={(e) =>
                            changeStatus(
                              item,
                              e.target.value,
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                        >
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            disabled={
              Number(meta.current_page) <= 1
            }
            onClick={() =>
              setPage((v) =>
                Math.max(1, v - 1),
              )
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            Trước
          </button>

          <button
            disabled={
              Number(meta.current_page) >=
              Number(meta.last_page)
            }
            onClick={() =>
              setPage((v) => v + 1)
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      </main>
    </div>
  )
}
