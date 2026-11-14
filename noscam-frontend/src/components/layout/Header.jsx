import { showAuthSuccess } from './AuthSuccessPopup'
import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  AnimatePresence,
  motion,
} from 'motion/react'
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import customerService, {
  getCustomerToken,
} from '../../services/customerService'
import Container from './Container'

const defaultNavigation = [
{
    name: 'Tăng tương tác',
    path: '/',
  },
{
    name: 'Dịch vụ số',
    path: '/digital-services',
  },
{
    name: 'Tương tác chéo',
    path: '/exchange',
  },
{
    name: 'Kiểm tra lừa đảo',
    path: '/search',
  },
{
    name: 'Cảnh báo',
    path: '/alerts',
  },
{
    name: 'Cộng đồng',
    path: '/community',
  },
{
    name: 'Trung gian',
    path: '/mediators',
  },
{
    name: 'Hướng dẫn',
    path: '/guide',
  }
]

function money(value) {
  return `${Math.round(
    Number(value || 0),
  ).toLocaleString('vi-VN')}đ`
}

function Header() {
  // NOSCAM_HEADER_MANAGER_V1
  const [navigation, setNavigation] = useState(defaultNavigation)

  useEffect(() => {
    const controller = new AbortController()

    fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'}/header-settings`,
      { signal: controller.signal, headers: { Accept: 'application/json' } }
    )
      .then(response => {
        if (!response.ok) throw new Error('Header settings unavailable')
        return response.json()
      })
      .then(response => {
        if (!Array.isArray(response?.data)) return
        const allowed = new Map(defaultNavigation.map(item => [item.path, item]))
        const visiblePaths = new Set(
          response.data
            .filter(item => item.visible !== false && allowed.has(item.path))
            .map(item => item.path)
        )
        const next = defaultNavigation.filter(item =>
          visiblePaths.has(item.path)
        )
        setNavigation(next)
      })
      .catch(() => {})

    return () => controller.abort()
  }, [])

  const navigate = useNavigate()
  const location = useLocation()

  const [isMenuOpen, setIsMenuOpen] =
    useState(false)

  const [
    accountOpen,
    setAccountOpen,
  ] = useState(false)

  const [isScrolled, setIsScrolled] =
    useState(false)

  const [user, setUser] =
    useState(null)

  const [balance, setBalance] =
    useState(null)

  const loadAccount =
    useCallback(async () => {
      if (!getCustomerToken()) {
        setUser(null)
        setBalance(null)
        return
      }

      try {
        const [
          meResponse,
          walletResponse,
        ] = await Promise.all([
          customerService.me(),
          customerService.wallet(),
        ])

        setUser(
          meResponse?.data?.user ||
            null,
        )

        setBalance(
          walletResponse?.data
            ?.balance ?? 0,
        )
      } catch {
        setUser(null)
        setBalance(null)
      }
    }, [])

  useEffect(() => {
    loadAccount()
  }, [
    loadAccount,
    location.pathname,
  ])

  useEffect(() => {
    const handler = () => {
      loadAccount()
    }

    window.addEventListener(
      'noscam-customer-updated',
      handler,
    )

    return () => {
      window.removeEventListener(
        'noscam-customer-updated',
        handler,
      )
    }
  }, [loadAccount])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(
        window.scrollY > 12,
      )
    }

    handleScroll()

    window.addEventListener(
      'scroll',
      handleScroll,
      {
        passive: true,
      },
    )

    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll,
      )
    }
  }, [])

  // NOSCAM_AUTH_48H_HEADER
  useEffect(() => {
    const onExpired = (event) => {
      if (event.detail?.key !== 'noscam_customer_token') return
      setUser(null)
      setBalance(null)
      setAccountOpen(false)
      setIsMenuOpen(false)
    }

    window.addEventListener('noscam-auth-expired', onExpired)
    return () => {
      window.removeEventListener('noscam-auth-expired', onExpired)
    }
  }, [])

  // NOSCAM_OUTSIDE_CLICK_V1
  useEffect(() => {
    if (!accountOpen && !isMenuOpen) return

    const handlePointerDown = (event) => {
      const target = event.target
      if (!(target instanceof Element)) return

      if (accountOpen && !target.closest('[data-noscam-account]')) {
        setAccountOpen(false)
      }

      if (
        isMenuOpen &&
        !target.closest('[data-noscam-mobile-nav]') &&
        !target.closest('[data-noscam-menu-toggle]')
      ) {
        setIsMenuOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setAccountOpen(false)
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [accountOpen, isMenuOpen])

  function closeMenu() {
    setIsMenuOpen(false)
  }

  async function logout() {
    await customerService.logout()

    setUser(null)
    setBalance(null)
    setAccountOpen(false)
    setIsMenuOpen(false)

    showAuthSuccess('logout')
    navigate('/')
  }

  return (
    <motion.header
      animate={{
        boxShadow: isScrolled
          ? '0 8px 30px rgba(15,23,42,0.07)'
          : '0 0 0 rgba(15,23,42,0)',
      }}
      transition={{
        duration: 0.25,
      }}
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        isScrolled
          ? 'border-slate-200/80 bg-white/90 backdrop-blur-xl'
          : 'border-slate-200 bg-white'
      }`}
    >
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <NavLink
            to="/"
            onClick={closeMenu}
            className="group relative hidden shrink-0 text-xl font-black tracking-tight text-slate-950 lg:block"
          >
            <motion.span
              whileHover={{
                scale: 1.03,
              }}
              className="inline-block"
            >
              NoScam
              <span className="text-blue-600">
                .vn
              </span>
            </motion.span>
          </NavLink>

          <nav className="hidden items-center gap-5 lg:flex">
            {navigation.map(
              (item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({
                    isActive,
                  }) =>
                    `noscam-nav-link relative whitespace-nowrap py-5 text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'text-blue-600'
                        : 'text-slate-600 hover:text-slate-950'
                    }`
                  }
                >
                  {({
                    isActive,
                  }) => (
                    <>
                      {item.name}

                      {isActive && (
                        <motion.span
                          layoutId="active-navigation"
                          className="absolute inset-x-0 bottom-3 h-0.5 rounded-full bg-blue-600"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Đăng nhập
                </Link>

                <Link
                  to="/register"
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700"
                >
                  Đăng ký
                </Link>
              </>
            ) : (
              <div className="relative" data-noscam-account>
                <button
                  type="button"
                  onClick={() =>
                    setAccountOpen(
                      (value) =>
                        !value,
                    )
                  }
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 transition hover:border-blue-200 hover:bg-blue-50/50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-black uppercase text-white">
                    {(
                      user.username?.[0] ||
                      'U'
                    ).toUpperCase()}
                  </div>

                  <div className="text-left">
                    <div className="max-w-[120px] truncate text-sm font-black text-slate-950">
                      {user.username}
                    </div>

                    <div className="text-xs font-bold text-blue-600">
                      {money(balance)}
                    </div>
                  </div>

                  <span className="text-xs text-slate-400">
                    ▾
                  </span>
                </button>

                <AnimatePresence>
                  {accountOpen && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        y: -8,
                        scale: 0.98,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        y: -8,
                        scale: 0.98,
                      }}
                      className="absolute right-0 top-[calc(100%+10px)] w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-950/10"
                    >
                      <div className="border-b border-slate-100 px-3 py-3">
                        <div className="text-xs text-slate-400">
                          Số dư
                        </div>

                        <div className="mt-1 text-xl font-black text-blue-600">
                          {money(balance)}
                        </div>
                      </div>

                      <Link
                        to="/wallet"
                        onClick={() =>
                          setAccountOpen(
                            false,
                          )
                        }
                        className="mt-2 block rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-slate-50"
                      >
                        Ví của tôi
                      </Link>

                      <Link
                        to="/my-orders"
                        onClick={() =>
                          setAccountOpen(
                            false,
                          )
                        }
                        className="block rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-slate-50"
                      >
                        Đơn của tôi
                      </Link>

                      <Link
                        to="/my-digital-orders"
                        onClick={() =>
                          setAccountOpen(
                            false,
                          )
                        }
                        className="block rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-slate-50"
                      >
                        Đơn dịch vụ số
                      </Link>

                      <Link
                        to="/profile"
                        onClick={() =>
                          setAccountOpen(
                            false,
                          )
                        }
                        className="block rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-slate-50"
                      >
                        Thông tin tài khoản
                      </Link>

                      <button
                        type="button"
                        onClick={logout}
                        className="mt-1 w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50"
                      >
                        Đăng xuất
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <Link
              to="/report"
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-600"
            >
              Báo cáo
            </Link>
          </div>

          <div className="relative flex w-full items-center justify-between lg:hidden">
            <button
              type="button"
              data-noscam-menu-toggle
              aria-label="Menu điều hướng"
              aria-expanded={isMenuOpen}
              onClick={() => {
                setAccountOpen(false)
                setIsMenuOpen(value => !value)
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200"
            >
              <span className="flex flex-col gap-1">
                <span className="h-0.5 w-5 bg-slate-700" />
                <span className="h-0.5 w-5 bg-slate-700" />
                <span className="h-0.5 w-5 bg-slate-700" />
              </span>
            </button>

            <Link
              to="/"
              onClick={() => {
                setIsMenuOpen(false)
                setAccountOpen(false)
              }}
              className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xl font-black tracking-tight text-slate-950"
            >
              NoScam<span className="text-blue-600">.vn</span>
            </Link>

            {user ? (
              <button
                type="button"
                data-noscam-account
                aria-label="Menu tài khoản"
                aria-expanded={accountOpen}
                onClick={() => {
                  setIsMenuOpen(false)
                  setAccountOpen(value => !value)
                }}
                className="flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-2"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-black uppercase text-white">
                  {(user.username?.[0] || 'U').toUpperCase()}
                </span>
                <span className="text-sm text-slate-500">▾</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="rounded-xl border border-slate-200 px-2 py-2 text-xs font-bold"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>

        <AnimatePresence>
          {accountOpen && user && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              data-noscam-account
              className="absolute right-3 top-full z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl lg:hidden"
            >
              <div className="border-b border-slate-100 px-3 py-3">
                <div className="truncate text-sm font-black">@{user.username}</div>
                <div className="mt-1 text-xs text-slate-500">Số dư tài khoản</div>
                <div className="text-lg font-black text-blue-600">{money(balance)}</div>
              </div>

              {[
                ['Ví của tôi', '/wallet'],
                ['Đơn của tôi', '/my-orders'],
                ['Đơn dịch vụ số', '/my-digital-orders'],
                ['Thông tin tài khoản', '/profile'],
              ].map(([label, route]) => (
                <Link
                  key={route}
                  to={route}
                  onClick={() => setAccountOpen(false)}
                  className="block rounded-xl px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  {label}
                </Link>
              ))}

              <button
                type="button"
                onClick={logout}
                className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50"
              >
                Đăng xuất
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.button
                type="button"
                aria-label="Đóng menu"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeMenu}
                className="fixed inset-0 z-[60] h-screen w-screen bg-slate-950/50 lg:hidden"
              />

              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.25 }}
                data-noscam-mobile-nav
                className="fixed inset-y-0 left-0 z-[70] flex h-dvh w-[82vw] max-w-[320px] flex-col bg-white shadow-2xl lg:hidden"
                aria-label="Điều hướng website"
              >
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
                  <span className="text-xl font-black text-slate-950">
                    NoScam<span className="text-blue-600">.vn</span>
                  </span>

                  <button
                    type="button"
                    onClick={closeMenu}
                    aria-label="Đóng menu"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-700"
                  >
                    ×
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4">
                  {navigation.map(item => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={closeMenu}
                      className={({ isActive }) =>
                        `block rounded-xl px-4 py-3 text-sm font-bold ${
                          isActive
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`
                      }
                    >
                      {item.name}
                    </NavLink>
                  ))}

                  {!user && (
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                      <Link
                        to="/login"
                        onClick={closeMenu}
                        className="rounded-xl border border-slate-200 px-2 py-3 text-center text-sm font-bold"
                      >
                        Đăng nhập
                      </Link>
                      <Link
                        to="/register"
                        onClick={closeMenu}
                        className="rounded-xl bg-blue-600 px-2 py-3 text-center text-sm font-bold text-white"
                      >
                        Đăng ký
                      </Link>
                    </div>
                  )}

                  <Link
                    to="/report"
                    onClick={closeMenu}
                    className="mt-3 block rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white"
                  >
                    Gửi báo cáo
                  </Link>
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </Container>
    </motion.header>
  )
}

export default Header
