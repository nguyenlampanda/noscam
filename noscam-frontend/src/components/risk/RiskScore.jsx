import {
  useEffect,
  useState,
} from 'react'

import { motion } from 'motion/react'

import RiskBadge from './RiskBadge'

const levelConfig = {
  safe: {
    bar: 'bg-emerald-500',
    glow: 'rgba(16,185,129,.22)',
    text: 'text-emerald-300',
    description:
      'Chưa ghi nhận đủ tín hiệu để xếp vào nhóm rủi ro cao hơn.',
  },
  low: {
    bar: 'bg-blue-500',
    glow: 'rgba(59,130,246,.24)',
    text: 'text-blue-300',
    description:
      'Hệ thống đang ghi nhận một số tín hiệu cần lưu ý.',
  },
  medium: {
    bar: 'bg-amber-500',
    glow: 'rgba(245,158,11,.24)',
    text: 'text-amber-300',
    description:
      'Có nhiều tín hiệu cảnh báo. Nên kiểm tra kỹ trước khi giao dịch.',
  },
  high: {
    bar: 'bg-red-500',
    glow: 'rgba(239,68,68,.26)',
    text: 'text-red-300',
    description:
      'Hệ thống đang ghi nhận nhiều tín hiệu rủi ro đáng chú ý.',
  },
}

function RiskScore({
  score,
  label,
  level = 'medium',
}) {
  const normalizedScore = Math.min(
    100,
    Math.max(0, Number(score) || 0),
  )

  const [displayScore, setDisplayScore] =
    useState(0)

  const config =
    levelConfig[level] ||
    levelConfig.medium

  useEffect(() => {
    const duration = 850
    const start = performance.now()
    let frame

    const animate = (now) => {
      const progress = Math.min(
        (now - start) / duration,
        1,
      )

      const eased =
        1 - Math.pow(1 - progress, 3)

      setDisplayScore(
        Math.round(
          normalizedScore * eased,
        ),
      )

      if (progress < 1) {
        frame =
          requestAnimationFrame(
            animate,
          )
      }
    }

    frame =
      requestAnimationFrame(animate)

    return () =>
      cancelAnimationFrame(frame)
  }, [normalizedScore])

  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 22,
        scale: 0.98,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/10 sm:p-7"
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl"
        style={{
          background: config.glow,
        }}
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.55, 1, 0.55],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-slate-400">
              NoScam Risk Score
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Thang cảnh báo 0–100
            </p>
          </div>

          <motion.span
            className="h-2.5 w-2.5 rounded-full bg-blue-500"
            animate={{
              scale: [1, 1.6, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
            }}
          />
        </div>

        <div className="mt-7 flex items-end gap-2">
          <span className="text-6xl font-black tracking-[-0.06em] sm:text-7xl">
            {displayScore}
          </span>

          <span className="mb-2 text-lg text-slate-500">
            /100
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <RiskBadge level={level}>
            {label}
          </RiskBadge>

          <span
            className={`text-xs font-semibold ${config.text}`}
          >
            Mức cảnh báo hiện tại
          </span>
        </div>

        <div className="mt-7">
          <div className="relative h-3 overflow-hidden rounded-full bg-slate-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${normalizedScore}%`,
              }}
              transition={{
                duration: 0.9,
                ease: [
                  0.16,
                  1,
                  0.3,
                  1,
                ],
              }}
              className={`relative h-full rounded-full ${config.bar}`}
            >
              <motion.div
                className="absolute inset-0 bg-white/30"
                animate={{
                  x: ['-110%', '130%'],
                }}
                transition={{
                  duration: 1.7,
                  repeat: Infinity,
                  repeatDelay: 1.2,
                }}
              />
            </motion.div>
          </div>

          <div className="mt-2 grid grid-cols-4 text-[10px] font-medium text-slate-500">
            <span>0</span>
            <span className="text-center">
              20
            </span>
            <span className="text-center">
              50
            </span>
            <span className="text-right">
              80+
            </span>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm leading-6 text-slate-300">
            {config.description}
          </p>
        </div>

        <div className="mt-5 border-t border-slate-800 pt-5">
          <p className="text-xs leading-5 text-slate-400">
            Đây là điểm cảnh báo tổng hợp
            từ dữ liệu hệ thống, không phải
            tỷ lệ phần trăm khả năng lừa đảo
            và không phải kết luận một cá
            nhân hoặc tổ chức là lừa đảo.
          </p>
        </div>
      </div>
    </motion.section>
  )
}

export default RiskScore