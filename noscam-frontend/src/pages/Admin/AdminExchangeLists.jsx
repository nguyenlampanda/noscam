import NoScamSelect from '../../components/ui/NoScamSelect'
import { useCallback, useEffect, useState } from 'react'
import adminExchangeService from '../../services/adminExchangeService'

const formatNumber = (value) =>
  new Intl.NumberFormat('vi-VN').format(Number(value || 0))

const statusLabels = {
  draft: 'Bản nháp',
  active: 'Đang chạy',
  paused: 'Tạm dừng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  pending: 'Chờ xử lý',
  approved: 'Đã chấp thuận',
  rejected: 'Đã từ chối',
}

export default function AdminExchangeLists({ type }) {
  const [status, setStatus] = useState(type === 'disputes' ? 'pending' : '')
  const [platform, setPlatform] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    try {
      const data = type === 'campaigns'
        ? await adminExchangeService.campaigns({ status, platform, page })
        : await adminExchangeService.disputes({ status, page })
      if (!signal.aborted) setResult(data)
    } catch (err) {
      if (!signal.aborted) setError(err.message || 'Không tải được dữ liệu.')
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [type, status, platform, page])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load, refresh])

  const isCampaign = type === 'campaigns'
  const items = result?.data || []
  const lastPage = result?.last_page || 1

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            {isCampaign ? 'Quản lý chiến dịch' : 'Quản lý khiếu nại'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isCampaign
              ? 'Theo dõi các chiến dịch kiếm xu trên hệ thống.'
              : 'Theo dõi khiếu nại của người thực hiện nhiệm vụ.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefresh((n) => n + 1)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold"
        >
          Làm mới
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <NoScamSelect
          aria-label="Lọc trạng thái"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          {isCampaign && <option value="">Tất cả trạng thái</option>}
          {(isCampaign
            ? ['draft', 'active', 'paused', 'completed', 'cancelled']
            : ['pending', 'approved', 'rejected']
          ).map((item) => (
            <option key={item} value={item}>{statusLabels[item]}</option>
          ))}
        </NoScamSelect>

        {isCampaign && (
          <NoScamSelect
            aria-label="Lọc nền tảng"
            value={platform}
            onChange={(e) => { setPlatform(e.target.value); setPage(1) }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="">Tất cả nền tảng</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="facebook">Facebook</option>
          </NoScamSelect>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <p className="p-8 text-center text-slate-500">Đang tải dữ liệu...</p>
        ) : !items.length ? (
          <p className="p-8 text-center text-slate-500">
            {error ? 'Không thể hiển thị dữ liệu.' : 'Chưa có dữ liệu phù hợp.'}
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <article key={item.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900">
                      {isCampaign
                        ? `Chiến dịch #${item.id}`
                        : `Khiếu nại #${item.id}`}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {isCampaign
                        ? `${item.platform} · ${item.task_type} · ${item.quantity} nhiệm vụ`
                        : `Nhiệm vụ #${item.claim_id} · ${item.claim?.submitted_username || 'Chưa có tài khoản'}`}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {statusLabels[item.status] || item.status}
                  </span>
                </div>

                {isCampaign ? (
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <p>Ngân sách: <strong>{formatNumber(item.budget_total)} xu</strong></p>
                    <p>Đã thanh toán: <strong>{formatNumber(item.budget_settled)} xu</strong></p>
                    <p>Đã hoàn: <strong>{formatNumber(item.budget_refunded)} xu</strong></p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">
                    Lý do: {item.appeal_reason || 'Không có'}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-500">
          {formatNumber(result?.total)} kết quả · Trang {page}/{lastPage}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-xl border px-4 py-2 font-semibold disabled:opacity-40"
          >
            Trước
          </button>
          <button
            type="button"
            disabled={loading || page >= lastPage}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border px-4 py-2 font-semibold disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      </div>
    </section>
  )
}
