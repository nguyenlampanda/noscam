import { motion } from 'motion/react'

const severityStyles = {
  high: {
    dot: 'bg-red-500',
    badge:
      'bg-red-50 text-red-700 border-red-100',
    label: 'Tín hiệu mạnh',
  },
  medium: {
    dot: 'bg-amber-500',
    badge:
      'bg-amber-50 text-amber-700 border-amber-100',
    label: 'Cần lưu ý',
  },
  low: {
    dot: 'bg-blue-500',
    badge:
      'bg-blue-50 text-blue-700 border-blue-100',
    label: 'Tín hiệu nhẹ',
  },
}

function RiskFactors({
  factors = [],
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">
          Risk analysis
        </p>

        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
          Vì sao có Risk Score này?
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Điểm được tổng hợp từ những tín
          hiệu mà hệ thống hiện ghi nhận.
          Mỗi tín hiệu chỉ là một phần của
          đánh giá tổng thể.
        </p>
      </div>

      {factors.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {factors.map(
            (factor, index) => {
              const style =
                severityStyles[
                  factor.severity
                ] ||
                severityStyles.medium

              return (
                <motion.div
                  key={
                    factor.id ??
                    `${factor.title}-${index}`
                  }
                  initial={{
                    opacity: 0,
                    x: -15,
                  }}
                  whileInView={{
                    opacity: 1,
                    x: 0,
                  }}
                  viewport={{
                    once: true,
                    amount: 0.4,
                  }}
                  transition={{
                    delay:
                      index * 0.06,
                  }}
                  className="group flex gap-4 p-5 transition hover:bg-slate-50/80 sm:p-6"
                >
                  <div className="relative mt-1">
                    <motion.div
                      className={`h-3 w-3 rounded-full ${style.dot}`}
                      animate={{
                        scale: [
                          1,
                          1.25,
                          1,
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay:
                          index * 0.2,
                      }}
                    />

                    {index !==
                      factors.length -
                        1 && (
                      <div className="absolute left-1/2 top-5 h-8 w-px -translate-x-1/2 bg-slate-200" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-bold text-slate-950">
                        {factor.title}
                      </p>

                      <span
                        className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold ${style.badge}`}
                      >
                        {style.label}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {
                        factor.description
                      }
                    </p>
                  </div>
                </motion.div>
              )
            },
          )}
        </div>
      ) : (
        <div className="p-6">
          <p className="text-sm leading-6 text-slate-500">
            Chưa có tín hiệu chi tiết để
            hiển thị cho kết quả này.
          </p>
        </div>
      )}

      <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
        <p className="text-xs leading-5 text-slate-500">
          Số lượng tín hiệu không đồng nghĩa
          số lượng người độc lập đã xác nhận
          thông tin này.
        </p>
      </div>
    </section>
  )
}

export default RiskFactors