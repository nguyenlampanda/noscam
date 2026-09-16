import { Link } from 'react-router-dom'

import RiskBadge from './RiskBadge'

function AlertCard({ alert }) {
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {alert.type}
            </span>

            <RiskBadge level={alert.riskLevel}>
              {alert.riskLabel}
            </RiskBadge>
          </div>

          <h2 className="mt-4 break-all text-lg font-semibold text-slate-950">
            {alert.value}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {alert.description}
          </p>
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="text-sm font-semibold text-slate-900">
            {alert.reports} báo cáo
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {alert.time}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <Link
          to={`/search?q=${encodeURIComponent(alert.value)}`}
          className="text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
        >
          Xem kết quả kiểm tra →
        </Link>
      </div>
    </article>
  )
}

export default AlertCard