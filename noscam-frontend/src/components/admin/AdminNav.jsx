import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import adminService from '../../services/adminService'
import chatService from '../../services/chatService'

const paths = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  orders: 'M4 7h16l-1 14H5L4 7z M8 8V6a4 4 0 0 1 8 0v2',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-4 M16 3a4 4 0 0 1 0 8',
  wallet: 'M20 8V5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16V8H4 M20 12h-6v5h6',
  chat: 'M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4z',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2c5 5 5 15 0 20 M12 2c-5 5-5 15 0 20',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  logout: 'M10 17l5-5-5-5 M15 12H3 M14 3h6v18h-6',
  chevron: 'M6 9l6 6 6-6',
  close: 'M6 6l12 12 M18 6L6 18',
}

function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}

const otherItems = [
  { to: '/admin/social', label: 'Tăng tương tác' },
  { to: '/admin/exchange', label: 'Tương tác chéo' },
  { to: '/admin/reports', label: 'Báo cáo' },
  { to: '/admin/community', label: 'Cộng đồng' },
  { to: '/admin/digital/orders', label: 'Đơn hàng dịch vụ số' },
  { to: '/admin/digital/services', label: 'Quản lý dịch vụ số' },
  { to: '/admin/mediators', label: 'Trung gian' },
  { to: '/admin/popups', label: 'Thông báo' },
  { to: '/admin/seasonal-theme', label: 'Giao diện lễ hội' },
  { to: '/admin/header', label: 'Quản lý Header' },
]

