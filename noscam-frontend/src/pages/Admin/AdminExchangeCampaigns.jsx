import NoScamSelect from '../../components/ui/NoScamSelect'
import { useCallback, useEffect, useState } from 'react'
import adminExchangeService from '../../services/adminExchangeService'

const formatCoins = (value) =>
  new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

export default function AdminExchangeCampaigns() {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('')
  const [platform, setPlatform] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  const refresh = useCallback(() => setReload((n) => n + 1), [])

  useEffect(() => {
    let active = true

    adminExchangeService.campaigns({ status, platform, page })
      .then((response) => {
        if (!active) return
        setItems(response.data || [])
        setTotal(response.total || 0)
        setLastPage(response.last_page || 1)
        setError('')
      })
      .catch((err) => {
        if (active) setError(err.message || 'Không thể tải chiến dịch.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [status, platform, page, reload])

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Quản lý chiến dịch</h2>
          <p className="text-sm text-slate-500">Tổng cộng: {total} chiến dịch</p>
        </div>
        <button type="button" onClick={refresh}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">
          Làm mới
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <NoScamSelect value={platform} onChange={(e) => {
          setPlatform(e.target.value); setPage(1); setLoading(true)
        }} className="rounded-xl border border-slate-200 p-3">
          <option value="">Tất cả nền tảng</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="facebook">Facebook</option>
        </NoScamSelect>

        <NoScamSelect value={status} onChange={(e) => {
          setStatus(e.target.value); setPage(1); setLoading(true)
        }} className="rounded-xl border border-slate-200 p-3">
          <option value="">Tất cả trạng thái</option>
          <option value="draft">Nháp</option>
          <option value="active">Đang chạy</option>
          <option value="paused">Tạm dừng</option>
          <option value="completed">Hoàn thành</option>
          <option value="cancelled">Đã hủy</option>
        </NoScamSelect>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Đang tải...</p>}

      {!loading && !error && items.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
          Chưa có chiến dịch phù hợp.
        </p>
      )}

      <div className="grid gap-4">
        {!loading && !error && items.map((item) => (
          <article key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">
                  Chiến dịch #{item.id} — {item.platform} / {item.task_type}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Người tạo #{item.user_id} · {item.quantity} nhiệm vụ
                </p>
              </div>
              <span className="text-sm font-semibold text-blue-700">
                {item.status}
              </span>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
              <p>Tổng ngân sách: {formatCoins(item.budget_total)} xu</p>
              <p>Đang giữ: {formatCoins(item.budget_held)} xu</p>
              <p>Đã quyết toán: {formatCoins(item.budget_settled)} xu</p>
              <p>Đã hoàn: {formatCoins(item.budget_refunded)} xu</p>
            </div>

            <a href={item.target_url} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-block break-all text-sm text-blue-600 underline">
              Xem liên kết mục tiêu
            </a>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <button type="button" disabled={page <= 1 || loading}
          onClick={() => { setPage((p) => p - 1); setLoading(true) }}
          className="rounded-xl border border-slate-200 px-4 py-2 disabled:opacity-40">
          Trang trước
        </button>
        <span className="text-sm text-slate-600">{page} / {lastPage}</span>
        <button type="button" disabled={page >= lastPage || loading}
          onClick={() => { setPage((p) => p + 1); setLoading(true) }}
          className="rounded-xl border border-slate-200 px-4 py-2 disabled:opacity-40">
          Trang sau
        </button>
      </div>
    </section>
  )
}
