import {
  useCallback,
  useEffect,
} from 'react'

import {
  AnimatePresence,
  motion,
} from 'motion/react'

import {
  useSearchParams,
} from 'react-router-dom'

import Container from '../../components/layout/Container'
import AlertCard from '../../components/risk/AlertCard'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingState from '../../components/common/LoadingState'

import useAlerts from '../../hooks/useAlerts'
import { REQUEST_STATUS } from '../../constants/api'

const categoryFilters = [
  {
    value: 'all',
    label: 'Tất cả',
  },
  {
    value: 'phone',
    label: 'SĐT',
  },
  {
    value: 'bank',
    label: 'STK',
  },
  {
    value: 'website',
    label: 'Website',
  },
  {
    value: 'social',
    label: 'Mạng xã hội',
  },
  {
    value: 'shop',
    label: 'Shop',
  },
  {
    value: 'rental',
    label: 'Phòng trọ',
  },
  {
    value: 'job',
    label: 'Tuyển dụng',
  },
]

const riskFilters = [
  {
    value: 'all',
    label: 'Mọi mức',
  },
  {
    value: 'high',
    label: 'Cao',
  },
  {
    value: 'medium',
    label: 'Trung bình',
  },
  {
    value: 'low',
    label: 'Thấp',
  },
]

const sortOptions = [
  {
    value: 'latest',
    label: 'Mới cập nhật',
  },
  {
    value: 'risk',
    label: 'Risk Score cao',
  },
  {
    value: 'reports',
    label: 'Nhiều báo cáo',
  },
]

