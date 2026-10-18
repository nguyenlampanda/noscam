import CustomSelect from '../../components/ui/CustomSelect'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import exchangeService from '../../services/exchangeService'
import ExchangeAccounts from './ExchangeAccounts'
import ExchangeAvailableTasks from './ExchangeAvailableTasks'
import ExchangeMyClaims from './ExchangeMyClaims'
import ExchangeCampaignClaims from './ExchangeCampaignClaims'
import ExchangeCreateCampaign from './ExchangeCreateCampaign'
import customerService, {
  getCustomerToken,
} from '../../services/customerService'

const formatCoins = (value) =>
  `${Math.round(Number(value || 0)).toLocaleString('vi-VN')} xu`

const platformNames = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
}

const taskNames = {
  follow: 'Theo dõi',
  like: 'Thích',
  comment: 'Bình luận',
}

export default function ExchangePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wallet, setWallet] = useState(null)
  const [prices, setPrices] = useState([])
  const [tasks, setTasks] = useState([])
  const [claims, setClaims] = useState([])
  const [allTaskClaims, setAllTaskClaims] = useState([])
  const [claimsReady, setClaimsReady] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [campaignPage, setCampaignPage] = useState(1)
  const [campaignLastPage, setCampaignLastPage] = useState(1)
  const [pendingReviewTotal, setPendingReviewTotal] = useState(0)
  const [campaignsPendingTotal, setCampaignsPendingTotal] = useState(0)
  const [campaignRefreshKey, setCampaignRefreshKey] = useState(0)
  const [accounts, setAccounts] = useState([])
  const [activeTab, setActiveTab] = useState('tasks')
  const [openCampaignId, setOpenCampaignId] = useState(null)
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [campaignSearch, setCampaignSearch] = useState('')


  const loggedIn = Boolean(getCustomerToken())

  const refreshCampaignSummary = useCallback(async () => {
    try {
      const response = await exchangeService.campaigns(campaignPage)

      setCampaigns(response?.data || [])
      setCampaignLastPage(Number(response?.last_page || 1))
      setPendingReviewTotal(Number(response?.pending_review_total || 0))
      setCampaignsPendingTotal(Number(response?.campaigns_pending_total || 0))
    } catch {
      // Giữ số liệu hiện tại nếu làm mới thất bại.
    }
  }, [campaignPage])

  const load = useCallback(async () => {
    setLoading(true)
    setClaimsReady(false)
    setError('')

    if (!getCustomerToken()) {
      setLoading(false)
      return
    }

    try {
      const [
        walletResponse,
        priceResponse,
        taskResponse,
        campaignResponse,
        accountResponse,
        claimResponse,
      ] = await Promise.all([
        customerService.wallet(),
        exchangeService.prices(),
        exchangeService.tasks(),
        exchangeService.campaigns(campaignPage),
        exchangeService.accounts(),
        exchangeService.myClaims(),
      ])

      setWallet(walletResponse?.data || null)
      setPrices(priceResponse?.data || [])
      setTasks(taskResponse?.data || [])
      setCampaigns(campaignResponse?.data || [])
      setCampaignLastPage(Number(campaignResponse?.last_page || 1))
      setPendingReviewTotal(Number(campaignResponse?.pending_review_total || 0))
      setCampaignsPendingTotal(Number(campaignResponse?.campaigns_pending_total || 0))
      setAccounts(accountResponse?.data || [])
      setClaims(claimResponse?.data || [])

      // Lấy đủ các trang, không chỉ 15 claim đầu tiên.
      const lastPage = Number(claimResponse?.last_page || 1)
      if (!Number.isSafeInteger(lastPage) || lastPage < 1 || lastPage > 200) {
        throw new Error('Danh sách nhiệm vụ quá lớn để xác minh. Vui lòng thử lại.')
      }

      const allClaims = [...(claimResponse?.data || [])]
      for (let pageNumber = 2; pageNumber <= lastPage; pageNumber += 1) {
        const response = await exchangeService.myClaims(pageNumber)
        if (!Array.isArray(response?.data)) {
          throw new Error('Không tải đủ danh sách nhiệm vụ đã nhận.')
        }
        allClaims.push(...response.data)
      }
      setAllTaskClaims(allClaims)
      setClaimsReady(true)
    } catch (err) {
      setClaimsReady(false)
      setError(err?.message || 'Không tải được dữ liệu Exchange.')
    } finally {
      setLoading(false)
    }
  }, [campaignPage])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="min-h-[75vh] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-widest text-blue-600">
              NoScam Exchange
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Trung tâm nhiệm vụ và xu
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Quản lý chiến dịch, tài khoản mạng xã hội và
              nhiệm vụ trong cùng một hệ thống ví NoScam.
              1 xu tương đương 1 VNĐ, không hỗ trợ rút tiền.
            </p>
          </div>
          <Link
            to="/wallet"
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            Quản lý ví
          </Link>
        </div>

        {!loggedIn ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-xl font-bold">Đăng nhập để tiếp tục</h2>
            <p className="mt-2 text-sm text-slate-500">
              Bạn cần tài khoản NoScam để xem và quản lý nhiệm vụ.
            </p>
            <Link
              to="/login"
              className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
            >
              Đăng nhập
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
                <button
                  type="button"
                  onClick={load}
                  className="ml-3 font-bold underline"
                >
                  Thử lại
                </button>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Số dư khả dụng', formatCoins(wallet?.balance)],
                ['Tài khoản liên kết', accounts.length],
                ['Chiến dịch của bạn', campaigns.length],
                ['Nhiệm vụ đang hiển thị', tasks.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {loading ? '...' : value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              {[
                ['tasks', 'Làm nhiệm vụ'],
                ['create', 'Tạo chiến dịch'],
                ['campaigns', 'Quản lý chiến dịch'],
                ['mine', 'Nhiệm vụ của tôi'],
                ['accounts', 'Quản lý tài khoản'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  aria-current={activeTab === key ? 'page' : undefined}
                  className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
                    activeTab === key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'tasks' && (
              <div className="mt-6 space-y-6">
                <ExchangeAvailableTasks
                  tasks={tasks}
                  accounts={accounts}
                  myTasks={allTaskClaims}
                  claimsReady={claimsReady}
                  loading={loading}
                  onRefresh={load}
                />

              </div>
            )}

            {activeTab === 'accounts' && (
              <div className="mt-6 space-y-5">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <h2 className="text-xl font-black text-slate-950">
                    Quản lý tài khoản mạng xã hội
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Thêm và quản lý tài khoản Instagram, TikTok, Facebook
                    để thực hiện nhiệm vụ. Bạn không cần cung cấp mật khẩu.
                  </p>
                </div>
                <ExchangeAccounts
                  accounts={accounts}
                  onRefresh={load}
                />
              </div>
            )}

            {activeTab === 'create' && (
              <ExchangeCreateCampaign
                prices={prices}
                balance={wallet?.balance}
                onRefresh={load}
              />
            )}

            {activeTab === 'campaigns' && (
              <div className="mt-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-slate-950">
                      Chiến dịch của tôi
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Xem chiến dịch nào có người đang chờ bạn xác nhận.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={load}
                    disabled={loading}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold disabled:opacity-50"
                  >
                    {loading ? 'Đang cập nhật...' : 'Cập nhật danh sách'}
                  </button>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-semibold text-amber-900">
                    Người đang chờ bạn xác nhận
                  </p>
                  <p className="mt-1 text-3xl font-black text-amber-950">
                    {pendingReviewTotal.toLocaleString('vi-VN')}
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    Thuộc {campaignsPendingTotal.toLocaleString('vi-VN')} chiến dịch có người chờ xác nhận.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="search"
                    value={campaignSearch}
                    onChange={(event) => setCampaignSearch(event.target.value)}
                    placeholder="Tìm link hoặc mã chiến dịch..."
                    aria-label="Tìm chiến dịch"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                  <CustomSelect
                    value={campaignFilter}
                    onChange={setCampaignFilter}
                    className="w-full sm:w-60"
                    options={[
                      { value: 'pending', label: 'Cần xác nhận' },
                      { value: 'all', label: 'Tất cả chiến dịch' },
                      { value: 'clear', label: 'Không có người chờ' },
                    ]}
                  />
                </div>

                {!loading && campaigns.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm">
                    Bạn chưa tạo chiến dịch nào.
                  </div>
                )}

                {(() => {
                  const keyword = campaignSearch.trim().toLowerCase()
                  const visible = campaigns
                    .filter((campaign) => {
                      const pending = Number(campaign.pending_review_count || 0)
                      if (campaignFilter === 'pending' && pending === 0) return false
                      if (campaignFilter === 'clear' && pending > 0) return false
                      return (
                        !keyword ||
                        String(campaign.id).includes(keyword) ||
                        String(campaign.target_url || '').toLowerCase().includes(keyword) ||
                        String(campaign.platform || '').toLowerCase().includes(keyword)
                      )
                    })
                    .sort((a, b) =>
                      Number(b.pending_review_count || 0) -
                      Number(a.pending_review_count || 0),
                    )

                  return (
                    <div className="space-y-3">
                      {!loading && campaigns.length > 0 && visible.length === 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                          {campaignFilter === 'pending' && !keyword
                            ? 'Hiện không có nhiệm vụ nào cần xác nhận trong danh sách này.'
                            : 'Không tìm thấy chiến dịch phù hợp.'}
                          {campaignFilter === 'pending' && (
                            <button
                              type="button"
                              onClick={() => setCampaignFilter('all')}
                              className="ml-2 font-bold text-blue-700 underline"
                            >
                              Xem tất cả
                            </button>
                          )}
                        </div>
                      )}

                      {visible.map((campaign) => {
                        const pending = Number(campaign.pending_review_count || 0)
                        const settled = Number(campaign.settled_count || 0)

                        return (
                          <article
                            key={campaign.id}
                            className={`rounded-2xl border bg-white p-4 sm:p-5 ${
                              pending > 0 ? 'border-amber-300' : 'border-slate-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-black text-slate-950">
                                  {taskNames[campaign.task_type] || campaign.task_type}
                                  {' · '}
                                  {platformNames[campaign.platform] || campaign.platform}
                                </h3>
                                <p className="mt-1 text-xs text-slate-500">
                                  Chiến dịch #{campaign.id}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${
                                  pending > 0
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {pending > 0
                                  ? `${pending} người chờ xác nhận`
                                  : 'Không có người chờ'}
                              </span>
                            </div>

                            <p className="mt-3 text-xs font-semibold text-slate-500">
                              Link cần thực hiện
                            </p>
                            <p className="mt-1 break-all text-sm text-slate-800">
                              {campaign.target_url || 'Chưa có link'}
                            </p>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                              <p className="text-sm text-slate-600">
                                Đã quyết toán: <strong>{settled.toLocaleString('vi-VN')}</strong>
                                {' / '}
                                {Number(campaign.quantity || 0).toLocaleString('vi-VN')}
                              </p>
                              <button
                                type="button"
                                onClick={() => setOpenCampaignId(campaign.id)}
                                className={`rounded-xl px-5 py-3 text-sm font-bold ${
                                  pending > 0
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {pending > 0
                                  ? `Kiểm tra ${pending} người →`
                                  : 'Xem chi tiết →'}
                              </button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )
                })()}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-700">
                    Trang {campaignPage} / {campaignLastPage}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={loading || campaignPage <= 1}
                      onClick={() => setCampaignPage((page) => page - 1)}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold disabled:opacity-40"
                    >
                      Trang trước
                    </button>
                    <button
                      type="button"
                      disabled={loading || campaignPage >= campaignLastPage}
                      onClick={() => setCampaignPage((page) => page + 1)}
                      className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
                    >
                      Trang sau
                    </button>
                  </div>
                </div>

                {openCampaignId !== null && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-5"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Chi tiết chiến dịch"
                  >
                    <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
                        <div>
                          <h3 className="text-lg font-black text-slate-950">
                            Kiểm tra nhiệm vụ
                          </h3>
                          <p className="text-xs text-slate-500">
                            Chiến dịch #{openCampaignId}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenCampaignId(null)
                            load()
                          }}
                          className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                        >
                          Đóng ✕
                        </button>
                      </div>
                      <div className="overflow-y-auto p-3 sm:p-5">
                        <ExchangeCampaignClaims
                          campaigns={campaigns}
                          campaignId={openCampaignId}
                          initialStatus="submitted"
                    onReviewSuccess={refreshCampaignSummary}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'mine' && (
              <ExchangeMyClaims
                claims={claims}
                loading={loading}
                onRefresh={load}
              />
            )}


          </>
        )}
      </div>
    </div>
  )
}
