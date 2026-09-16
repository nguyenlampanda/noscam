import { useMemo, useState } from 'react'

import Container from '../../components/layout/Container'
import AlertCard from '../../components/risk/AlertCard'

import {
  alertFilters,
  alerts,
} from '../../data/alerts'

function AlertsPage() {
  const [activeFilter, setActiveFilter] = useState('all')

  const filteredAlerts = useMemo(() => {
    if (activeFilter === 'all') {
      return alerts
    }

    return alerts.filter(
      (alert) => alert.category === activeFilter,
    )
  }, [activeFilter])

  return (
    <>
      <section className="border-b border-slate-200 bg-slate-50/60 py-14 sm:py-16">
        <Container>
          <div className="mx-auto max-w-5xl">
            <p className="text-sm font-semibold text-blue-600">
              Dữ liệu cộng đồng
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Cảnh báo gần đây
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
              Theo dõi các thông tin vừa được cộng đồng gửi báo cáo
              và những tín hiệu rủi ro đang được hệ thống ghi nhận.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {alertFilters.map((filter) => {
                const isActive = activeFilter === filter.id

                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'border-slate-950 bg-slate-950 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
                    }`}
                  >
                    {filter.label}
                  </button>
                )
              })}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-slate-500">
                Hiển thị{' '}
                <span className="font-semibold text-slate-950">
                  {filteredAlerts.length}
                </span>{' '}
                cảnh báo
              </p>

              <p className="text-xs text-slate-400">
                Dữ liệu demo
              </p>
            </div>

            {filteredAlerts.length > 0 ? (
              <div className="mt-6 space-y-4">
                {filteredAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-14 text-center">
                <p className="text-sm font-semibold text-slate-900">
                  Chưa có cảnh báo
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Hiện chưa có dữ liệu trong nhóm này.
                </p>
              </div>
            )}

            <div className="mt-8 border-l-2 border-blue-600 pl-5">
              <p className="text-sm font-semibold text-slate-950">
                Lưu ý khi sử dụng dữ liệu
              </p>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Cảnh báo phản ánh dữ liệu và báo cáo mà hệ thống ghi nhận.
                Việc một thông tin xuất hiện tại đây không phải là kết luận
                một cá nhân hoặc tổ chức đã thực hiện hành vi lừa đảo.
              </p>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}

export default AlertsPage