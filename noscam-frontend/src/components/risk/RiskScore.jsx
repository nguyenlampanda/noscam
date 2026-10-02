import {
  useEffect,
  useState,
} from 'react'
import { motion } from 'motion/react'

import RiskBadge from './RiskBadge'

const levelConfig = {
  safe: {
    glow: 'rgba(34,197,94,0.18)',
    bar: 'bg-emerald-500',
  },
  low: {
    glow: 'rgba(59,130,246,0.2)',
    bar: 'bg-blue-500',
  },
  medium: {
    glow: 'rgba(245,158,11,0.2)',
    bar: 'bg-amber-500',
  },
  high: {
    glow: 'rgba(239,68,68,0.22)',
    bar: 'bg-red-500',
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

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [normalizedScore])

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 24,
        scale: 0.97,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{
        duration: 0.55,
      }}
      className="relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-2xl shadow-slate-950/10 sm:p-7"
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl"
        style={{
          background: config.glow,
        }}
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:text-xs">
            Mức độ rủi ro
          </p>

          <motion.span
            className="h-2.5 w-2.5 rounded-full bg-blue-500"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
            }}
          />
        </div>

        <div className="mt-6 flex items-end gap-2 sm:mt-7">
          <motion.span
            key={normalizedScore}
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="text-6xl font-bold tracking-[-0.05em] sm:text-7xl"
          >
            {displayScore}
          </motion.span>

          <span className="mb-2 text-base text-slate-400 sm:text-lg">
            /100
          </span>
        </div>

        <div className="mt-4">
          <RiskBadge level={level}>
            {label}
          </RiskBadge>
        </div>

        <div className="mt-7">
          <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-800">
            <motion.div
              initial={{
                width: 0,
              }}
              animate={{
                width: `${normalizedScore}%`,
              }}
              transition={{
                duration: 0.9,
                delay: 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`relative h-full rounded-full ${config.bar}`}
            >
              <motion.div
                className="absolute inset-0 bg-white/30"
                animate={{
                  x: ['-100%', '120%'],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
              />
            </motion.div>
          </div>

          <div className="mt-2 flex justify-between text-[11px] text-slate-500">
            <span>0</span>
            <span>100</span>
          </div>
        </div>

        <p className="mt-6 text-sm leading-6 text-slate-300">
          Điểm số được tổng hợp từ các
          tín hiệu và dữ liệu mà hệ thống
          hiện ghi nhận.
        </p>

        <div className="mt-6 border-t border-slate-800 pt-5">
          <p className="text-xs leading-5 text-slate-400">
            Risk Score chỉ mang tính cảnh
            báo dựa trên dữ liệu hệ thống,
            không phải kết luận một cá
            nhân hoặc tổ chức là lừa đảo.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default RiskScore