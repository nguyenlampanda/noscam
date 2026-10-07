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
  pending: ['Chờ duyệt', 'bg-amber-50 text-amber-700'],
  approved: ['Đã cộng tiền', 'bg-emerald-50 text-emerald-700'],
  rejected: ['Từ chối', 'bg-red-50 text-red-600'],
  cancelled: ['Đã hủy', 'bg-slate-100 text-slate-600'],
}

export default function AdminSocialTopupsPage() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response =
        await adminService.getSocialTopups({
          search,
          status,
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
        total: payload?.total || 0,
      })
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.message ||
          'Không tải được yêu cầu nạp tiền.',
      )
    } finally {
      setLoading(false)
    }
  }, [search, status])

  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [load])

  async function approve(item) {
    if (
      !window.confirm(
        `Cộng ${money(item.amount)} vào ví khách hàng?`,
      )
    ) {
      return
    }

    setBusyId(item.id)

    try {
      await adminService.approveSocialTopup(
        item.id,
      )
      await load()
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.message ||
          'Không duyệt được.',
      )
    } finally {
      setBusyId(null)
    }
  }

  async function reject(item) {
    const note = window.prompt(
      'Lý do từ chối (có thể để trống):',
      '',
    )

    if (note === null) return

    setBusyId(item.id)

    try {
      await adminService.rejectSocialTopup(
        item.id,
        note,
      )
      await load()
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.message ||
          'Không từ chối được.',
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

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Nạp tiền
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Duyệt yêu cầu nạp và cộng tiền vào
            ví khách hàng.
          </p>
        </div>

        <SocialAdminNav />

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_240px]">
          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Mã nạp, tên, email, mã ngân hàng..."
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
          />

          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value)
            }
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã cộng tiền</option>
            <option value="rejected">Từ chối</option>
          </select>
        </div>

        <div className="mt-5 text-sm font-semibold text-slate-500">
          <strong className="text-slate-950">
            {meta.total || 0}
          </strong>{' '}
          yêu cầu nạp tiền
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
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-4">Mã</th>
                  <th className="px-5 py-4">Khách hàng</th>
                  <th className="px-5 py-4">Số tiền</th>
                  <th className="px-5 py-4">Phương thức</th>
                  <th className="px-5 py-4">Nội dung CK</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-5 py-16 text-center text-slate-400"
                    >
                      Đang tải...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-5 py-16 text-center text-slate-400"
                    >
                      Chưa có yêu cầu nạp tiền.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const statusData =
                      statusMap[item.status] ||
                      [
                        item.status,
                        'bg-slate-100 text-slate-600',
                      ]

                    return (
                      <tr key={item.id}>
                        <td className="px-5 py-4 font-black">
                          {item.code}
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-bold">
                            {item.user?.name || '—'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {item.user?.email || ''}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-lg font-black text-blue-700">
                          {money(item.amount)}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold">
                          {item.method ===
                          'bank_transfer'
                            ? 'Chuyển khoản'
                            : 'Thủ công'}
                        </td>

                        <td className="px-5 py-4 text-sm">
                          {item.bank_reference ||
                            '—'}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-black ${statusData[1]}`}
                          >
                            {statusData[0]}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {item.status ===
                          'pending' ? (
                            <div className="flex justify-end gap-2">
                              <button
                                disabled={
                                  busyId ===
                                  item.id
                                }
                                onClick={() =>
                                  approve(item)
                                }
                                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40"
                              >
                                Duyệt
                              </button>

                              <button
                                disabled={
                                  busyId ===
                                  item.id
                                }
                                onClick={() =>
                                  reject(item)
                                }
                                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600 disabled:opacity-40"
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <div className="text-right text-xs font-semibold text-slate-400">
                              Đã xử lý
                            </div>
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
      </main>
    </div>
  )
}
