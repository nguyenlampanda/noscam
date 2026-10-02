import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

import RiskBadge from './RiskBadge'

const scoreStyles = {
  high:
    'border-red-200 bg-red-50 text-red-700',

  medium:
    'border-amber-200 bg-amber-50 text-amber-700',

  low:
    'border-blue-200 bg-blue-50 text-blue-700',
}

function AlertCard({ alert }) {
  const scoreStyle =
    scoreStyles[
      alert.riskLevel
    ] || scoreStyles.low

  return (
    <motion.article
      whileHover={{
        y: -5,
        scale: 1.005,
      }}
      transition={{
        duration: 0.25,
      }}
      className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-xl hover:shadow-slate-200/60 sm:p-6"
    >
      <motion.div
        aria-hidden="true"
        className="absolute left-0 top-0 h-1 bg-blue-500"
        initial={{
          width: 0,
        }}
        whileHover={{
          width: '100%',
        }}
        transition={{
          duration: 0.35,
        }}
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 sm:text-xs">
              {alert.type}
            </span>

            <RiskBadge
              level={
                alert.riskLevel
              }
            >
              {
                alert.riskLabel
              }
            </RiskBadge>
          </div>

          <p className="mt-3 break-all text-base font-bold text-slate-950 transition-colors group-hover:text-blue-700 sm:text-lg">
            {alert.value}
          </p>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {
              alert.description
            }
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
            <span>
              <strong className="font-semibold text-slate-700">
                {alert.reports}
              </strong>{' '}
              báo cáo đã duyệt
            </span>

            {alert.time && (
              <span>
                Cập nhật{' '}
                {alert.time}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 pt-4 lg:min-w-[210px] lg:border-0 lg:pt-0">
          <motion.div
            whileHover={{
              scale: 1.04,
            }}
            className={`min-w-[92px] rounded-2xl border px-4 py-3 text-center ${scoreStyle}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">
              Risk Score
            </p>

            <p className="mt-1 text-2xl font-black tracking-[-0.04em]">
              {
                alert.riskScore
              }
            </p>

            <p className="text-[10px] font-semibold opacity-70">
              / 100
            </p>
          </motion.div>

          <motion.div
            whileHover={{
              x: 3,
            }}
            whileTap={{
              scale: 0.96,
            }}
          >
            <Link
              to={`/search?q=${encodeURIComponent(
                alert.value,
              )}`}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-xs font-bold text-white transition-colors hover:bg-blue-600"
            >
              Tra cứu →
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.article>
  )
}

export default AlertCard
