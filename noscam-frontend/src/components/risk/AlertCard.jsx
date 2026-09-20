import { Link } from 'react-router-dom'

import RiskBadge from './RiskBadge'

function AlertCard({ alert }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:bg-slate-50 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
              {alert.type}
            </span>

            <RiskBadge level={alert.riskLevel}>
              {alert.riskLabel}
            </RiskBadge>
          </div>

          <p className="mt-3 break-all text-base font-semibold text-slate-950 sm:text-lg">
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

          <Link
            to={`/search?q=${encodeURIComponent(alert.value)}`}
            className="ml-4 inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-600 sm:mt-4 sm:ml-0"
          >
            Kiểm tra
          </Link>
        </div>
      </div>
    </article>
  )
}

export default AlertCard