import { Link } from 'react-router-dom'

import Container from '../layout/Container'
import { recentAlerts } from '../../data/recentAlerts'

const riskStyles = {
  high: 'border-red-200 bg-red-50 text-red-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
}

function RecentAlerts() {
  return (
    <section className="bg-white py-14 sm:py-24">
      <Container>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Dữ liệu cộng đồng
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Cảnh báo gần đây
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
              Một số thông tin vừa được cộng đồng gửi báo cáo và đang được
              hệ thống ghi nhận để hỗ trợ quá trình đánh giá rủi ro.
            </p>
          </div>

          <Link
            to="/alerts"
            className="text-sm font-semibold text-slate-700 transition-colors hover:text-blue-600"
          >
            Xem tất cả cảnh báo →
          </Link>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 sm:mt-10">
          {recentAlerts.map((alert, index) => (
            <div
              key={alert.id}
              className={`bg-white p-5 transition-colors hover:bg-slate-50 sm:grid sm:grid-cols-[1fr_auto] sm:items-center sm:gap-5 sm:p-6 ${
                index !== recentAlerts.length - 1
                  ? 'border-b border-slate-200'
                  : ''
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
                    {alert.type}
                  </span>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs ${
                      riskStyles[alert.riskLevel]
                    }`}
                  >
                    {alert.risk}
                  </span>
                </div>

                <p className="mt-3 break-all text-base font-semibold text-slate-950 sm:text-lg">
                  {alert.value}
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {alert.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 sm:mt-0 sm:block sm:border-0 sm:pt-0 sm:text-right">
                <p className="text-sm font-semibold text-slate-900">
                  {alert.reports} báo cáo
                </p>

                <p className="text-xs text-slate-400 sm:mt-1">
                  {alert.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs leading-5 text-slate-400">
          Thông tin cảnh báo phản ánh dữ liệu và báo cáo được hệ thống ghi
          nhận, không phải kết luận một cá nhân hoặc tổ chức là lừa đảo.
        </p>
      </Container>
    </section>
  )
}

export default RecentAlerts