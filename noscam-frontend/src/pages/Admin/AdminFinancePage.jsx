import './AdminFinance.css'
import AdminNav from '../../components/admin/AdminNav'
import { useEffect, useState } from 'react'
import { adminService } from '../../services/adminService'
import AdminTopupPromotions from './AdminTopupPromotions'

const money = (value) =>
  Number(value ?? 0).toLocaleString('vi-VN', {
    maximumFractionDigits: 2,
  }) + ' đ'

const today = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const get = (key) => parts.find((p) => p.type === key)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

function Stat({ title, value, note, tone = "blue" }) {
  return (
    <section className={`finance-stat finance-stat--${tone} rounded-2xl border bg-white p-5`}>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 break-words text-xl font-bold text-slate-900">
        {value}
      </p>
      {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}
    </section>
  )
}


// NOSCAM_MANUAL_CREDIT_FINANCE_V1
function ManualWalletCredit() {
  const [username, setUsername] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()

    const name = username.trim()
    const value = Number(amount)

    if (!/^[A-Za-z0-9_.-]{1,50}$/.test(name)) {
      setError('Username không hợp lệ.')
      return
    }

    if (!Number.isInteger(value) || value < 1000) {
      setError('Số tiền phải là số nguyên từ 1.000đ.')
      return
    }

    if (!window.confirm(
      `Đã kiểm tra tiền thực nhận? Xác nhận cộng ${money(value)} vào ví @${name}?`
    )) return

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await adminService.manualCreditSocialWallet({
        username: name,
        amount: value,
        note: note.trim()
      })

      setMessage(`Đã cộng ${money(value)} vào ví @${name}.`)
      setUsername('')
      setAmount('')
      setNote('')
    } catch (err) {
      setError(
        err?.data?.message ||
        err?.message ||
        'Không thể cộng tiền.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-950">
        Cộng tiền thủ công
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Chỉ cộng sau khi đã kiểm tra giao dịch thực nhận trong tài khoản ngân hàng.
      </p>

      <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">
          Username
          <input
            required
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Ví dụ: test1"
            className="mt-2 w-full rounded-xl border border-slate-200 p-3"
          />
        </label>

        <label className="text-sm font-semibold">
          Số tiền (VND)
          <input
            required
            type="number"
            min="1000"
            step="1"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 p-3"
          />
        </label>

        <label className="text-sm font-semibold md:col-span-2">
          Ghi chú đối soát
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Mã giao dịch ngân hàng, thời gian nhận tiền..."
            className="mt-2 w-full rounded-xl border border-slate-200 p-3"
            rows={2}
          />
        </label>

        <div className="md:col-span-2">
          {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
          {message && <p role="status" className="mb-3 text-sm text-emerald-700">{message}</p>}
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            {busy ? 'Đang xử lý...' : 'Xác nhận cộng tiền'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default function AdminFinancePage() {
  const current = today()
  const [from, setFrom] = useState(`${current.slice(0, 7)}-01`)
  const [to, setTo] = useState(current)
  const [data, setData] = useState(null)
  const [topupsPage, setTopupsPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setData(null)

    adminService.getFinanceSummary({ from, to, topups_page: topupsPage })
      .then((response) => {
        if (active) setData(response?.data?.data ?? response?.data ?? null)
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Không tải được tài chính.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [from, to, topupsPage])

  const wallet = data?.wallet
  const topups = data?.topups
  const sales = data?.social_orders
  const recentTopups = data?.recent_topups ?? []
  const topupsPagination = data?.recent_topups_pagination
  const totalTopups = topupsPagination?.total ?? recentTopups.length
  const lastTopupsPage = Math.max(1, topupsPagination?.last_page ?? 1)
  const [selectedTopup, setSelectedTopup] = useState(null)

  return (
    <div className="noscam-finance flex min-h-screen flex-col bg-white text-slate-900">
      <AdminNav />
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 lg:px-8">
      <div className="mb-7">
        <h1 className="text-3xl font-black text-slate-950">Tài chính</h1>
        <p className="mt-2 text-sm text-slate-500">
          Thống kê tiền ví và hoạt động kinh doanh NoScam.vn
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-600">
          Từ ngày
          <input type="date" value={from} max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 p-2" />
        </label>
        <label className="text-sm text-slate-600">
          Đến ngày
          <input type="date" value={to} min={from}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 p-2" />
        </label>
      </div>

      {loading && <p className="text-sm text-slate-500">Đang tải số liệu...</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {data && !loading && (
        <div className="space-y-10">
          <section className="finance-recent" aria-labelledby="recent-topups-title">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id="recent-topups-title" className="text-lg font-bold">Nạp tiền gần nhất</h2>
                <p className="mt-1 text-xs text-slate-500">10 giao dịch mỗi trang · Không phụ thuộc bộ lọc ngày</p>
              </div>
              <span className="finance-live-label">Dữ liệu từ máy chủ</span>
            </div>
            {recentTopups.length === 0 ? (
              <div className="finance-empty">Chưa có yêu cầu nạp tiền.</div>
            ) : (
              <div className="finance-recent-list">
                {recentTopups.map((item) => (
                  <button key={item.id} type="button" className="finance-recent-item" onClick={() => setSelectedTopup(item)}>
                    <span className="finance-recent-avatar">{(item.username || item.name || '?').slice(0, 1).toUpperCase()}</span>
                    <span className="finance-recent-person">
                      <strong>{item.username ? `@${item.username}` : item.name || `Khách #${item.user_id}`}</strong>
                      <small>{item.code} · {new Date(item.created_at).toLocaleString('vi-VN')}</small>
                    </span>
                    <span className="finance-recent-right">
                      <strong>{money(item.amount)}</strong>
                      <small className={`finance-status finance-status--${item.status}`}>{({ approved: 'Đã duyệt', pending: 'Chờ xử lý', rejected: 'Từ chối' })[item.status] || item.status}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {topupsPagination && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <span className="text-sm text-slate-600">
                  Tổng {totalTopups.toLocaleString('vi-VN')} giao dịch · Trang {topupsPage}/{lastTopupsPage}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={topupsPage <= 1}
                    onClick={() => setTopupsPage((page) => Math.max(1, page - 1))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trước
                  </button>
                  {Array.from({ length: Math.min(5, lastTopupsPage) }, (_, i) => {
                    const start = Math.max(1, Math.min(topupsPage - 2, lastTopupsPage - 4))
                    const page = start + i
                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setTopupsPage(page)}
                        aria-current={page === topupsPage ? 'page' : undefined}
                        className={`min-w-9 rounded-lg border px-3 py-2 text-sm font-medium ${
                          page === topupsPage
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    disabled={topupsPage >= lastTopupsPage}
                    onClick={() => setTopupsPage((page) => Math.min(lastTopupsPage, page + 1))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Tiếp
                  </button>
                </div>
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-4 text-lg font-bold tracking-tight text-slate-900">Dòng tiền ví</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Stat tone="green" title="Tiền cộng nạp ví" value={money(wallet?.deposits)}
                note="Giao dịch ví loại deposit, chưa xác minh nguồn ngân hàng" />
              <Stat tone="blue" title="Tiền trừ thanh toán" value={money(wallet?.order_debits)} />
              <Stat tone="teal" title="Tiền hoàn khách hàng" value={money(wallet?.refunds)} />
              <Stat tone="purple" title="Điều chỉnh cộng" value={money(wallet?.adjustment_credits)} />
              <Stat tone="rose" title="Điều chỉnh trừ" value={money(wallet?.adjustment_debits)} />
              <Stat tone="indigo" title="Tổng số dư ví hiện tại"
                value={money(wallet?.total_customer_balance)}
                note="Số dư toàn hệ thống, không phụ thuộc bộ lọc ngày" />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold tracking-tight text-slate-900">Yêu cầu nạp tiền</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Stat tone="green" title="Chuyển khoản đã duyệt" value={money(topups?.approved_bank_transfer)}
                note="Theo ngày tạo yêu cầu, không phải ngày tiền về" />
              <Stat tone="blue" title="Nạp thủ công đã duyệt" value={money(topups?.approved_manual)} />
              <Stat tone="amber" title="Yêu cầu đang chờ" value={topups?.pending_count ?? 0}
                note="Tổng đang chờ toàn hệ thống" />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold tracking-tight text-slate-900">Kinh doanh tăng tương tác</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Stat tone="indigo" title="Đơn hoàn tất / một phần" value={sales?.settled_count ?? 0} />
              <Stat tone="green" title="Doanh thu gộp" value={money(sales?.gross_sales)} />
              <Stat tone="rose" title="Tiền hoàn trên các đơn" value={money(sales?.refunded_amount)} />
              <Stat tone="teal" title="Doanh thu sau hoàn" value={money(sales?.net_sales)} />
              <Stat tone="purple" title="Giá vốn đang lưu" value={money(sales?.recorded_cost)}
                note="Chưa xác minh chi phí thực trả nhà cung cấp" />
              <Stat tone="amber" title="Lợi nhuận gộp ước tính"
                value={money(sales?.estimated_gross_profit)}
                note="Chưa gồm dịch vụ số, khuyến mãi và phí giao dịch" />
            </div>
          </section>

          <ManualWalletCredit />
            <AdminTopupPromotions />

          <p className="text-xs leading-6 text-slate-500">
            Các chỉ số theo kỳ dùng ngày phát sinh giao dịch ví hoặc ngày tạo đơn.
            Tiền nạp ví không phải doanh thu. Lợi nhuận hiển thị là ước tính,
            chưa phải lợi nhuận ròng đã đối soát.
          </p>
        </div>
      )}
      </main>

      {selectedTopup && (
        <div className="finance-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTopup(null) }}>
          <section role="dialog" aria-modal="true" aria-label="Chi tiết nạp tiền" className="finance-modal">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Chi tiết nạp tiền</h2>
              <button type="button" className="finance-modal-close" onClick={() => setSelectedTopup(null)} aria-label="Đóng">✕</button>
            </div>
            <dl className="finance-detail-list">
              {[
                ['Mã yêu cầu', selectedTopup.code],
                ['Tài khoản', selectedTopup.username ? `@${selectedTopup.username}` : selectedTopup.name || `#${selectedTopup.user_id}`],
                ['Số tiền', money(selectedTopup.amount)],
                ['Trạng thái', ({ approved: 'Đã duyệt', pending: 'Chờ xử lý', rejected: 'Từ chối' })[selectedTopup.status] || selectedTopup.status],
                ['Phương thức', selectedTopup.method],
                ['Thời gian tạo', new Date(selectedTopup.created_at).toLocaleString('vi-VN')],
                ['Mã ngân hàng', selectedTopup.bank_reference || '—'],
              ].map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-slate-500">Đây là thông tin tra cứu, không phải thao tác duyệt hoặc cộng tiền.</p>
            <button type="button" className="finance-modal-done" onClick={() => setSelectedTopup(null)}>Đóng</button>
          </section>
        </div>
      )}

      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>NoScam.vn · Quản trị tài chính</span>
          <span>Số liệu nội bộ · Chỉ dành cho người có quyền truy cập</span>
        </div>
      </footer>
    </div>
  )
}
