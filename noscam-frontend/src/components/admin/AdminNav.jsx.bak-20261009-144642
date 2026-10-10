import {
  NavLink,
  useNavigate,
} from 'react-router-dom'

import adminService from '../../services/adminService'

const menu = [
  {
    to: '/admin',
    label: 'Tổng quan',
    end: true,
  },
  {
    to: '/admin/reports',
    label: 'Báo cáo',
  },
  {
    to: '/admin/mediators',
    label: 'Trung gian',
  },
  {
    to: '/admin/social',
    label: 'Tăng tương tác',
  },
]

export default function AdminNav() {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await adminService.logout()
    } finally {
      navigate('/admin/login', {
        replace: true,
      })
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-5">
          <NavLink
            to="/admin"
            className="flex items-center gap-3"
          >
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 font-black text-white">
              N
            </div>

            <div>
              <div className="font-black text-slate-950">
                NoScam.vn
              </div>

              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Moderation Panel
              </div>
            </div>
          </NavLink>

          <div className="flex items-center gap-2">
            <a
              href="/"
              className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:block"
            >
              Xem website
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Đăng xuất
            </button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto">
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative shrink-0 px-4 py-3 text-sm font-bold ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-slate-500 hover:text-slate-950'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}

                  {isActive && (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-blue-600" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
