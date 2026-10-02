import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

import RiskBadge from './RiskBadge'

function AlertCard({ alert }) {
  return (
    <motion.article
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
        amount: 0.2,
      }}
      whileHover={{
        y: -5,
        scale: 1.01,
      }}
      transition={{
        duration: 0.3,
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
              {alert.type}
            </span>

            <RiskBadge
              level={alert.riskLevel}
            >
              {alert.riskLabel}
            </RiskBadge>
          </div>

          <p className="mt-3 break-all text-base font-semibold text-slate-950 transition-colors group-hover:text-blue-700 sm:text-lg">
            {alert.value}
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {alert.description}
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-slate-100 pt-4 sm:block sm:border-0 sm:pt-0 sm:text-right">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              {alert.reports} báo cáo
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {alert.time}
            </p>
          </div>

          <motion.div
            whileHover={{
              scale: 1.05,
            }}
            whileTap={{
              scale: 0.96,
            }}
          >
            <Link
              to={`/search?q=${encodeURIComponent(
                alert.value,
              )}`}
              className="ml-4 inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-600 sm:ml-0 sm:mt-4"
            >
              Kiểm tra
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.article>
  )
}

export default AlertCard