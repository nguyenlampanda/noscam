import {
  useEffect,
  useState,
} from 'react'
import {
  AnimatePresence,
  motion,
} from 'motion/react'

import Container from '../../components/layout/Container'
import AlertCard from '../../components/risk/AlertCard'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'

import { alertFilters } from '../../data/alerts'
import useAlerts from '../../hooks/useAlerts'

function AlertsPage() {
  const [
    activeFilter,
    setActiveFilter,
  ] = useState('all')

  const {
    alerts,
    pagination,
    status,
    error,
    loadAlerts,
  } = useAlerts()

  useEffect(() => {
    loadAlerts({
      category: activeFilter,
      page: 1,
    })
  }, [activeFilter, loadAlerts])

  const handleRetry = () => {
    loadAlerts({
      category: activeFilter,
      page: 1,
    })
  }

  const isLoading =
    status === 'loading'

  const isError =
    status === 'error'

  const isSuccess =
    status === 'success'

  const isEmpty =
    status === 'empty' ||
    (isSuccess &&
      alerts.length === 0)

  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50/70 py-12 sm:py-20">
        <div
          aria-hidden="true"
          className="noscam-grid absolute inset-0 opacity-40"
        />

        <motion.div
          aria-hidden="true"
          className="absolute -right-32 -top-40 h-96 w-96 rounded-full bg-blue-100/70 blur-3xl"
          animate={{
            x: [0, -40, 0],
            y: [0, 30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <Container>
          <motion.div
            initial={{
              opacity: 0,
              y: 25,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="relative max-w-3xl"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <motion.span
                  className="absolute h-full w-full rounded-full bg-blue-500"
                  animate={{
                    scale: [1, 2, 1],
                    opacity: [
                      0.8,
                      0,
                      0.8,
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                />

                <span className="relative h-2.5 w-2.5 rounded-full bg-blue-600" />
              </span>

              <p className="text-sm font-semibold text-blue-600">
                Dữ liệu cảnh báo
              </p>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Cảnh báo từ cộng đồng
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
              Theo dõi các thông tin
              đang được người dùng gửi
              báo cáo và hệ thống ghi
              nhận để hỗ trợ quá trình
              kiểm tra trước khi giao
              dịch.
            </p>

            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.25,
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-xs font-medium text-slate-500 shadow-sm backdrop-blur"
            >
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                animate={{
                  opacity: [
                    0.35,
                    1,
                    0.35,
                  ],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
              />

              Dữ liệu được cập nhật từ
              hệ thống NoScam
            </motion.div>
          </motion.div>
        </Container>
      </section>

      <section className="min-h-[600px] bg-white py-8 sm:py-14">
        <Container>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
            <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
              {alertFilters.map(
                (filter) => {
                  const isActive =
                    activeFilter ===
                    filter.value

                  return (
                    <motion.button
                      key={filter.value}
                      type="button"
                      onClick={() =>
                        setActiveFilter(
                          filter.value,
                        )
                      }
                      disabled={
                        isLoading
                      }
                      whileHover={{
                        y: -2,
                      }}
                      whileTap={{
                        scale: 0.96,
                      }}
                      className={`relative shrink-0 overflow-hidden rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        isActive
                          ? 'border-slate-950 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="active-alert-filter"
                          className="absolute inset-0 bg-slate-950"
                          transition={{
                            type: 'spring',
                            stiffness: 380,
                            damping: 30,
                          }}
                        />
                      )}

                      <span className="relative z-10">
                        {filter.label}
                      </span>
                    </motion.button>
                  )
                },
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isSuccess &&
              alerts.length > 0 && (
                <motion.div
                  key={`summary-${activeFilter}`}
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  className="mt-7 flex items-center justify-between gap-4 border-b border-slate-200 pb-4 sm:mt-8"
                >
                  <p className="text-sm text-slate-500">
                    <span className="font-semibold text-slate-950">
                      {pagination?.total ??
                        alerts.length}
                    </span>{' '}
                    cảnh báo
                  </p>

                  <span className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-500 sm:text-xs">
                    <motion.span
                      className="h-1.5 w-1.5 rounded-full bg-blue-500"
                      animate={{
                        scale: [
                          1,
                          1.5,
                          1,
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                    />
                    Dữ liệu hệ thống
                  </span>
                </motion.div>
              )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key={`loading-${activeFilter}`}
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                className="mt-8"
              >
                <LoadingState
                  title="Đang tải cảnh báo"
                  description="NoScam đang tải các cảnh báo và dữ liệu mới nhất được hệ thống ghi nhận."
                />
              </motion.div>
            )}

            {isError && (
              <motion.div
                key="alerts-error"
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="mt-8"
              >
                <ErrorState
                  title="Không thể tải cảnh báo"
                  description={
                    error ||
                    'NoScam chưa thể kết nối tới dữ liệu cảnh báo. Vui lòng thử lại.'
                  }
                  onRetry={
                    handleRetry
                  }
                />
              </motion.div>
            )}

            {isEmpty && (
              <motion.div
                key={`empty-${activeFilter}`}
                initial={{
                  opacity: 0,
                  scale: 0.98,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                className="mt-6"
              >
                <EmptyState
                  title="Chưa có cảnh báo"
                  description="Hiện tại chưa có dữ liệu cảnh báo phù hợp với nhóm thông tin này."
                />
              </motion.div>
            )}

            {isSuccess &&
              alerts.length > 0 && (
                <motion.div
                  key={`alerts-${activeFilter}`}
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: {
                      transition: {
                        staggerChildren:
                          0.06,
                      },
                    },
                  }}
                >
                  <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4">
                    {alerts.map(
                      (alert) => (
                        <motion.div
                          key={
                            alert.id
                          }
                          variants={{
                            hidden: {
                              opacity: 0,
                              y: 20,
                            },
                            visible: {
                              opacity: 1,
                              y: 0,
                            },
                          }}
                        >
                          <AlertCard
                            alert={
                              alert
                            }
                          />
                        </motion.div>
                      ),
                    )}
                  </div>

                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 20,
                    }}
                    whileInView={{
                      opacity: 1,
                      y: 0,
                    }}
                    viewport={{
                      once: true,
                    }}
                    className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:mt-10 sm:p-6"
                  >
                    <div className="flex gap-3">
                      <motion.span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600"
                        animate={{
                          scale: [
                            1,
                            1.5,
                            1,
                          ],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                        }}
                      />

                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          Lưu ý về dữ
                          liệu cảnh báo
                        </p>

                        <p className="mt-2 max-w-4xl text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
                          Thông tin xuất
                          hiện trong danh
                          sách phản ánh
                          dữ liệu và báo
                          cáo được hệ
                          thống ghi nhận.
                          Việc xuất hiện
                          tại đây không
                          phải là kết
                          luận một cá
                          nhân hoặc tổ
                          chức đã thực
                          hiện hành vi
                          lừa đảo. Người
                          dùng nên kiểm
                          tra thêm các
                          thông tin liên
                          quan trước khi
                          đưa ra quyết
                          định giao dịch.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
          </AnimatePresence>
        </Container>
      </section>
    </>
  )
}

export default AlertsPage