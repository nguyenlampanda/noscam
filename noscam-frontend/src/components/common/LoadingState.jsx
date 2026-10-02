import {
  useEffect,
  useState,
} from 'react'
import { motion } from 'motion/react'

const steps = [
  'Chuẩn hóa dữ liệu',
  'Đối chiếu báo cáo',
  'Phân tích liên kết',
  'Tính Risk Score',
]

function LoadingState() {
  const [activeStep, setActiveStep] =
    useState(0)

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        setActiveStep((current) =>
          Math.min(
            current + 1,
            steps.length - 1,
          ),
        )
      }, 420)

    return () =>
      window.clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 18,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/10 sm:p-8"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20 noscam-grid"
      />

      <motion.div
        aria-hidden="true"
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent"
        animate={{
          top: [
            '0%',
            '100%',
            '0%',
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
            <motion.div
              className="absolute inset-0 rounded-full border border-blue-400/30"
              animate={{
                scale: [
                  0.8,
                  1.3,
                  0.8,
                ],
                opacity: [
                  1,
                  0,
                  1,
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />

            <motion.div
              className="absolute inset-2 rounded-full border-2 border-slate-700 border-t-blue-500"
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'linear',
              }}
            />

            <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">
              NOSCAM SCANNER
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Đang kiểm tra dữ liệu
            </h2>
          </div>
        </div>

        <div className="mt-7 overflow-hidden rounded-full bg-slate-800">
          <motion.div
            className="h-1.5 rounded-full bg-blue-500"
            animate={{
              width: `${
                ((activeStep + 1) /
                  steps.length) *
                100
              }%`,
            }}
            transition={{
              duration: 0.35,
            }}
          />
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {steps.map(
            (step, index) => {
              const complete =
                index < activeStep

              const active =
                index === activeStep

              return (
                <motion.div
                  key={step}
                  animate={{
                    opacity:
                      index <=
                      activeStep
                        ? 1
                        : 0.4,
                    scale: active
                      ? 1.015
                      : 1,
                  }}
                  className={`flex items-center gap-3 rounded-2xl border p-4 ${
                    active
                      ? 'border-blue-500/40 bg-blue-500/10'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      complete
                        ? 'bg-emerald-500'
                        : active
                          ? 'bg-blue-500'
                          : 'bg-slate-800'
                    }`}
                  >
                    {complete ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="h-3.5 w-3.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m5 12 4 4L19 6"
                        />
                      </svg>
                    ) : active ? (
                      <motion.div
                        className="h-2 w-2 rounded-full bg-white"
                        animate={{
                          opacity: [
                            0.4,
                            1,
                            0.4,
                          ],
                        }}
                        transition={{
                          duration: 1,
                          repeat:
                            Infinity,
                        }}
                      />
                    ) : (
                      <span className="text-[10px] text-slate-500">
                        {index + 1}
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Bước {index + 1}
                    </p>

                    <p
                      className={`mt-0.5 text-sm font-medium ${
                        active
                          ? 'text-white'
                          : 'text-slate-300'
                      }`}
                    >
                      {step}
                    </p>
                  </div>
                </motion.div>
              )
            },
          )}
        </div>

        <p className="mt-6 text-xs leading-5 text-slate-500">
          Hệ thống đang đối chiếu các
          tín hiệu hiện có. Quá trình
          này không xác định một cá
          nhân hoặc tổ chức là lừa đảo.
        </p>
      </div>
    </motion.div>
  )
}

export default LoadingState