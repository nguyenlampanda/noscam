// NOSCAM_OVERVIEW_SAFE_V2
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AdminNav from '../../components/admin/AdminNav'
import adminService from '../../services/adminService'

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
  const providers = finance.providers ?? []
  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800'
  const cardClass = 'rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm transition-shadow duration-200 hover:shadow-md shadow-slate-200/50'
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">NOSCAM.VN · ADMIN DASHBOARD</div>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Tổng quan</h1>
        <p className="mt-2 text-sm text-slate-500">Theo dõi kinh doanh và truy cập nhanh các khu vực quản trị của NoScam.vn.</p>
        <section className={`${cardClass} mt-7`}>
          <div className="flex flex-wrap gap-2">
            {[['today','Hôm nay'],['7','7 ngày qua'],['30','30 ngày qua'],['month','Tháng này'],['year','Năm nay']].map(([key,label]) => (
              <button key={key} type="button" onClick={() => quickRange(key)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-600">{label}</button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <label className="text-xs font-semibold text-slate-600">Chế độ
              <select value={mode} onChange={(e) => setMode(e.target.value)} className={`${inputClass} mt-1`}>
                <option value="day">Theo ngày</option><option value="month">Theo tháng</option><option value="year">Theo năm</option><option value="range">Từ ngày đến ngày</option>
              </select>
            </label>
            {mode === 'day' && <label className="text-xs font-semibold text-slate-600">Ngày<input className={`${inputClass} mt-1`} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>}
            {mode === 'month' && <label className="text-xs font-semibold text-slate-600">Tháng<input className={`${inputClass} mt-1`} type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>}
            {mode === 'year' && <label className="text-xs font-semibold text-slate-600">Năm<input className={`${inputClass} mt-1`} type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(e.target.value)} /></label>}
            {mode === 'range' && <>
              <label className="text-xs font-semibold text-slate-600">Từ ngày<input className={`${inputClass} mt-1`} type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
              <label className="text-xs font-semibold text-slate-600">Đến ngày<input className={`${inputClass} mt-1`} type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
            </>}
            <div className="flex items-end"><button type="button" onClick={applyRange} className="w-full rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Áp dụng</button></div>
          </div>
          {rangeError && <p className="mt-2 text-sm text-red-600">{rangeError}</p>}
          <p className="mt-3 text-xs text-slate-500">Đang xem: {range[0]} đến {range[1]} · Chỉ tính đơn hoàn thành / hoàn thành một phần theo ngày tạo đơn.</p>
        </section>
        {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {/* NOSCAM_REAL_OPERATIONS_V1 */}
        <section className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-blue-600">
                TRUNG TÂM ĐIỀU HÀNH
              </div>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Việc cần xử lý
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Công việc tồn đọng toàn hệ thống, không phụ thuộc bộ lọc doanh thu.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
              {loading ? 'Đang cập nhật' : 'Dữ liệu từ backend'}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ['Báo cáo chờ duyệt', 'reports_pending', '/admin/reports', 'CheckScam'],
              ['Đơn tương tác đang chờ', 'social_pending', '/admin/social/orders', 'Tăng tương tác'],
              ['Đơn tương tác lỗi', 'social_failed', '/admin/social/orders', 'Kiểm tra đơn lỗi'],
              ['Yêu cầu nạp tiền', 'topups_pending', '/admin/social/topups', 'Xác nhận thanh toán'],
              ['Khiếu nại tương tác chéo', 'exchange_disputes_open', '/admin/exchange', 'Giải quyết khiếu nại'],
              ['Bài viết chờ duyệt', 'community_posts_pending', '/admin/community', 'Kiểm duyệt cộng đồng'],
              ['Bình luận chờ duyệt', 'community_comments_pending', '/admin/community', 'Kiểm duyệt bình luận'],
              ['Đơn dịch vụ số cần theo dõi', 'digital_orders_pending', '/admin/digital/orders', 'Đang chờ hoặc xử lý'],
              ['Chiến dịch tương tác chéo tạm dừng', 'exchange_campaigns_paused', '/admin/exchange', 'Kiểm tra chiến dịch'],
            ].map(([title, key, url, description]) => {
              const value = data?.operations?.[key]
              const available = !loading && !error && value !== null && value !== undefined
              const count = available ? Number(value) : null
              const hasWork = count !== null && count > 0

              return (
                <Link
                  key={key}
                  to={url}
                  className={`group rounded-2xl border bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    hasWork ? 'border-amber-200' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900">
                        {title}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {description}
                      </div>
                    </div>
                    <div className={`shrink-0 rounded-xl px-3 py-2 text-xl font-black ${
                      hasWork
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {count === null ? '—' : number(count)}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className={`text-xs font-bold ${
                      hasWork ? 'text-amber-700' : 'text-slate-500'
                    }`}>
                      {count === null
                        ? 'Chưa có dữ liệu'
                        : hasWork
                          ? 'Có công việc cần kiểm tra'
                          : 'Không có mục thuộc trạng thái đang theo dõi'}
                    </span>
                    <span className="text-xs font-bold text-blue-600">
                      Xử lý →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="mt-7">
          <h2 className="mb-4 text-xl font-black text-slate-950">
            Quy mô hoạt động website
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              ['Người dùng', 'users_total'],
              ['Chiến dịch tương tác chéo', 'exchange_campaigns_total'],
              ['Đơn dịch vụ số', 'digital_orders_total'],
              ['Trung gian', 'mediators_total'],
              ['Hội thoại', 'chat_conversations_total'],
              ['Bài viết cộng đồng', 'community_posts_total'],
            ].map(([title, key]) => {
              const value = data?.operations?.[key]
              return (
                <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500">
                    {title}
                  </div>
                  <div className="mt-3 text-2xl font-black text-slate-950">
                    {loading || error || value == null ? '—' : number(value)}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Số liệu quy mô là tổng bản ghi. Các hàng đợi chỉ tính những trạng thái
            đã xác định; chưa phải hệ thống cảnh báo quá hạn hoặc giám sát sức khỏe API.
          </p>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Doanh thu', money(finance.revenue)],
            ['Chi phí API', money(finance.cost)],
            ['Lợi nhuận gộp', money(finance.profit)],
            ['Đơn hoàn thành', number(finance.orders)],
          ].map(([label,value]) => <div key={label} className={cardClass}><div className="text-sm font-semibold text-slate-500">{label}</div><div className="mt-3 break-words text-2xl font-black text-slate-950">{loading ? '—' : value}</div></div>)}
        </div>
        
        {/* NOSCAM_SITE_OVERVIEW_V2 */}
        <section className="mt-7">
          <div className="mb-4">
            <div className="text-xs font-black uppercase tracking-widest text-blue-600">
              TRUNG TÂM ĐIỀU HÀNH
            </div>
            <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
              Quản trị toàn website
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Truy cập nhanh các chức năng của NoScam.vn.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
            {[
              {title: 'Tăng tương tác', to: '/admin/social', description: 'Đơn hàng và nhà cung cấp', symbol: '↗', tone: 'bg-blue-50 text-blue-700'},
              {title: 'Tương tác chéo', to: '/admin/exchange', description: 'Chiến dịch miễn phí', symbol: '⇄', tone: 'bg-indigo-50 text-indigo-700'},
              {title: 'Báo cáo', to: '/admin/reports', description: 'Kiểm duyệt và rủi ro', symbol: '!', tone: 'bg-rose-50 text-rose-700'},
              {title: 'Cộng đồng', to: '/admin/community', description: 'Nội dung cộng đồng', symbol: '◎', tone: 'bg-violet-50 text-violet-700'},
              {title: 'Dịch vụ số', to: '/admin/digital/services', description: 'Sản phẩm và dịch vụ', symbol: '▦', tone: 'bg-cyan-50 text-cyan-700'},
              {title: 'Người dùng', to: '/admin/users', description: 'Quản lý thành viên', symbol: '♙', tone: 'bg-emerald-50 text-emerald-700'},
              {title: 'Tin nhắn', to: '/admin/chat', description: 'Hỗ trợ khách hàng', symbol: '✉', tone: 'bg-sky-50 text-sky-700'},
              {title: 'Trung gian', to: '/admin/mediators', description: 'Quản lý giao dịch', symbol: '◇', tone: 'bg-amber-50 text-amber-700'},
              {title: 'Thông báo', to: '/admin/popups', description: 'Popup và thông báo', symbol: '♧', tone: 'bg-orange-50 text-orange-700'},
              {title: 'Quản lý Header', to: '/admin/header', description: 'Giao diện điều hướng', symbol: '☷', tone: 'bg-slate-100 text-slate-700'},
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg sm:p-4"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl font-black ${item.tone}`}>
                  {item.symbol}
                </div>

                <h3 className="mt-3 text-sm font-extrabold text-slate-900 group-hover:text-blue-600">
                  {item.title}
                </h3>

                <p className="mt-1 flex-1 text-xs leading-5 text-slate-500">
                  {item.description}
                </p>

                <div className="mt-3 border-t border-slate-100 pt-2 text-xs font-bold text-blue-600">
                  Mở quản lý →
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950">Thu chi theo từng API</h2>
              <p className="mt-1 text-sm text-slate-500">Doanh thu, giá vốn và lợi nhuận của từng nhà cung cấp trong khoảng thời gian đã chọn.</p>
            </div>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{loading ? 'Đang tải' : `${providers.length} nhà cung cấp`}</span>
          </div>
          {loading ? <div className={cardClass}><p className="text-sm text-slate-500">Đang tải số liệu...</p></div> : providers.length === 0 ? <div className={cardClass}><p className="text-sm text-slate-500">Chưa có dữ liệu API trong kỳ.</p></div> : (
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {providers.map((provider) => {
                const profit = Number(provider.revenue || 0) - Number(provider.cost || 0)
                return (
                  <article key={provider.id ?? 'unassigned'} className={`${cardClass} transition-shadow hover:shadow-md`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-black text-slate-950">{provider.name}</h3>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{number(provider.orders)} đơn</span>
                    </div>
                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-blue-50/70 p-4"><div className="text-xs font-semibold text-blue-700">Doanh thu</div><div className="mt-2 break-words text-xl font-black text-slate-950">{money(provider.revenue)}</div></div>
                      <div className="rounded-2xl bg-orange-50/70 p-4"><div className="text-xs font-semibold text-orange-700">Chi phí API</div><div className="mt-2 break-words text-xl font-black text-slate-950">{money(provider.cost)}</div></div>
                      <div className="rounded-2xl bg-emerald-50/70 p-4"><div className="text-xs font-semibold text-emerald-700">Lợi nhuận gộp</div><div className={`mt-2 break-words text-xl font-black ${profit < 0 ? 'text-red-700' : 'text-emerald-800'}`}>{money(profit)}</div></div>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-4 text-xs text-slate-500"><span>Tỷ trọng chi phí API</span><span className="font-bold text-slate-700">{Number(finance.cost || 0) > 0 ? `${(Number(provider.cost || 0) / Number(finance.cost) * 100).toFixed(1)}%` : '0%'}</span></div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${Math.max(0, Math.min(100, Number(finance.cost || 0) > 0 ? Number(provider.cost || 0) / Number(finance.cost) * 100 : 0))}%` }} /></div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
        <div className="mt-5 grid gap-5 lg:grid-cols-1">
          <section className={cardClass}>
            <h2 className="text-lg font-black text-slate-950">Trạng thái đơn hàng</h2>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">Đơn hoàn thành / một phần</span><strong>{loading ? '—' : number(finance.orders)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-600">Đơn đang chờ xử lý / đối soát</span><strong>{loading ? '—' : number(finance.pending_orders)}</strong></div>
              <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Chi phí API là giá vốn ghi nhận trên đơn, không phải tổng tiền đã nạp API. Lợi nhuận là ước tính gộp, chưa trừ chi phí vận hành.</p>
              <Link to="/admin/social" className="inline-block font-bold text-blue-600">Quản lý tăng tương tác →</Link>
            </div>
          </section>
        </div>

      </main>
    </div>
  )
}
