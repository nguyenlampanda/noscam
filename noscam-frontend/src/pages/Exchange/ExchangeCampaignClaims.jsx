import NoScamSelect from '../../components/ui/NoScamSelect'
import { useNoScamUI } from '../../components/ui/NoScamUI'
import { useEffect, useRef, useState } from 'react'
import exchangeService from '../../services/exchangeService'

const statusNames = {
  claimed: 'Đã nhận',
  submitted: 'Chờ duyệt',
  rejected: 'Đã từ chối',
  disputed: 'Đang khiếu nại',
  settled: 'Đã quyết toán',
  refunded: 'Đã hoàn tiền',
  finalized: 'Đã kết thúc',
}

const filters = [
  ['all', 'Tất cả'],
  ['submitted', 'Chờ duyệt'],
  ['claimed', 'Đã nhận'],
  ['settled', 'Đã quyết toán'],
  ['rejected', 'Từ chối'],
  ['disputed', 'Khiếu nại'],
]

const formatNumber = (value) =>
  Number(value || 0).toLocaleString('vi-VN')

function formatDate(value) {
  if (!value) return 'Chưa có'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Không xác định'
    : date.toLocaleString('vi-VN')
}

function safeProfileUrl(value, platform) {
  try {
    const url = new URL(value)
    const hosts = {
      instagram: ['instagram.com', 'www.instagram.com'],
      tiktok: ['tiktok.com', 'www.tiktok.com'],
      facebook: [
        'facebook.com', 'www.facebook.com',
        'm.facebook.com', 'web.facebook.com',
        'fb.com', 'www.fb.com',
      ],
    }

    return url.protocol === 'https:' &&
      hosts[platform]?.includes(url.hostname.toLowerCase())
      ? url.href
      : null
  } catch {
    return null
  }
}

const taskTypeNames = {
  follow: 'Follow · Theo dõi',
  like: 'Like · Thích',
  comment: 'Comment · Bình luận',
  share: 'Share · Chia sẻ',
  view: 'View · Xem',
  subscribe: 'Subscribe · Đăng ký',
}

function safeTargetUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.href
      : null
  } catch {
    return null
  }
}