function AlertsPage() {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams()

  const {
    alerts,
    pagination,
    status,
    error,
    loadAlerts,
  } = useAlerts()

  const category =
    searchParams.get('category') ||
    'all'

  const risk =
    searchParams.get('risk') ||
    'all'

  const sort =
    searchParams.get('sort') ||
    'latest'

  const page = Math.max(
    1,
    Number(
      searchParams.get('page') ||
      1,
    ) || 1,
  )

  const isLoading =
    status ===
    REQUEST_STATUS.LOADING

  const isSuccess =
    status ===
    REQUEST_STATUS.SUCCESS

  const isEmpty =
    status ===
    REQUEST_STATUS.EMPTY

  const isError =
    status ===
    REQUEST_STATUS.ERROR

  useEffect(() => {
    loadAlerts({
      category,
      risk,
      sort,
      page,
      perPage: 12,
    })
  }, [
    category,
    risk,
    sort,
    page,
    loadAlerts,
  ])

  const updateFilters =
    useCallback(
      (changes) => {
        const next =
          new URLSearchParams(
            searchParams,
          )

        Object.entries(
          changes,
        ).forEach(
          ([key, value]) => {
            if (
              value === undefined ||
              value === null ||
              value === '' ||
              (
                key !== 'sort' &&
                value === 'all'
              ) ||
              (
                key === 'sort' &&
                value === 'latest'
              )
            ) {
              next.delete(key)
            } else {
              next.set(
                key,
                String(value),
              )
            }
          },
        )

        setSearchParams(next)
      },
      [
        searchParams,
        setSearchParams,
      ],
    )

  const changeCategory =
    (value) => {
      updateFilters({
        category: value,
        page: null,
      })
    }

  const changeRisk =
    (value) => {
      updateFilters({
        risk: value,
        page: null,
      })
    }

  const changeSort =
    (event) => {
      updateFilters({
        sort:
          event.target.value,
        page: null,
      })
    }

  const changePage =
    (nextPage) => {
      if (
        nextPage < 1 ||
        nextPage >
          (pagination?.lastPage ||
            1) ||
        nextPage === page
      ) {
        return
      }

      updateFilters({
        page:
          nextPage === 1
            ? null
            : nextPage,
      })

      window.scrollTo({
        top: 320,
        behavior: 'smooth',
      })
    }

  const handleRetry = () => {
    loadAlerts({
      category,
      risk,
      sort,
      page,
      perPage: 12,
    })
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50 py-12 sm:py-20">
        <motion.div
          aria-hidden="true"
          className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-blue-100/70 blur-3xl"
          animate={{
            scale: [
              1,
              1.18,
              1,
            ],
            opacity: [
              0.45,
              0.75,
              0.45,
            ],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
          }}
        />

        <motion.div
          aria-hidden="true"
          className="absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-cyan-100/60 blur-3xl"
          animate={{
            x: [
              0,
              -25,
              0,
            ],
            y: [
              0,
              -15,
              0,
            ],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
          }}
        />

        <Container>
          <motion.div
            initial={{
              opacity: 0,
              y: 28,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.55,
            }}
            className="relative max-w-3xl"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
              <span className="relative flex h-2.5 w-2.5">
                <motion.span
                  className="absolute inline-flex h-full w-full rounded-full bg-blue-500"
                  animate={{
                    scale: [
                      1,
                      2,
                      1,
                    ],
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

                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-600" />
              </span>

              Dữ liệu cảnh báo
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Cảnh báo từ hệ thống
              NoScam
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
              Theo dõi các thông tin
              có báo cáo đã được duyệt
              và dùng bộ lọc để hỗ trợ
              quá trình kiểm tra trước
              khi giao dịch.
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
                delay: 0.2,
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

              Dữ liệu từ các báo cáo
              đã được duyệt
            </motion.div>
          </motion.div>
        </Container>
      </section>

      <section className="min-h-[650px] bg-white py-8 sm:py-14">
        <Container>
          <motion.div
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6"
          >
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                Loại dữ liệu
              </p>

              <div className="-mx-1 overflow-x-auto px-1">
                <div className="flex w-max gap-2 pb-1 sm:w-auto sm:flex-wrap">
                  {categoryFilters.map(
                    (filter) => {
                      const active =
                        category ===
                        filter.value

                      return (
                        <motion.button
                          key={
                            filter.value
                          }
                          type="button"
                          onClick={() =>
                            changeCategory(
                              filter.value,
                            )
                          }
                          whileHover={{
                            y: -2,
                          }}
                          whileTap={{
                            scale: 0.96,
                          }}
                          className={`relative shrink-0 overflow-hidden rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                            active
                              ? 'border-slate-950 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="alerts-category"
                              className="absolute inset-0 bg-slate-950"
                              transition={{
                                type: 'spring',
                                stiffness: 380,
                                damping: 30,
                              }}
                            />
                          )}

                          <span className="relative z-10">
                            {
                              filter.label
                            }
                          </span>
                        </motion.button>
                      )
                    },
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-5 sm:flex sm:items-end sm:justify-between sm:gap-6">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                  Mức Risk Score
                </p>

                <div className="flex flex-wrap gap-2">
                  {riskFilters.map(
                    (filter) => {
                      const active =
                        risk ===
                        filter.value

                      return (
                        <motion.button
                          key={
                            filter.value
                          }
                          type="button"
                          onClick={() =>
                            changeRisk(
                              filter.value,
                            )
                          }
                          whileTap={{
                            scale: 0.96,
                          }}
                          className={`relative overflow-hidden rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                            active
                              ? 'border-blue-600 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="alerts-risk"
                              className="absolute inset-0 bg-blue-600"
                            />
                          )}

                          <span className="relative z-10">
                            {
                              filter.label
                            }
                          </span>
                        </motion.button>
                      )
                    },
                  )}
                </div>
              </div>

              <div className="mt-5 sm:mt-0 sm:min-w-[210px]">
                <label
                  htmlFor="alerts-sort"
                  className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400"
                >
                  Sắp xếp
                </label>

                <select
                  id="alerts-sort"
                  value={sort}
                  onChange={
                    changeSort
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  {sortOptions.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {!isLoading &&
              !isError && (
                <motion.div
                  key={`${category}-${risk}-${sort}-summary`}
                  initial={{
                    opacity: 0,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  className="mt-7 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4"
                >
                  <p className="text-sm text-slate-500">
                    <span className="font-bold text-slate-950">
                      {
                        pagination?.total ??
                        0
                      }
                    </span>{' '}
                    cảnh báo phù hợp
                  </p>

                  {pagination &&
                    pagination.lastPage >
                      1 && (
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                        Trang{' '}
                        {
                          pagination.currentPage
                        }
                        /
                        {
                          pagination.lastPage
                        }
                      </span>
                    )}
                </motion.div>
              )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="alerts-loading"
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
                  description="NoScam đang đối chiếu các dữ liệu cảnh báo phù hợp với bộ lọc."
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
                    'Không thể tải dữ liệu cảnh báo. Vui lòng thử lại.'
                  }
                  onRetry={
                    handleRetry
                  }
                />
              </motion.div>
            )}

            {isEmpty && (
              <motion.div
                key="alerts-empty"
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
                  title="Chưa có cảnh báo phù hợp"
                  description="Không có dữ liệu cảnh báo phù hợp với bộ lọc hiện tại. Bạn có thể thử chọn nhóm dữ liệu hoặc mức rủi ro khác."
                />
              </motion.div>
            )}

            {isSuccess &&
              alerts.length > 0 && (
                <motion.div
                  key={`${category}-${risk}-${sort}-${page}`}
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: {
                      transition: {
                        staggerChildren:
                          0.055,
                      },
                    },
                  }}
                >
                  <div className="mt-5 grid gap-4 sm:mt-6">
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

                  {pagination &&
                    pagination.lastPage >
                      1 && (
                      <div className="mt-8 flex items-center justify-center gap-3">
                        <motion.button
                          type="button"
                          whileTap={{
                            scale: 0.96,
                          }}
                          disabled={
                            page <= 1
                          }
                          onClick={() =>
                            changePage(
                              page - 1,
                            )
                          }
                          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          ← Trước
                        </motion.button>

                        <span className="min-w-20 text-center text-sm font-semibold text-slate-500">
                          {page} /{' '}
                          {
                            pagination.lastPage
                          }
                        </span>

                        <motion.button
                          type="button"
                          whileTap={{
                            scale: 0.96,
                          }}
                          disabled={
                            page >=
                            pagination.lastPage
                          }
                          onClick={() =>
                            changePage(
                              page + 1,
                            )
                          }
                          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Sau →
                        </motion.button>
                      </div>
                    )}

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
                    className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6"
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
                          Risk Score và
                          danh sách cảnh
                          báo được xây dựng
                          từ dữ liệu hệ
                          thống và các báo
                          cáo đã được duyệt.
                          Việc xuất hiện tại
                          đây không phải là
                          kết luận một cá
                          nhân hoặc tổ chức
                          đã thực hiện hành
                          vi lừa đảo.
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
