import {
  useEffect,
  useState,
} from 'react'
import {
  AnimatePresence,
  motion,
} from 'motion/react'
import {
  NavLink,
  useLocation,
} from 'react-router-dom'

import Container from './Container'

const navigation = [
  {
    name: 'Trang chủ',
    path: '/',
  },
  {
    name: 'Cảnh báo',
    path: '/alerts',
  },
  {
    name: 'Hướng dẫn',
    path: '/guide',
  },
  {
    name: 'Giới thiệu',
    path: '/about',
  },
]

function Header() {
  const [isMenuOpen, setIsMenuOpen] =
    useState(false)

  const [isScrolled, setIsScrolled] =
    useState(false)

  const location = useLocation()

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

  const closeMenu = () => {
    setIsMenuOpen(false)
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
          ? 'border-slate-200/80 bg-white/85 backdrop-blur-xl'
          : 'border-slate-200 bg-white'
      }`}
    >
      <Container>
        <div className="flex h-16 items-center justify-between">
          <NavLink
            to="/"
            onClick={closeMenu}
            className="group relative text-xl font-bold tracking-tight text-slate-950"
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

            <motion.span
              className="absolute -bottom-1 left-0 h-0.5 w-full origin-left rounded-full bg-blue-600"
              initial={{
                scaleX: 0,
              }}
              whileHover={{
                scaleX: 1,
              }}
            />
          </NavLink>

          <nav className="hidden items-center gap-8 md:flex">
            {navigation.map(
              (item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({
                    isActive,
                  }) =>
                    `relative py-5 text-sm font-medium transition-colors ${
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
                          transition={{
                            type:
                              'spring',
                            stiffness:
                              380,
                            damping:
                              30,
                          }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ),
            )}
          </nav>

          <motion.div
            whileHover={{
              scale: 1.03,
            }}
            whileTap={{
              scale: 0.97,
            }}
            className="hidden md:block"
          >
            <NavLink
              to="/report"
              className="inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition-colors hover:bg-blue-600"
            >
              Gửi báo cáo
            </NavLink>
          </motion.div>

          <motion.button
            type="button"
            onClick={() =>
              setIsMenuOpen(
                (current) =>
                  !current,
              )
            }
            whileTap={{
              scale: 0.92,
            }}
            aria-label={
              isMenuOpen
                ? 'Đóng menu'
                : 'Mở menu'
            }
            aria-expanded={
              isMenuOpen
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 md:hidden"
          >
            <div className="relative h-5 w-5">
              <motion.span
                className="absolute left-0 top-[4px] h-0.5 w-5 rounded-full bg-current"
                animate={
                  isMenuOpen
                    ? {
                        rotate: 45,
                        y: 5,
                      }
                    : {
                        rotate: 0,
                        y: 0,
                      }
                }
              />

              <motion.span
                className="absolute left-0 top-[9px] h-0.5 w-5 rounded-full bg-current"
                animate={{
                  opacity:
                    isMenuOpen
                      ? 0
                      : 1,
                  x:
                    isMenuOpen
                      ? 8
                      : 0,
                }}
              />

              <motion.span
                className="absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current"
                animate={
                  isMenuOpen
                    ? {
                        rotate: -45,
                        y: -5,
                      }
                    : {
                        rotate: 0,
                        y: 0,
                      }
                }
              />
            </div>
          </motion.button>
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
              transition={{
                duration: 0.25,
              }}
              className="overflow-hidden md:hidden"
            >
              <motion.nav
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren:
                        0.05,
                    },
                  },
                }}
                className="flex flex-col border-t border-slate-200 pb-3 pt-3"
              >
                {navigation.map(
                  (item) => {
                    const isActive =
                      location.pathname ===
                      item.path

                    return (
                      <motion.div
                        key={
                          item.path
                        }
                        variants={{
                          hidden: {
                            opacity: 0,
                            x: -12,
                          },
                          visible: {
                            opacity: 1,
                            x: 0,
                          },
                        }}
                      >
                        <NavLink
                          to={
                            item.path
                          }
                          onClick={
                            closeMenu
                          }
                          className={`block rounded-xl px-3 py-3 text-sm font-semibold ${
                            isActive
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {
                            item.name
                          }
                        </NavLink>
                      </motion.div>
                    )
                  },
                )}

                <motion.div
                  variants={{
                    hidden: {
                      opacity: 0,
                      y: 10,
                    },
                    visible: {
                      opacity: 1,
                      y: 0,
                    },
                  }}
                >
                  <NavLink
                    to="/report"
                    onClick={
                      closeMenu
                    }
                    className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white"
                  >
                    Gửi báo cáo
                  </NavLink>
                </motion.div>
              </motion.nav>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </motion.header>
  )
}

export default Header