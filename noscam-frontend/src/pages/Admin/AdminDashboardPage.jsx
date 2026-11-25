// NOSCAM_OVERVIEW_SAFE_V2
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AdminNav from '../../components/admin/AdminNav'
import adminService from '../../services/adminService'
import chatService from '../../services/chatService'

const pad = (n) => String(n).padStart(2, '0')
const dateString = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const today = () => new Date()
const firstOfMonth = () => { const d = today(); return new Date(d.getFullYear(), d.getMonth(), 1) }
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ`
const number = (value) => Number(value || 0).toLocaleString('vi-VN')

function getRange(mode, date, month, year, from, to) {
  if (mode === 'day') return [date, date]
  if (mode === 'month') {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return ['', '']
    const [y, m] = month.split('-').map(Number)
    return [`${month}-01`, dateString(new Date(y, m, 0))]
  }
  if (mode === 'year') {
    if (!/^\d{4}$/.test(year)) return ['', '']
    return [`${year}-01-01`, `${year}-12-31`]
  }
  return [from, to]
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('month')
  const [date, setDate] = useState(dateString(today()))
  const [month, setMonth] = useState(dateString(today()).slice(0, 7))
  const [year, setYear] = useState(String(today().getFullYear()))
  const [from, setFrom] = useState(dateString(firstOfMonth()))
  const [to, setTo] = useState(dateString(today()))
  const [range, setRange] = useState(() => [dateString(firstOfMonth()), dateString(today())])
  const [rangeError, setRangeError] = useState('')
  const [unread, setUnread] = useState(null)

  useEffect(() => {
    let active = true
    let running = false

    async function refreshUnread() {
      if (running || document.visibilityState !== 'visible') return
      running = true
      try {
        const response = await chatService.admin.unreadCount()
        const value = (response?.data ?? response)?.unread_count
        if (active && value != null) setUnread(Number(value))
      } catch {
        // Keep last successful count.
      } finally {
        running = false
      }
    }

    refreshUnread()
    const timer = window.setInterval(refreshUnread, 15000)
    document.addEventListener('visibilitychange', refreshUnread)

    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshUnread)
    }
  }, [])

  function applyRange() {
    const [start, end] = getRange(mode, date, month, year, from, to)
    if (!start || !end || start > end) {
      setRangeError('Vui lòng chọn khoảng thời gian hợp lệ.')
      return
    }
    setRangeError('')
    setRange([start, end])
  }

  function quickRange(key) {
    const now = today()
    let start = new Date(now)
    if (key === '7') start.setDate(now.getDate() - 6)
    if (key === '30') start.setDate(now.getDate() - 29)
    if (key === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1)
    if (key === 'year') start = new Date(now.getFullYear(), 0, 1)
    const a = dateString(start)
    const b = dateString(now)
    setMode('range'); setFrom(a); setTo(b); setRangeError(''); setRange([a, b])
  }

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true); setError('')
      try {
        const response = await adminService.getDashboard({ from: range[0], to: range[1] })
        if (active) setData(response?.data ?? response ?? null)
      } catch (err) {
        if (!active) return
        if (err?.status === 401 || err?.status === 403) {
          await adminService.logout()
          navigate('/admin/login', { replace: true })
          return
        }
        setError(err?.message || 'Không tải được tổng quan.')
        setData(null)
      } finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [navigate, range])

  const finance = data?.finance ?? {}
  const operations = data?.operations ?? {}
  const providers = finance.providers ?? []

  const show = value =>
    loading || error || value == null ? '—' : number(value)

  const showMoney = value =>
    loading || error || value == null ? '—' : money(value)

  const op = key => operations[key]

  const sum = (...values) =>
    values.some(value => value == null)
      ? null
      : values.reduce((total, value) => total + Number(value), 0)

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700'

  const panel =
    'min-w-0 rounded-lg border border-slate-200 bg-white p-2'

  const workItems = [
    ['Đơn đang chờ / chạy', op('social_pending'), '/admin/social/orders'],
    ['Đơn lỗi', op('social_failed'), '/admin/social/orders'],
    ['Nạp tiền', op('topups_pending'), '/admin/finance'],
    ['Tin nhắn', unread, '/admin/chat'],
    ['Khiếu nại', op('exchange_disputes_open'), '/admin/exchange'],
    ['Chiến dịch tạm dừng', op('exchange_campaigns_paused'), '/admin/exchange'],
    ['Báo cáo', op('reports_pending'), '/admin/reports'],
    ['Bài viết', op('community_posts_pending'), '/admin/community'],
    ['Bình luận', op('community_comments_pending'), '/admin/community'],
    ['Dịch vụ số', op('digital_orders_pending'), '/admin/digital/orders'],
  ]

  const pendingItems = workItems.filter(([, count]) => Number(count) > 0)
  const unknownItems = workItems.some(([, count]) => count == null)

  const modules = [
    {
      title: 'Đơn hàng',
      to: '/admin/social/orders',
      symbol: '▤',
      rows: [
        ['Chờ / đang chạy', show(op('social_pending'))],
        ['Đơn lỗi', show(op('social_failed'))],
      ],
    },
    {
      title: 'Người dùng',
      to: '/admin/users',
      symbol: '♙',
      rows: [
        ['Thành viên', show(op('users_total'))],
      ],
    },
    {
      title: 'Tài chính',
      to: '/admin/finance',
      symbol: '₫',
      rows: [
        ['Nạp chờ xử lý', show(op('topups_pending'))],
      ],
    },
    {
      title: 'Tin nhắn',
      to: '/admin/chat',
      symbol: '✉',
      rows: [
        ['Hội thoại', show(op('chat_conversations_total'))],
        ['Chưa đọc', unread == null ? '—' : number(unread)],
      ],
    },
    {
      title: 'Tương tác chéo',
      to: '/admin/exchange',
      symbol: '⇄',
      rows: [
        ['Chiến dịch', show(op('exchange_campaigns_total'))],
        ['Khiếu nại', show(op('exchange_disputes_open'))],
        ['Tạm dừng', show(op('exchange_campaigns_paused'))],
      ],
    },
    {
      title: 'Dịch vụ số',
      to: '/admin/digital/orders',
      symbol: '▦',
      rows: [
        ['Tổng đơn', show(op('digital_orders_total'))],
        ['Cần theo dõi', show(op('digital_orders_pending'))],
      ],
    },
    {
      title: 'Báo cáo',
      to: '/admin/reports',
      symbol: '!',
      rows: [
        ['Tổng báo cáo', show(data?.reports?.total)],
        ['Chờ duyệt', show(op('reports_pending'))],
      ],
    },
    {
      title: 'Cộng đồng',
      to: '/admin/community',
      symbol: '◎',
      rows: [
        ['Bài viết', show(op('community_posts_total'))],
        ['Chờ duyệt', show(sum(
          op('community_posts_pending'),
          op('community_comments_pending')
        ))],
      ],
    },
    {
      title: 'Trung gian',
      to: '/admin/mediators',
      symbol: '◇',
      rows: [
        ['Tổng trung gian', show(op('mediators_total'))],
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />

      <main className="mx-auto max-w-7xl space-y-2 px-2 py-1.5 sm:px-4 lg:px-6">

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-base font-bold text-slate-950">
            Tổng quan
          </h1>

          <span className="text-xs text-slate-500">
            {range[0]} — {range[1]}
          </span>
        </div>

        <details className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
          <summary className="cursor-pointer text-xs font-bold text-blue-600">
            Bộ lọc thời gian
          </summary>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              ['today', 'Hôm nay'],
              ['7', '7 ngày'],
              ['30', '30 ngày'],
              ['month', 'Tháng này'],
              ['year', 'Năm nay'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => quickRange(key)}
                className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <select
              aria-label="Chế độ thời gian"
              value={mode}
              onChange={e => setMode(e.target.value)}
              className={inputClass}
            >
              <option value="day">Theo ngày</option>
              <option value="month">Theo tháng</option>
              <option value="year">Theo năm</option>
              <option value="range">Tùy chọn</option>
            </select>

            {mode === 'day' && (
              <input aria-label="Ngày" type="date" value={date}
                onChange={e => setDate(e.target.value)} className={inputClass} />
            )}

            {mode === 'month' && (
              <input aria-label="Tháng" type="month" value={month}
                onChange={e => setMonth(e.target.value)} className={inputClass} />
            )}

            {mode === 'year' && (
              <input aria-label="Năm" type="number" min="2000" max="2100"
                value={year} onChange={e => setYear(e.target.value)}
                className={inputClass} />
            )}

            {mode === 'range' && <>
              <input aria-label="Từ ngày" type="date" value={from}
                onChange={e => setFrom(e.target.value)} className={inputClass} />
              <input aria-label="Đến ngày" type="date" value={to}
                onChange={e => setTo(e.target.value)} className={inputClass} />
            </>}

            <button
              type="button"
              onClick={applyRange}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"
            >
              Áp dụng
            </button>
          </div>

          {rangeError && (
            <p className="mt-2 text-xs text-red-600">{rangeError}</p>
          )}
        </details>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <section className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
          {[
            ['Doanh thu', showMoney(finance.revenue), 'text-blue-700'],
            ['Giá vốn API', showMoney(finance.cost), 'text-orange-700'],
            ['Lợi nhuận gộp', showMoney(finance.profit),
              Number(finance.profit) < 0 ? 'text-red-700' : 'text-emerald-700'],
            ['Đơn hoàn thành / một phần', show(finance.orders), 'text-violet-700'],
          ].map(([label, value, color]) => (
            <div key={label} className={panel}>
              <div className="text-[11px] font-semibold text-slate-500">
                {label}
              </div>
              <div className={`mt-1 break-words text-sm font-bold tabular-nums sm:text-lg ${color}`}>
                {value}
              </div>
            </div>
          ))}
        </section>

        <section className={panel}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900">
              Việc cần theo dõi
            </h2>
            <span className="text-[10px] text-slate-400">Toàn hệ thống</span>
          </div>

          {loading || error ? (
            <p className="text-xs text-slate-500">
              {loading ? 'Đang tải...' : 'Chưa tải được dữ liệu'}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {pendingItems.map(([label, count, to]) => (
                  <Link
                    key={label}
                    to={to}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                  >
                    {label}
                    <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                      {number(count)}
                    </span>
                  </Link>
                ))}
              </div>

              {!pendingItems.length && !unknownItems && (
                <p className="text-xs font-semibold text-emerald-700">
                  Không có công việc thuộc các trạng thái đang theo dõi.
                </p>
              )}

              {unknownItems && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Một số bộ đếm chưa có dữ liệu.
                </p>
              )}
            </>
          )}
        </section>

        <section>
          <h2 className="mb-1 text-xs font-bold text-slate-900">
            Hoạt động website
          </h2>

          <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-5">
            {modules.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`${panel} transition hover:border-blue-300 hover:bg-blue-50/50`}
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="grid h-4 w-4 shrink-0 place-items-center text-xs font-bold text-blue-600">
                    {item.symbol}
                  </span>

                  <h3 className="min-w-0 flex-1 text-xs font-black text-slate-900">
                    {item.title}
                  </h3>

                  <span className="text-xs text-blue-500">→</span>
                </div>

                <div className="space-y-0.5">
                  {item.rows.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-slate-500">{label}</span>
                      <strong className="shrink-0 tabular-nums text-slate-900">
                        {value}
                      </strong>
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <details className={panel}>
          <summary className="cursor-pointer text-xs font-bold text-slate-900">
            Thu chi theo từng API
            <span className="ml-2 text-[10px] font-normal text-slate-400">
              {providers.length} nhà cung cấp
            </span>
          </summary>

          {loading || error ? (
            <p className="mt-2 text-xs text-slate-500">
              {loading ? 'Đang tải...' : 'Chưa tải được dữ liệu'}
            </p>
          ) : providers.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">Chưa có dữ liệu.</p>
          ) : (
            <div className="mt-2">

              <table className="hidden w-full text-left text-xs sm:table">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {['Nhà cung cấp', 'Đơn', 'Doanh thu', 'Giá vốn', 'Lợi nhuận'].map(label => (
                      <th key={label} className="px-2 py-1.5 font-semibold">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {providers.map(provider => {
                    const profit = Number(provider.revenue) - Number(provider.cost)

                    return (
                      <tr key={provider.id ?? 'unassigned'} className="border-b border-slate-100">
                        <td className="px-2 py-1.5 font-bold">{provider.name}</td>
                        <td className="px-2 py-1.5">{number(provider.orders)}</td>
                        <td className="px-2 py-1.5">{money(provider.revenue)}</td>
                        <td className="px-2 py-1.5">{money(provider.cost)}</td>
                        <td className={`px-2 py-1.5 font-bold ${profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                          {money(profit)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className="divide-y divide-slate-100 sm:hidden">
                {providers.map(provider => {
                  const profit = Number(provider.revenue) - Number(provider.cost)

                  return (
                    <div key={provider.id ?? 'unassigned'} className="py-2">
                      <div className="flex items-center justify-between text-xs">
                        <strong>{provider.name}</strong>
                        <span className="text-slate-500">{number(provider.orders)} đơn</span>
                      </div>
                      <div className="mt-1 grid grid-cols-3 gap-1 text-[10px]">
                        {[
                          ['Doanh thu', provider.revenue],
                          ['Giá vốn', provider.cost],
                          ['Lợi nhuận', profit],
                        ].map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <div className="text-slate-500">{label}</div>
                            <div className="break-words font-bold">{money(value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <p className="mt-2 text-[10px] leading-4 text-slate-400">
            Doanh thu sau hoàn tiền; chỉ tính đơn hoàn thành hoặc một phần
            theo ngày tạo. Lợi nhuận gộp chưa trừ chi phí vận hành.
          </p>
        </details>

      </main>
    </div>
  )
}