export default function ExchangeCampaignClaims({
  campaigns,
  campaignId,
  initialStatus = 'all',
  onReviewSuccess,
}) {
  const { confirm } = useNoScamUI()
  const automatic = campaignId != null
  const [selectedId, setSelectedId] = useState(
    campaignId != null ? String(campaignId) : '',
  )
  const [status, setStatus] = useState(initialStatus)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [reasons, setReasons] = useState({})
  const [refreshKey, setRefreshKey] = useState(0)
  const reviewLock = useRef(false)

  const activeId = automatic ? String(campaignId) : selectedId
  const selectedCampaign = campaigns.find(
    (campaign) => String(campaign.id) === activeId,
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!selectedCampaign) {
      setResult(null)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError('')

    exchangeService.campaignClaims(activeId, page, {
      perPage: 20,
      status,
      search,
    })
      .then((response) => {
        if (!active) return
        setResult({
          campaignId: activeId,
          page: Number(response?.current_page || page),
          lastPage: Number(response?.last_page || 1),
          total: Number(response?.total || 0),
          claims: Array.isArray(response?.data) ? response.data : [],
          stats: response?.stats || null,
          status,
          search,
        })
      })
      .catch((err) => {
        if (!active) return
        setResult(null)
        setError(err?.message || 'Không tải được danh sách nhiệm vụ.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [activeId, Boolean(selectedCampaign), page, status, search, refreshKey])

  const visibleResult =
    result?.campaignId === activeId &&
    result?.page === page &&
    result?.status === status &&
    result?.search === search
      ? result
      : null

  const stats = visibleResult?.stats
  const byStatus = stats?.by_status || {}

  function refresh() {
    setRefreshKey((value) => value + 1)
  }

  function changeStatus(value) {
    if (reviewLock.current) return
    setStatus(value)
    setPage(1)
    setResult(null)
    setError('')
  }

  async function reviewClaim(claim, action) {
    if (reviewLock.current || loading || busyId !== null) return
    if (claim.status !== 'submitted' || claim.risk_hold) return
    if (!visibleResult || !selectedCampaign) return

    const deadline = Date.parse(claim.review_deadline_at || '')
    if (!Number.isFinite(deadline) || deadline <= Date.now()) {
      setError('Đã hết hạn duyệt. Hãy làm mới danh sách.')
      return
    }

    const reason = (reasons[claim.id] || '').trim()
    if (action === 'reject' && (!reason || reason.length > 2000)) {
      setError('Cần nhập lý do từ chối từ 1 đến 2000 ký tự.')
      return
    }

    const message = action === 'approve'
      ? `Duyệt nhiệm vụ #${claim.id}? Xu sẽ được quyết toán nếu thành công.`
      : `Từ chối nhiệm vụ #${claim.id}? Người thực hiện có thể khiếu nại.`

    if (!await confirm(message)) return

    reviewLock.current = true
    setBusyId(claim.id)
    setError('')
    setSuccess('')

    const context = {
      id: activeId,
      page: visibleResult.page,
      status,
      search,
    }

    try {
      const response = await exchangeService.campaignClaims(
        context.id,
        context.page,
        {
          perPage: 20,
          status: context.status,
          search: context.search,
        },
      )

      const freshClaim = (response?.data || []).find(
        (item) => String(item.id) === String(claim.id),
      )

      const freshDeadline = Date.parse(
        freshClaim?.review_deadline_at || '',
      )

      if (
        !freshClaim ||
        freshClaim.status !== 'submitted' ||
        freshClaim.risk_hold ||
        !Number.isFinite(freshDeadline) ||
        freshDeadline <= Date.now()
      ) {
        throw new Error(
          'Trạng thái nhiệm vụ đã thay đổi hoặc hết hạn. Không gửi quyết định.',
        )
      }

      if (action === 'approve') {
        await exchangeService.approveClaim(claim.id)
      } else {
        await exchangeService.rejectClaim(claim.id, reason)
      }

      if (typeof onReviewSuccess === 'function') {
        void onReviewSuccess()
      }

      setSuccess(
        action === 'approve'
          ? `Đã gửi yêu cầu duyệt nhiệm vụ #${claim.id}.`
          : `Đã gửi yêu cầu từ chối nhiệm vụ #${claim.id}.`,
      )
    } catch (err) {
      setError(
        err?.message ||
        'Chưa xác nhận được kết quả. Hãy làm mới trước khi thao tác tiếp.',
      )
    } finally {
      reviewLock.current = false
      setBusyId(null)
      refresh()
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            Quản lý nhiệm vụ chiến dịch
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Tìm kiếm, theo dõi và duyệt nhiệm vụ của người tham gia.
          </p>
        </div>
        <button
          type="button"
          disabled={loading || busyId !== null || !selectedCampaign}
          onClick={refresh}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
        >
          Làm mới
        </button>
      </div>

      {!automatic && (
        <label className="mt-5 block text-sm font-semibold">
          Chọn chiến dịch
          <NoScamSelect
            value={selectedId}
            disabled={busyId !== null}
            onChange={(event) => {
              setSelectedId(event.target.value)
              setPage(1)
              setResult(null)
              setError('')
            }}
            className="mt-2 w-full rounded-xl border border-slate-200 p-3"
          >
            <option value="">Chọn chiến dịch</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                #{campaign.id} · {campaign.platform} · {campaign.task_type}
              </option>
            ))}
          </NoScamSelect>
        </label>
      )}

      {selectedCampaign && (
        <>
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Thông tin nhiệm vụ · Chiến dịch #{selectedCampaign.id}
                </p>
                <h3 className="mt-2 text-lg font-black text-slate-900">
                  {String(selectedCampaign.platform || '').toUpperCase()}
                  {' · '}
                  {taskTypeNames[String(selectedCampaign.task_type || '').toLowerCase()] ||
                    String(selectedCampaign.task_type || 'Chưa xác định')}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Số lượng đặt: {formatNumber(selectedCampaign.quantity)} nhiệm vụ
                </p>
              </div>
              <span className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-600">
                #{selectedCampaign.id}
              </span>
            </div>

            <div className="mt-4 border-t border-blue-100 pt-4">
              <p className="text-xs font-bold text-slate-500">
                Link mục tiêu cần thực hiện
              </p>

              <p className="mt-2 break-all text-sm font-medium text-slate-800">
                {selectedCampaign.target_url || 'Chưa có link mục tiêu'}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {safeTargetUrl(selectedCampaign.target_url) && (
                  <a
                    href={safeTargetUrl(selectedCampaign.target_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white"
                  >
                    Mở link mục tiêu ↗
                  </a>
                )}

                {selectedCampaign.target_url && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          String(selectedCampaign.target_url),
                        )
                        setSuccess('Đã sao chép link mục tiêu.')
                      } catch {
                        setError('Không thể sao chép tự động. Hãy chọn và sao chép link thủ công.')
                      }
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700"
                  >
                    Sao chép link
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['Tổng nhiệm vụ', stats?.total],
              ['Chờ duyệt', byStatus.submitted],
              ['Đã quyết toán', byStatus.settled],
              ['Đã từ chối', byStatus.rejected],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {value == null && !stats ? '...' : formatNumber(value)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <input
              type="search"
              maxLength={100}
              value={searchInput}
              disabled={busyId !== null}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm theo ID nhiệm vụ hoặc tên tài khoản..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <div className="flex flex-wrap gap-2">
              {filters.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => changeStatus(value)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${
                    status === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {success && (
            <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">
              {success}
            </p>
          )}

          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Tài khoản</th>
                  <th className="px-4 py-3">Thời gian nộp</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Đang tải nhiệm vụ...
                    </td>
                  </tr>
                )}

                {!loading && visibleResult?.claims.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Không tìm thấy nhiệm vụ phù hợp.
                    </td>
                  </tr>
                )}

                {!loading && visibleResult?.claims.map((claim) => {
                  const profile = safeProfileUrl(
                    claim.social_profile_url,
                    selectedCampaign.platform,
                  )
                  const actionable =
                    claim.status === 'submitted' && !claim.risk_hold
                  const deadline = Date.parse(claim.review_deadline_at || '')
                  const canReview =
                    actionable &&
                    Number.isFinite(deadline) &&
                    deadline > Date.now()

                  return (
                    <tr key={claim.id} className="align-top">
                      <td className="px-4 py-4 font-bold">#{claim.id}</td>
                      <td className="px-4 py-4">
                        <p className="font-semibold">
                          {claim.social_username || 'Chưa xác định'}
                        </p>
                        {profile && (
                          <a
                            href={profile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs font-bold text-blue-600 underline"
                          >
                            Xem tài khoản
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600">
                        {formatDate(claim.submitted_at)}
                        {actionable && (
                          <p className="mt-1">
                            Hạn duyệt: {formatDate(claim.review_deadline_at)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-block rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold">
                          {statusNames[claim.status] || claim.status}
                        </span>
                        {claim.risk_hold && (
                          <p className="mt-2 text-xs text-amber-700">
                            Đang kiểm tra rủi ro
                          </p>
                        )}
                        {claim.rejection_reason && (
                          <p className="mt-2 max-w-xs text-xs text-red-700">
                            {claim.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {canReview ? (
                          <div className="flex min-w-[180px] flex-col gap-2">
                            <button
                              type="button"
                              disabled={busyId !== null}
                              onClick={() => reviewClaim(claim, 'approve')}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                            >
                              {busyId === claim.id ? 'Đang xử lý...' : 'Duyệt'}
                            </button>
                            <textarea
                              rows={2}
                              maxLength={2000}
                              disabled={busyId !== null}
                              value={reasons[claim.id] || ''}
                              onChange={(event) => setReasons((current) => ({
                                ...current,
                                [claim.id]: event.target.value,
                              }))}
                              placeholder="Lý do từ chối..."
                              className="rounded-lg border border-slate-200 p-2 text-xs"
                            />
                            <button
                              type="button"
                              disabled={
                                busyId !== null ||
                                !(reasons[claim.id] || '').trim()
                              }
                              onClick={() => reviewClaim(claim, 'reject')}
                              className="rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {actionable ? 'Đã hết hạn duyệt' : 'Không có thao tác'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {visibleResult && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {formatNumber(visibleResult.total)} kết quả · Tối đa 20 nhiệm vụ/trang
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={loading || busyId !== null || page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40"
                >
                  Trang trước
                </button>
                <span className="text-xs font-bold">
                  {page} / {visibleResult.lastPage}
                </span>
                <button
                  type="button"
                  disabled={
                    loading ||
                    busyId !== null ||
                    page >= visibleResult.lastPage
                  }
                  onClick={() => setPage((value) => value + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40"
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
