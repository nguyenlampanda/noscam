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

const navigation = [
  {
    name: 'Trang chủ',
    path: '/',
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
    name: 'Trung gian',
    path: '/mediators',
  },
  {
    name: 'Tăng tương tác',
    path: '/social-services',
  },
  {
    name: 'Dịch vụ số',
    path: '/digital-services',
  },
  {
    name: 'Hướng dẫn',
    path: '/guide',
  },
]

function money(value) {
  return `${Math.round(
    Number(value || 0),
  ).toLocaleString('vi-VN')}đ`
}

function Header() {
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

  function closeMenu() {
    setIsMenuOpen(false)
  }

  async function logout() {
    await customerService.logout()

    setUser(null)
    setBalance(null)
    setAccountOpen(false)
    setIsMenuOpen(false)

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
            className="group relative shrink-0 text-xl font-black tracking-tight text-slate-950"
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
                    `relative whitespace-nowrap py-5 text-sm font-semibold transition ${
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
              <div className="relative">
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

          <button
            type="button"
            onClick={() =>
              setIsMenuOpen(
                (value) => !value,
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 lg:hidden"
            aria-label="Menu"
          >
            <div className="space-y-1">
              <span className="block h-0.5 w-5 bg-slate-700" />
              <span className="block h-0.5 w-5 bg-slate-700" />
              <span className="block h-0.5 w-5 bg-slate-700" />
            </div>
          </button>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{
                opacity: 0,
                height: 0,
              }}
              animate={{
                opacity: 1,
                height: 'auto',
              }}
              exit={{
                opacity: 0,
                height: 0,
              }}
              className="overflow-hidden lg:hidden"
            >
              <nav className="border-t border-slate-200 py-3">
                {navigation.map(
                  (item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={
                        closeMenu
                      }
                      className={({
                        isActive,
                      }) =>
                        `block rounded-xl px-3 py-3 text-sm font-bold ${
                          isActive
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-slate-700'
                        }`
                      }
                    >
                      {item.name}
                    </NavLink>
                  ),
                )}

                {user ? (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <div className="mb-2 flex items-center justify-between rounded-2xl bg-blue-50 p-3">
                      <div>
                        <div className="font-black">
                          @{user.username}
                        </div>
                        <div className="text-xs text-slate-500">
                          Số dư tài khoản
                        </div>
                      </div>

                      <div className="font-black text-blue-600">
                        {money(balance)}
                      </div>
                    </div>

                    <Link
                      to="/wallet"
                      onClick={
                        closeMenu
                      }
                      className="block rounded-xl px-3 py-3 text-sm font-bold"
                    >
                      Ví của tôi
                    </Link>

                    <Link
                      to="/my-orders"
                      onClick={
                        closeMenu
                      }
                      className="block rounded-xl px-3 py-3 text-sm font-bold"
                    >
                      Đơn của tôi
                    </Link>

                    <Link
                      to="/my-digital-orders"
                      onClick={
                        closeMenu
                      }
                      className="block rounded-xl px-3 py-3 text-sm font-bold"
                    >
                      Đơn dịch vụ số
                    </Link>

                    <Link
                      to="/profile"
                      onClick={
                        closeMenu
                      }
                      className="block rounded-xl px-3 py-3 text-sm font-bold"
                    >
                      Thông tin tài khoản
                    </Link>

                    <button
                      type="button"
                      onClick={logout}
                      className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-red-600"
                    >
                      Đăng xuất
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                    <Link
                      to="/login"
                      onClick={
                        closeMenu
                      }
                      className="rounded-xl border border-slate-200 px-3 py-3 text-center text-sm font-black"
                    >
                      Đăng nhập
                    </Link>

                    <Link
                      to="/register"
                      onClick={
                        closeMenu
                      }
                      className="rounded-xl bg-blue-600 px-3 py-3 text-center text-sm font-black text-white"
                    >
                      Đăng ký
                    </Link>
                  </div>
                )}

                <Link
                  to="/report"
                  onClick={
                    closeMenu
                  }
                  className="mt-2 block rounded-xl bg-slate-950 px-3 py-3 text-center text-sm font-black text-white"
                >
                  Gửi báo cáo
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </motion.header>
  )
}

export default Header
