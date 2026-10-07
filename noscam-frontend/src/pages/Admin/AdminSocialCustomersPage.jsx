import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import AdminNav from '../../components/admin/AdminNav'
import SocialAdminNav from '../../components/admin/social/SocialAdminNav'
import adminService from '../../services/adminService'

function money(value) {
  return `${Math.round(
    Number(value || 0),
  ).toLocaleString('vi-VN')}đ`
}

function dateTime(value) {
  if (!value) return '—'

  return new Date(value).toLocaleString(
    'vi-VN',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  )
}

export default function AdminSocialCustomersPage() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({})
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] =
    useState(false)

  const [direction, setDirection] =
    useState('credit')

  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response =
        await adminService.getSocialCustomers({
          search,
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
          'Không tải được khách hàng.',
      )
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    const timer = setTimeout(load, 250)

    return () =>
      clearTimeout(timer)
  }, [load])

  async function openCustomer(user) {
    setSelected(user)
    setDetail(null)
    setDetailLoading(true)
    setError('')
    setSuccess('')
    setAmount('')
    setNote('')
    setDirection('credit')

    try {
      const response =
        await adminService.getSocialCustomer(
          user.id,
        )

      setDetail(
        response?.data?.data ||
          response?.data ||
          null,
      )
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.message ||
          'Không tải được thông tin khách hàng.',
      )
    } finally {
      setDetailLoading(false)
    }
  }

  function requestAdjustWallet(e) {
    e.preventDefault()

    const value = Number(amount)

    if (!value || value <= 0) {
      setError(
        'Vui lòng nhập số tiền hợp lệ.',
      )
      return
    }

    setError('')
    setSuccess('')
    setConfirmOpen(true)
  }

  function closeConfirm() {
    if (busy) return
    setConfirmOpen(false)
  }

  async function confirmAdjustWallet() {
    const value = Number(amount)

    if (!selected?.id || !value || value <= 0) {
      setConfirmOpen(false)
      return
    }

    setBusy(true)
    setError('')
    setSuccess('')

    try {
      const response =
        await adminService
          .adjustSocialCustomerWallet(
            selected.id,
            {
              direction,
              amount: value,
              note: note.trim(),
            },
          )

      setSuccess(
        response?.message ||
          'Đã cập nhật ví.',
      )

      setConfirmOpen(false)
      setAmount('')
      setNote('')

      await openCustomer(selected)
      await load()
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.message ||
          'Không cập nhật được ví.',
      )

      setConfirmOpen(false)
    } finally {
      setBusy(false)
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
            Khách hàng
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Quản lý tài khoản, số dư ví và lịch sử giao dịch.
          </p>
        </div>

        <SocialAdminNav />

        <div className="mt-6">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Tìm username, tên hoặc email..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            ✓ {success}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-500">
            <strong className="text-slate-950">
              {meta.total || 0}
            </strong>{' '}
            khách hàng
          </div>

          <div className="text-sm font-semibold text-slate-400">
            Trang {meta.current_page || 1} /{' '}
            {meta.last_page || 1}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-4">
                    Khách hàng
                  </th>
                  <th className="px-5 py-4">
                    Số dư
                  </th>
                  <th className="px-5 py-4">
                    Tổng nạp
                  </th>
                  <th className="px-5 py-4">
                    Tổng chi
                  </th>
                  <th className="px-5 py-4">
                    Hoàn tiền
                  </th>
                  <th className="px-5 py-4">
                    Đơn hàng
                  </th>
                  <th className="px-5 py-4 text-right">
                    Quản lý
                  </th>
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
                      Chưa có khách hàng.
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
                          @{item.username || '—'}
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          {item.name || '—'}
                          {item.email
                            ? ` • ${item.email}`
                            : ''}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-lg font-black text-blue-600">
                        {money(
                          item.wallet?.balance,
                        )}
                      </td>

                      <td className="px-5 py-4 font-bold text-emerald-600">
                        {money(
                          item.wallet
                            ?.total_deposited,
                        )}
                      </td>

                      <td className="px-5 py-4 font-bold text-slate-700">
                        {money(
                          item.wallet
                            ?.total_spent,
                        )}
                      </td>

                      <td className="px-5 py-4 font-bold text-violet-600">
                        {money(
                          item.wallet
                            ?.total_refunded,
                        )}
                      </td>

                      <td className="px-5 py-4 font-black">
                        {Number(
                          item.social_orders_count ||
                            0,
                        ).toLocaleString(
                          'vi-VN',
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            openCustomer(item)
                          }
                          className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-600 transition hover:border-blue-600 hover:bg-blue-600 hover:text-white!"
                        >
                          Quản lý
                        </button>
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

        {selected && !confirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (
                e.target === e.currentTarget
              ) {
                setSelected(null)
                setDetail(null)
              }
            }}
          >
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-slate-100 p-6">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-blue-600">
                    Khách hàng
                  </div>

                  <div className="mt-1 text-2xl font-black">
                    @{selected.username}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelected(null)
                    setDetail(null)
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-black text-slate-500"
                >
                  ×
                </button>
              </div>

              {detailLoading ? (
                <div className="p-14 text-center text-slate-400">
                  Đang tải...
                </div>
              ) : (
                <div className="p-6">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-blue-50 p-4">
                      <div className="text-xs font-black uppercase text-blue-400">
                        Số dư
                      </div>
                      <div className="mt-1 text-xl font-black text-blue-700">
                        {money(
                          detail?.user
                            ?.wallet
                            ?.balance,
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <div className="text-xs font-black uppercase text-emerald-500">
                        Tổng nạp
                      </div>
                      <div className="mt-1 text-xl font-black text-emerald-700">
                        {money(
                          detail?.user
                            ?.wallet
                            ?.total_deposited,
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-100 p-4">
                      <div className="text-xs font-black uppercase text-slate-400">
                        Tổng chi
                      </div>
                      <div className="mt-1 text-xl font-black text-slate-800">
                        {money(
                          detail?.user
                            ?.wallet
                            ?.total_spent,
                        )}
                      </div>
                    </div>
                  </div>

                  <form
                    onSubmit={requestAdjustWallet}
                    className="mt-5 rounded-3xl border border-slate-200 p-5"
                  >
                    <div className="font-black text-slate-950">
                      Điều chỉnh số dư
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDirection(
                            'credit',
                          )
                        }
                        className={`rounded-2xl border p-3 font-black ${
                          direction ===
                          'credit'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        + Cộng tiền
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setDirection(
                            'debit',
                          )
                        }
                        className={`rounded-2xl border p-3 font-black ${
                          direction ===
                          'debit'
                            ? 'border-red-500 bg-red-50 text-red-600'
                            : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        − Trừ tiền
                      </button>
                    </div>

                    <div className="mt-3">
                      <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                        Số tiền
                      </label>

                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={
                            amount
                              ? Number(amount).toLocaleString('vi-VN')
                              : ''
                          }
                          onChange={(e) => {
                            const raw =
                              e.target.value.replace(/\D/g, '')

                            setAmount(raw)
                          }}
                          placeholder="0"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-14 text-lg font-black text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                        />

                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                          đ
                        </span>
                      </div>

                      {amount && (
                        <div className="mt-2 text-xs font-bold text-blue-600">
                          {money(amount)}
                        </div>
                      )}
                    </div>

                    <input
                      value={note}
                      onChange={(e) =>
                        setNote(
                          e.target.value,
                        )
                      }
                      placeholder="Ghi chú..."
                      className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
                    />

                    <button
                      disabled={busy}
                      className={`mt-3 w-full rounded-2xl px-5 py-3 font-black text-white disabled:opacity-50 ${
                        direction ===
                        'credit'
                          ? 'bg-emerald-600'
                          : 'bg-red-600'
                      }`}
                    >
                      {busy
                        ? 'Đang xử lý...'
                        : direction ===
                            'credit'
                          ? 'Cộng tiền vào ví'
                          : 'Trừ tiền khỏi ví'}
                    </button>
                  </form>

                  <div className="mt-6">
                    <div className="font-black text-slate-950">
                      Giao dịch gần đây
                    </div>

                    <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                      {detail?.transactions
                        ?.length ? (
                        detail.transactions.map(
                          (tx) => (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between gap-4 p-4"
                            >
                              <div>
                                <div className="text-sm font-bold text-slate-800">
                                  {tx.description ||
                                    tx.code}
                                </div>

                                <div className="mt-1 text-xs text-slate-400">
                                  {dateTime(
                                    tx.created_at,
                                  )}
                                </div>
                              </div>

                              <div
                                className={`font-black ${
                                  tx.direction ===
                                  'credit'
                                    ? 'text-emerald-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {tx.direction ===
                                'credit'
                                  ? '+'
                                  : '−'}
                                {money(
                                  tx.amount,
                                )}
                              </div>
                            </div>
                          ),
                        )
                      ) : (
                        <div className="p-5 text-center text-sm text-slate-400">
                          Chưa có giao dịch.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
        {confirmOpen &&
          selected &&
          createPortal(
            <div
              className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/60 p-4"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  closeConfirm()
                }
              }}
            >
              <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black ${
                    direction === 'credit'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  {direction === 'credit' ? '+' : '−'}
                </div>

                <h2 className="mt-5 text-2xl font-black text-slate-950">
                  {direction === 'credit'
                    ? 'Xác nhận cộng tiền'
                    : 'Xác nhận trừ tiền'}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Kiểm tra lại thông tin trước khi cập nhật số dư ví.
                </p>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-400">
                      Khách hàng
                    </span>

                    <span className="font-black text-slate-900">
                      @{selected.username}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-400">
                      Thao tác
                    </span>

                    <span
                      className={`font-black ${
                        direction === 'credit'
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {direction === 'credit'
                        ? 'Cộng tiền'
                        : 'Trừ tiền'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 px-4 py-4">
                    <span className="text-sm font-semibold text-slate-400">
                      Số tiền
                    </span>

                    <span
                      className={`text-2xl font-black ${
                        direction === 'credit'
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {direction === 'credit' ? '+' : '−'}
                      {money(amount)}
                    </span>
                  </div>
                </div>

                {note.trim() && (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-black uppercase text-slate-400">
                      Ghi chú
                    </div>

                    <div className="mt-1 text-sm font-semibold text-slate-700">
                      {note}
                    </div>
                  </div>
                )}

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={closeConfirm}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Quay lại
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={confirmAdjustWallet}
                    className={`rounded-2xl px-4 py-3 font-black text-white shadow-sm transition disabled:opacity-50 ${
                      direction === 'credit'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {busy
                      ? 'Đang xử lý...'
                      : 'Xác nhận'}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </main>
    </div>
  )
}
