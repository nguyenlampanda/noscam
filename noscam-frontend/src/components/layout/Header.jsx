import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import Container from './Container'

const navigation = [
  { name: 'Trang chủ', path: '/' },
  { name: 'Cảnh báo', path: '/alerts' },
  { name: 'Hướng dẫn', path: '/guide' },
  { name: 'Giới thiệu', path: '/about' },
]

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <header className="relative z-50 border-b border-slate-200 bg-white">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <NavLink
            to="/"
            onClick={closeMenu}
            className="text-xl font-bold tracking-tight text-slate-950"
          >
            NoScam<span className="text-blue-600">.vn</span>
          </NavLink>

          <nav className="hidden items-center gap-8 md:flex">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600'
                      : 'text-slate-600 hover:text-slate-950'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>

          <NavLink
            to="/report"
            className="hidden rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 md:inline-flex"
          >
            Báo cáo scam
          </NavLink>

          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-label={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={isMenuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 md:hidden"
          >
            {isMenuOpen ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {isMenuOpen && (
          <div className="border-t border-slate-200 pb-5 pt-3 md:hidden">
            <nav className="flex flex-col">
              {navigation.map((item) => {
                const isActive = location.pathname === item.path

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeMenu}
                    className={`rounded-lg px-3 py-3 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    {item.name}
                  </NavLink>
                )
              })}
            </nav>

            <NavLink
              to="/report"
              onClick={closeMenu}
              className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Báo cáo scam
            </NavLink>
          </div>
        )}
      </Container>
    </header>
  )
}

export default Header