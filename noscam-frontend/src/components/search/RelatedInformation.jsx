import { motion } from 'motion/react'

function RelatedInformation({
  items = [],
}) {
  return (
    <motion.div
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
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
            <motion.span
              className="h-2.5 w-2.5 rounded-full bg-blue-600"
              animate={{
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />

            <motion.span
              className="absolute h-5 w-5 rounded-full border border-blue-400"
              animate={{
                scale: [0.7, 1.5],
                opacity: [0.7, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Thông tin liên quan
            </h2>

            <p className="text-xs text-slate-400">
              Dữ liệu có liên kết
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-500">
          Các dữ liệu được hệ thống ghi
          nhận có liên quan đến nội dung
          bạn vừa tra cứu.
        </p>

        {items.length > 0 ? (
          <div className="relative mt-6">
            <div className="absolute bottom-5 left-[17px] top-5 w-px bg-gradient-to-b from-blue-300 via-slate-200 to-transparent" />

            <div className="space-y-3">
              {items.map(
                (item, index) => (
                  <motion.div
                    key={
                      item.id ??
                      `${item.type}-${item.value}`
                    }
                    initial={{
                      opacity: 0,
                      x: -15,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      delay:
                        0.3 +
                        index * 0.1,
                      duration: 0.4,
                    }}
                    whileHover={{
                      x: 4,
                      scale: 1.01,
                    }}
                    className="relative flex gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="relative z-10 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white shadow-sm">
                      <motion.div
                        className="h-2.5 w-2.5 rounded-full bg-blue-600"
                        animate={{
                          opacity: [
                            0.5,
                            1,
                            0.5,
                          ],
                        }}
                        transition={{
                          duration: 2,
                          repeat:
                            Infinity,
                          delay:
                            index *
                            0.25,
                        }}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        {item.type}
                      </p>

                      <p className="mt-1.5 break-all text-sm font-semibold text-slate-950">
                        {item.value}
                      </p>
                    </div>
                  </motion.div>
                ),
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            Chưa ghi nhận thông tin liên
            quan.
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default RelatedInformation