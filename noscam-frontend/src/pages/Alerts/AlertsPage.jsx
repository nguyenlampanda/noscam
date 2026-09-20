import { useEffect, useState } from 'react'

import Container from '../../components/layout/Container'
import AlertCard from '../../components/risk/AlertCard'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'

import { alertFilters } from '../../data/alerts'
import useAlerts from '../../hooks/useAlerts'
function AlertsPage() {
  const [activeFilter, setActiveFilter] = useState('all')

  const {
    alerts,
    pagination,
    status,
    error,
    loadAlerts,
  } = useAlerts()

  useEffect(() => {
    loadAlerts({
      category: activeFilter,
      page: 1,
    })
  }, [activeFilter, loadAlerts])

  const handleRetry = () => {
    loadAlerts({
      category: activeFilter,
      page: 1,
    })
  }

  const isLoading = status === 'loading'
  const isError = status === 'error'
  const isSuccess = status === 'success'
  const isEmpty =
    status === 'empty' ||
    (isSuccess && alerts.length === 0)

  return (
    <>
      <section className="border-b border-slate-200 bg-slate-50/60 py-10 sm:py-16">
        <Container>
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-blue-600">
              Dữ liệu cảnh báo
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Cảnh báo từ cộng đồng
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:mt-4 sm:text-base sm:leading-7">
              Theo dõi các thông tin đang được người dùng gửi báo cáo
              và hệ thống ghi nhận để hỗ trợ quá trình kiểm tra trước
              khi giao dịch.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-white py-8 sm:py-14">
        <Container>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
            <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
              {alertFilters.map((filter) => {
                const isActive =
                  activeFilter === filter.value

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() =>
                      setActiveFilter(filter.value)
                    }
                    disabled={isLoading}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
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

          {isSuccess && alerts.length > 0 && (
            <div className="mt-7 flex items-center justify-between gap-4 border-b border-slate-200 pb-4 sm:mt-8">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-950">
                  {pagination?.total ?? alerts.length}
                </span>{' '}
                cảnh báo
              </p>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 sm:text-xs">
                Dữ liệu hệ thống
              </span>
            </div>
          )}

          {isLoading && (
            <div className="mt-8">
              <LoadingState
                title="Đang tải cảnh báo"
                description="NoScam đang tải các cảnh báo và dữ liệu mới nhất được hệ thống ghi nhận."
              />
            </div>
          )}

          {isError && (
            <div className="mt-8">
              <ErrorState
                title="Không thể tải cảnh báo"
                description={
                  error ||
                  'NoScam chưa thể kết nối tới dữ liệu cảnh báo. Vui lòng thử lại.'
                }
                onRetry={handleRetry}
              />
            </div>
          )}

          {isEmpty && (
            <div className="mt-6">
              <EmptyState
                title="Chưa có cảnh báo"
                description="Hiện tại chưa có dữ liệu cảnh báo phù hợp với nhóm thông tin này."
              />
            </div>
          )}

          {isSuccess && alerts.length > 0 && (
            <>
              <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4">
                {alerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                  />
                ))}
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:mt-10 sm:p-6">
                <p className="text-sm font-semibold text-slate-950">
                  Lưu ý về dữ liệu cảnh báo
                </p>

                <p className="mt-2 max-w-4xl text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
                  Thông tin xuất hiện trong danh sách phản ánh dữ liệu
                  và báo cáo được hệ thống ghi nhận. Việc xuất hiện tại
                  đây không phải là kết luận một cá nhân hoặc tổ chức
                  đã thực hiện hành vi lừa đảo. Người dùng nên kiểm tra
                  thêm các thông tin liên quan trước khi đưa ra quyết
                  định giao dịch.
                </p>
              </div>
            </>
          )}
        </Container>
      </section>
    </>
  )
}

export default AlertsPage