function Badge({ count }) {
  if (!(count > 0)) return null

  return (
    <span
      aria-label={`${count} mục cần xử lý`}
      className="inline-flex min-h-[17px] min-w-[17px] shrink-0 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black leading-none text-white shadow-sm"
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

function NavIcon({ name, count }) {
  return (
    <span className="relative inline-flex shrink-0">
      <Icon name={name} />
      {count > 0 && (
        <span className="absolute -right-2 -top-2">
          <Badge count={count} />
        </span>
      )}
    </span>
  )
}

const countValue = value =>
  Math.max(0, Math.floor(Number(value) || 0))

const navClass = (active) =>
  `flex min-w-0 min-h-14 flex-col items-center justify-center
   gap-1 rounded-xl px-1 py-2 text-[10px] font-bold
   transition sm:flex-row sm:gap-2 sm:px-4 sm:text-sm
   ${active
     ? 'bg-blue-50 text-blue-600'
     : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'}`

export default function AdminNav({ seasonalTheme = 'default' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const headerRef = useRef(null)
  const [openMenu, setOpenMenu] = useState(null)
  const [operations, setOperations] = useState({})
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let active = true
    let running = false

    async function refreshCounts() {
      if (!active || running || document.visibilityState !== 'visible') return

      running = true

      try {
        await Promise.allSettled([
          adminService.getDashboard().then(response => {
            const data = response?.data ?? response
            if (active && data?.operations) {
              setOperations(previous => {
                const next = { ...previous }
                for (const [key, value] of Object.entries(data.operations)) {
                  if (value != null) next[key] = value
                }
                return next
              })
            }
          }),
          chatService.admin.unreadCount().then(response => {
            const data = response?.data ?? response
            if (active && data?.unread_count != null) {
              setUnread(countValue(data.unread_count))
            }
          }),
        ])
      } finally {
        running = false
      }
    }

    refreshCounts()

    const timer = window.setInterval(refreshCounts, 15000)
    document.addEventListener('visibilitychange', refreshCounts)
    window.addEventListener('focus', refreshCounts)

    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshCounts)
      window.removeEventListener('focus', refreshCounts)
    }
  }, [location.key])

  const ordersCount =
    countValue(operations.social_pending) +
    countValue(operations.social_failed)

  const financeCount = countValue(operations.topups_pending)

  const otherCounts = {
    '/admin/exchange':
      countValue(operations.exchange_disputes_open) +
      countValue(operations.exchange_campaigns_paused),
    '/admin/reports':
      countValue(operations.reports_pending),
    '/admin/community':
      countValue(operations.community_posts_pending) +
      countValue(operations.community_comments_pending),
    '/admin/digital/orders':
      countValue(operations.digital_orders_pending),
  }

  const otherCount = Object.values(otherCounts)
    .reduce((sum, value) => sum + value, 0)

  const sortedOtherItems = [...otherItems].sort(
    (a, b) => Number((otherCounts[b.to] || 0) > 0) -
              Number((otherCounts[a.to] || 0) > 0)
  )

  useEffect(() => {
    setOpenMenu(null)
  }, [location.key])

  useEffect(() => {
    function handleOutside(event) {
      if (!headerRef.current?.contains(event.target)) {
        setOpenMenu(null)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') setOpenMenu(null)
    }

    document.addEventListener('pointerdown', handleOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handleOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  async function handleLogout() {
    try {
      await adminService.logout()
    } finally {
      navigate('/admin/login', { replace: true })
    }
  }

  function toggleMenu(name) {
    setOpenMenu(current => current === name ? null : name)
  }

  return (
    <header
      ref={headerRef}
      data-admin-season={seasonalTheme}
      className="noscam-admin-seasonal-nav sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl"
    >
      <div className="relative mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">

        <div className="flex h-16 items-center justify-between gap-2">
          <NavLink to="/admin" className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-600 font-black text-white">
              N
            </div>
            <div>
              <div className="text-sm font-black text-slate-950 sm:text-base">
                NoScam.vn
              </div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Admin Panel
              </div>
            </div>
          </NavLink>

          <div className="flex shrink-0 items-center gap-2">
            <a
              href="/"
              className="flex min-h-10 items-center gap-1.5 rounded-xl bg-blue-50 px-2.5 text-xs font-bold text-blue-600 transition hover:bg-blue-100 sm:px-4 sm:text-sm"
            >
              <Icon name="globe" className="h-4 w-4" />
              Xem website
            </a>

            <button
              type="button"
              onClick={() => toggleMenu('other')}
              aria-label="Menu quản trị"
              aria-expanded={openMenu === 'other'}
              aria-controls="admin-other-menu"
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <NavIcon
                name={openMenu === 'other' ? 'close' : 'menu'}
                count={otherCount}
              />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 lg:flex"
            >
              <Icon name="logout" className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </div>

        <nav
          aria-label="Điều hướng quản trị"
          className="grid grid-cols-5 gap-1 border-t border-slate-100 py-1.5 lg:grid-cols-6 lg:gap-2"
        >
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => navClass(isActive)}
          >
            <Icon name="dashboard" />
            <span className="whitespace-nowrap">Tổng quan</span>
          </NavLink>

          <NavLink
            to="/admin/social/orders"
            className={({ isActive }) => navClass(isActive)}
          >
            <NavIcon name="orders" count={ordersCount} />
            <span className="whitespace-nowrap">Đơn hàng</span>
          </NavLink>

          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              navClass(isActive || location.pathname === '/admin/social/customers')
            }
          >
            <Icon name="users" />
            <span className="whitespace-nowrap">Người dùng</span>
          </NavLink>

          <NavLink
            to="/admin/finance"
            className={({ isActive }) => navClass(isActive)}
          >
            <NavIcon name="wallet" count={financeCount} />
            <span className="whitespace-nowrap">Tài chính</span>
          </NavLink>

          <NavLink
            to="/admin/chat"
            className={({ isActive }) => navClass(isActive)}
          >
            <NavIcon name="chat" count={unread} />
            <span className="whitespace-nowrap">Tin nhắn</span>
          </NavLink>

          <button
            type="button"
            onClick={() => toggleMenu('other')}
            aria-expanded={openMenu === 'other'}
            aria-controls="admin-other-menu"
            className={`hidden lg:flex ${navClass(openMenu === 'other' || otherItems.some(item => location.pathname === item.to))}`}
          >
            <NavIcon name="menu" count={otherCount} />
            Khác
            <Icon name="chevron" className="h-3 w-3" />
          </button>
        </nav>

        {openMenu === 'other' && (
          <div
            id="admin-other-menu"
            className="absolute left-3 right-3 top-full mt-2 max-h-[65dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:left-auto sm:w-80"
          >
            <div className="px-2 pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Quản lý hệ thống
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {sortedOtherItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpenMenu(null)}
                  className={({ isActive }) =>
                    `flex items-center justify-between gap-2 rounded-xl px-3 py-3 text-xs font-bold transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                    }`
                  }
                >
                  <span className="min-w-0">{item.label}</span>
                  <Badge count={otherCounts[item.to]} />
                </NavLink>
              ))}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm font-bold text-red-600"
            >
              <Icon name="logout" className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
