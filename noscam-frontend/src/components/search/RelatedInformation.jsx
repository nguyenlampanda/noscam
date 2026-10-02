import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'

const riskStyles = {
  high: {
    dot: 'bg-red-500',
    badge:
      'border-red-200 bg-red-50 text-red-700',
  },

  medium: {
    dot: 'bg-amber-500',
    badge:
      'border-amber-200 bg-amber-50 text-amber-700',
  },

  low: {
    dot: 'bg-blue-500',
    badge:
      'border-blue-200 bg-blue-50 text-blue-700',
  },

  safe: {
    dot: 'bg-emerald-500',
    badge:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
}

function RelatedInformation({
  items = [],
}) {
  const navigate = useNavigate()

  const handleSearch = (item) => {
    const query =
      item.value ||
      item.normalizedValue

    if (!query) {
      return
    }

    navigate(
      `/search?q=${encodeURIComponent(
        query,
      )}`,
    )
  }

  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 22,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.5,
        delay: 0.2,
      }}
      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-50 blur-3xl"
      />

      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <motion.span
              className="h-2.5 w-2.5 rounded-full bg-blue-600"
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

            <motion.span
              className="absolute h-6 w-6 rounded-full border border-blue-400"
              animate={{
                scale: [
                  0.7,
                  1.5,
                ],
                opacity: [
                  0.7,
                  0,
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Mạng lưới thông tin liên quan
            </h2>

            <p className="text-xs text-slate-400">
              Dữ liệu xuất hiện cùng trong
              các báo cáo đã duyệt
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-500">
          Các liên kết bên dưới không tự
          động có nghĩa rằng những thông tin
          này thuộc cùng một người hoặc tổ
          chức.
        </p>

        {items.length > 0 ? (
          <div className="relative mt-6">
            <div className="absolute bottom-6 left-[19px] top-6 w-px bg-gradient-to-b from-blue-400 via-blue-100 to-transparent" />

            <div className="space-y-3">
              {items.map(
                (item, index) => {
                  const style =
                    riskStyles[
                      item.riskLevel
                    ] ||
                    riskStyles.low

                  return (
                    <motion.button
                      type="button"
                      key={
                        item.id ??
                        `${item.type}-${item.value}`
                      }
                      initial={{
                        opacity: 0,
                        x: -18,
                        scale: 0.98,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        scale: 1,
                      }}
                      transition={{
                        delay:
                          0.25 +
                          index * 0.09,
                        duration: 0.42,
                      }}
                      whileHover={{
                        x: 5,
                        scale: 1.01,
                      }}
                      whileTap={{
                        scale: 0.985,
                      }}
                      onClick={() =>
                        handleSearch(item)
                      }
                      className="group relative flex w-full gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <div className="relative z-10 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white shadow-sm">
                        <motion.div
                          className={`h-2.5 w-2.5 rounded-full ${style.dot}`}
                          animate={{
                            scale: [
                              1,
                              1.35,
                              1,
                            ],
                          }}
                          transition={{
                            duration: 2.2,
                            repeat:
                              Infinity,
                            delay:
                              index *
                              0.18,
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                              {item.typeLabel ||
                                item.type}
                            </p>

                            <p className="mt-1.5 break-all text-sm font-semibold text-slate-950">
                              {item.value}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style.badge}`}
                          >
                            Risk{' '}
                            {item.riskScore}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
                            {item.relationLabel ||
                              `${item.sharedReports} báo cáo chung`}
                          </span>

                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 shadow-sm">
                            {item.reports}{' '}
                            báo cáo tổng
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-xs text-slate-400">
                            {item.riskLabel}
                          </p>

                          <motion.span
                            aria-hidden="true"
                            className="text-sm font-semibold text-blue-600"
                            initial={{
                              x: 0,
                            }}
                            whileHover={{
                              x: 3,
                            }}
                          >
                            Tra cứu →
                          </motion.span>
                        </div>
                      </div>
                    </motion.button>
                  )
                },
              )}
            </div>
          </div>
        ) : (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500"
          >
            Chưa ghi nhận thông tin liên
            quan trong các báo cáo đã duyệt.
          </motion.div>
        )}
      </div>
    </motion.section>
  )
}

export default RelatedInformation
