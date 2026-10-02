import {
  useEffect,
  useState,
} from 'react'

import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

import Container from '../layout/Container'
import { getAlerts } from '../../services/alertsService'

const riskStyles = {
  high:
    'border-red-200 bg-red-50 text-red-700',

  medium:
    'border-amber-200 bg-amber-50 text-amber-700',

  low:
    'border-blue-200 bg-blue-50 text-blue-700',
}

function RecentAlerts() {
  const [alerts, setAlerts] =
    useState([])

  const [isLoading, setIsLoading] =
    useState(true)

  const [hasError, setHasError] =
    useState(false)

  useEffect(() => {
    const controller =
      new AbortController()

    async function load() {
      try {
        const result =
          await getAlerts(
            {
              sort: 'latest',
              page: 1,
              perPage: 3,
            },
            {
              signal:
                controller.signal,
            },
          )

        if (
          !controller.signal.aborted
        ) {
          setAlerts(
            result.alerts || [],
          )

          setHasError(false)
          setIsLoading(false)
        }
      } catch (error) {
        if (
          error.name ===
          'AbortError'
        ) {
          return
        }

        setHasError(true)
        setIsLoading(false)
      }
    }

    load()

    return () => {
      controller.abort()
    }
  }, [])

  return (
    <section className="relative overflow-hidden bg-white py-14 sm:py-24">
      <motion.div
        aria-hidden="true"
        className="absolute -right-32 top-20 h-80 w-80 rounded-full bg-blue-50 blur-3xl"
        animate={{
          scale: [
            1,
            1.2,
            1,
          ],
          opacity: [
            0.4,
            0.8,
            0.4,
          ],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
        }}
      />

      <Container>
        <motion.div
          initial={{
            opacity: 0,
            y: 30,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
            amount: 0.3,
          }}
          transition={{
            duration: 0.55,
          }}
          className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-2">
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

              <p className="text-sm font-semibold text-blue-600">
                Dữ liệu hệ thống
              </p>
            </div>

            <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">
              Cảnh báo gần đây
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
              Một số thông tin có báo
              cáo đã được duyệt và vừa
              được hệ thống cập nhật.
            </p>
          </div>

          <motion.div
            whileHover={{
              x: 5,
            }}
          >
            <Link
              to="/alerts"
              className="text-sm font-semibold text-slate-700 transition-colors hover:text-blue-600"
            >
              Xem tất cả cảnh báo →
            </Link>
          </motion.div>
        </motion.div>

        <div className="relative mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm sm:mt-10">
          <motion.div
            aria-hidden="true"
            className="absolute left-0 top-0 h-[2px] bg-blue-500"
            initial={{
              width: '0%',
            }}
            whileInView={{
              width: '100%',
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 1.4,
            }}
          />

          {isLoading && (
            <div className="space-y-0">
              {[1, 2, 3].map(
                (item) => (
                  <div
                    key={item}
                    className="border-b border-slate-100 p-5 last:border-b-0 sm:p-6"
                  >
                    <div className="animate-pulse">
                      <div className="h-3 w-28 rounded-full bg-slate-100" />

                      <div className="mt-4 h-5 w-56 max-w-full rounded-full bg-slate-100" />

                      <div className="mt-3 h-3 w-full max-w-xl rounded-full bg-slate-100" />
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          {!isLoading &&
            !hasError &&
            alerts.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  Chưa có cảnh báo
                  gần đây
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Dữ liệu sẽ xuất
                  hiện khi có báo cáo
                  đã được duyệt.
                </p>
              </div>
            )}

          {!isLoading &&
            hasError && (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  Chưa thể tải cảnh
                  báo
                </p>

                <Link
                  to="/alerts"
                  className="mt-3 inline-flex text-xs font-semibold text-blue-600"
                >
                  Mở trang cảnh báo →
                </Link>
              </div>
            )}

          {!isLoading &&
            !hasError &&
            alerts.map(
              (alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{
                    opacity: 0,
                    x:
                      index % 2 === 0
                        ? -25
                        : 25,
                  }}
                  whileInView={{
                    opacity: 1,
                    x: 0,
                  }}
                  viewport={{
                    once: true,
                    amount: 0.35,
                  }}
                  transition={{
                    duration: 0.45,
                    delay:
                      index * 0.07,
                  }}
                  whileHover={{
                    x: 5,
                    backgroundColor:
                      'rgb(248 250 252)',
                  }}
                  className={`group relative p-5 sm:grid sm:grid-cols-[1fr_auto] sm:items-center sm:gap-5 sm:p-6 ${
                    index !==
                    alerts.length - 1
                      ? 'border-b border-slate-200'
                      : ''
                  }`}
                >
                  <motion.div
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 top-0 w-[3px] bg-blue-500"
                    initial={{
                      scaleY: 0,
                    }}
                    whileHover={{
                      scaleY: 1,
                    }}
                  />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
                        {
                          alert.type
                        }
                      </span>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs ${
                          riskStyles[
                            alert
                              .riskLevel
                          ] ||
                          riskStyles.low
                        }`}
                      >
                        {
                          alert.riskLabel
                        }
                      </span>
                    </div>

                    <Link
                      to={`/search?q=${encodeURIComponent(
                        alert.value,
                      )}`}
                      className="mt-3 block break-all text-base font-semibold text-slate-950 transition-colors group-hover:text-blue-700 sm:text-lg"
                    >
                      {alert.value}
                    </Link>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {
                        alert.description
                      }
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-5 border-t border-slate-100 pt-4 sm:mt-0 sm:border-0 sm:pt-0 sm:text-right">
                    <div>
                      <p className="text-xl font-black tracking-[-0.04em] text-slate-950">
                        {
                          alert.riskScore
                        }
                        <span className="text-xs font-semibold text-slate-400">
                          /100
                        </span>
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Risk Score
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {
                          alert.reports
                        }{' '}
                        báo cáo
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {
                          alert.time
                        }
                      </p>
                    </div>
                  </div>
                </motion.div>
              ),
            )}
        </div>

        <p className="mt-5 text-xs leading-5 text-slate-400">
          Thông tin cảnh báo phản ánh
          dữ liệu từ các báo cáo đã
          được duyệt, không phải kết
          luận một cá nhân hoặc tổ
          chức là lừa đảo.
        </p>
      </Container>
    </section>
  )
}

export default RecentAlerts
