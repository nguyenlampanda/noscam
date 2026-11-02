import { useNavigate } from 'react-router-dom'
// NOSCAM_EXCHANGE_COMPACT_V1
// NOSCAM_EXCHANGE_INTERACTIVE_GUIDE_V1
import ExchangeInteractiveGuide from './ExchangeInteractiveGuide'
import { useCallback, useEffect, useRef, useState } from 'react'
import exchangeService from '../../services/exchangeService'
import { getCustomerToken } from '../../services/customerService'
import ExchangeAccounts from './ExchangeAccounts'
import CustomSelect from '../../components/ui/CustomSelect'

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

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? response
}

function errorText(error) {
  const payload = error?.response?.data ?? error?.data
  const first = payload?.errors
    ? Object.values(payload.errors).flat()[0]
    : null

  return first || payload?.message ||
    error?.message || 'Thao tác không thành công.'
}

function makeRequestKey() {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error('Trình duyệt chưa hỗ trợ tạo mã yêu cầu an toàn.')
  }
  return `exchange_${globalThis.crypto.randomUUID()}`
}


function PlatformIcon({ platform, size = 22 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  }

  if (platform === 'instagram') {
    return (
      <svg {...common}>
        <defs>
          <linearGradient id="exchange-ig-gradient" x1="0" y1="24" x2="24" y2="0">
            <stop stopColor="#FEDA75" />
            <stop offset=".45" stopColor="#D62976" />
            <stop offset="1" stopColor="#4F5BD5" />
          </linearGradient>
        </defs>
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5"
          stroke="url(#exchange-ig-gradient)" strokeWidth="2.5" />
        <circle cx="12" cy="12" r="4.1"
          stroke="url(#exchange-ig-gradient)" strokeWidth="2.5" />
        <circle cx="17.8" cy="6.5" r="1.3" fill="#D62976" />
      </svg>
    )
  }

  if (platform === 'tiktok') {
    return (
      <svg {...common}>
        <path d="M14 3v11.1a4.7 4.7 0 1 1-4.7-4.7"
          stroke="#25F4EE" strokeWidth="3" strokeLinecap="round" />
        <path d="M15 3c.7 3.4 2.4 5.2 5.5 5.6"
          stroke="#FE2C55" strokeWidth="3" strokeLinecap="round" />
        <path d="M14.5 3v11.1a4.7 4.7 0 1 1-4.7-4.7M14.5 3c.7 3.4 2.4 5.2 5.5 5.6"
          stroke="#111827" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (platform === 'facebook') {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="#1877F2" />
        <path d="M14.6 22v-8.2h2.5l.4-3.1h-2.9V8.8c0-.9.3-1.5 1.6-1.5h1.5V4.5c-.7-.1-1.5-.2-2.3-.2-2.7 0-4.4 1.6-4.4 4.5v1.9H8.5v3.1H11V22"
          fill="white" />
      </svg>
    )
  }

  if (platform === 'threads') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" fill="#111827" />
        <path d="M16.5 9.5c-.5-2.3-2-3.4-4.5-3.4-3.4 0-5 2.3-5 5.9 0 4 1.8 6.1 5.1 6.1 3.2 0 4.8-1.7 4.8-4.1 0-2.4-1.5-3.5-4.2-3.5-1.7 0-2.7.7-2.7 1.8 0 1.1.9 1.8 2.2 1.8 2 0 3.2-1.8 3.2-4.2 0-1.1-.3-2.2-.9-3"
          stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  }

  return <span aria-hidden="true">@</span>
}

export default function ExchangeFreePage() {
  const authNavigate = useNavigate()

  const [tab, setTab] = useState('available')

  // NOSCAM_CAMPAIGN_CLAIMS_MODAL_V1
  const [claimsCampaign, setClaimsCampaign] = useState(null)
  const [claimsRows, setClaimsRows] = useState([])
  const [claimsLoading, setClaimsLoading] = useState(false)
  const [claimsError, setClaimsError] = useState('')
  const [claimsPage, setClaimsPage] = useState(1)
  const [claimsPages, setClaimsPages] = useState(1)
  const [claimsTotal, setClaimsTotal] = useState(0)
  const [claimsStatus, setClaimsStatus] = useState('all')
  const [claimsSearch, setClaimsSearch] = useState('')
  const [claimsStats, setClaimsStats] = useState({})

  const claimsStatusLabels = {
    submitted: 'Chờ xác nhận',
    approved: 'Đã duyệt',
    settled: 'Đã hoàn tất',
    rejected: 'Bị từ chối',
    claimed: 'Đã nhận nhiệm vụ',
    expired: 'Hết hạn',
    cancelled: 'Đã hủy',
    appealed: 'Đang khiếu nại',
  }

  const loadCampaignClaims = async (
    campaign,
    pageNumber = 1,
    status = 'all',
    search = ''
  ) => {
    setClaimsCampaign(campaign)
    setClaimsLoading(true)
    setClaimsError('')
    setClaimsRows([])

    try {
      const response = await exchangeService.campaignClaims(
        campaign.id,
        pageNumber,
        { status, search, perPage: 20 }
      )

      // Normalize Axios, custom apiClient and Laravel paginator responses.
      const candidates = [
        response,
        response?.data,
        response?.data?.data,
        response?.data?.data?.data,
        response?.data?.result,
        response?.result,
      ]

      const payload = candidates.find(candidate =>
        candidate &&
        !Array.isArray(candidate) &&
        Array.isArray(candidate.data)
      )

      if (!payload) {
        const apiMessage =
          response?.data?.message ||
          response?.message ||
          response?.data?.error ||
          response?.error

        throw new Error(
          typeof apiMessage === 'string'
            ? apiMessage
            : 'Không đọc được danh sách từ API. Hãy kiểm tra phản hồi trong Network.'
        )
      }

      setClaimsRows(payload.data)
      setClaimsPage(Number(payload.current_page) || pageNumber)
      setClaimsPages(Math.max(1, Number(payload.last_page) || 1))
      setClaimsTotal(Number(payload.total) || 0)
      setClaimsStats(payload.stats?.by_status || {})
    } catch (error) {
      setClaimsError(
        error?.response?.data?.message ||
        error?.message ||
        'Không thể tải danh sách tương tác.'
      )
    } finally {
      setClaimsLoading(false)
    }
  }

  const formatClaimDate = value => {
    if (!value) return 'Chưa có'
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleString('vi-VN')
  }

  // NOSCAM_RECIPROCAL_CONFIRM_MODAL_V1
  const [reciprocalToConfirm, setReciprocalToConfirm] = useState(null)
  const [returnConfirmAccountId, setReturnConfirmAccountId] = useState('')


  // NOSCAM_PAGINATION_V2
  const [exchangeTaskPage, setExchangeTaskPage] = useState(0)
  const [returnPage, setReturnPage] = useState(1)
  const [campaignPage, setCampaignPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [data, setData] = useState({
    available: [],
    returns: [],
    campaigns: [],
    history: [],
  })
  const [accounts, setAccounts] = useState([])
  const [checkedPerformAccounts, setCheckedPerformAccounts] = useState({})
  const [confirmCampaignId, setConfirmCampaignId] = useState(null)
  const [returnAllocation, setReturnAllocation] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [receiveAccountId, setReceiveAccountId] = useState('')

  const [platform, setPlatform] = useState('facebook')
  const [taskType, setTaskType] = useState('follow')
  const [targetUrl, setTargetUrl] = useState('')
  const [quantity, setQuantity] = useState('10')
  const [accepted, setAccepted] = useState(false)


  // NOSCAM_ACCOUNT_TARGET_FILTER_V1
  const normalizeExchangeTarget = (platform, type, url) => {
    try {
      const parsed = new URL(String(url || '').trim())
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
      const path = decodeURIComponent(parsed.pathname)
        .replace(/\/+/g, '/')
        .replace(/\/$/, '')
        .toLowerCase()
      return `${platform}|${type}|${host}${path}`.toLowerCase()
    } catch {
      return `${platform}|${type}|${String(url || '').trim()}`.toLowerCase()
    }
  }

  const performedTargetsByAccount = new Set(
    data.history
      .filter(h => h.social_account_id != null)
      .map(h =>
        `${h.social_account_id}|${normalizeExchangeTarget(
          h.platform, h.task_type, h.target_url
        )}`
      )
  )

  const lock = useRef(false)
  const loggedIn = Boolean(getCustomerToken())

  const load = useCallback(async () => {
    if (!getCustomerToken()) {
      setLoading(false)
      return
    }

    const [campaignResponse, accountResponse] = await Promise.all([
      exchangeService.reciprocal(),
      exchangeService.accounts(),
    ])

    const campaigns = unwrap(campaignResponse)
    const socialAccounts = unwrap(accountResponse)

    setData({
      available: Array.isArray(campaigns?.available)
        ? campaigns.available : [],
      returns: Array.isArray(campaigns?.returns)
        ? campaigns.returns : [],
      campaigns: Array.isArray(campaigns?.campaigns)
        ? campaigns.campaigns : [],
      history: Array.isArray(campaigns?.history)
        ? campaigns.history : [],
    })

    setAccounts(
      Array.isArray(socialAccounts)
        ? socialAccounts
        : Array.isArray(socialAccounts?.accounts)
          ? socialAccounts.accounts
          : []
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch((err) => {
      setError(errorText(err))
      setLoading(false)
    })
  }, [load])

  const formatCampaignCode = (id, type = 'follow') => {
    if (id === null || id === undefined || id === '') return '—'

    const codes = {
      follow: 'FOL',
      like: 'LIK',
      comment: 'CMT',
    }

    const suffix = codes[String(type).toLowerCase()] || 'TSK'

    return `NSC-${suffix}-${String(id).padStart(6, '0')}`
  }

  async function perform(fn, successFormatter = null) {
    if (lock.current) return false

    lock.current = true
    setBusy(true)
    setError('')
    setSuccess('')

    try {
      const result = await fn()
      await load()
      setSuccess(
        (successFormatter ? successFormatter(result) : null) ||
        unwrap(result)?.message ||
        result?.message ||
        'Đã ghi nhận thành công.'
      )
      return true
    } catch (err) {
      setError(errorText(err))
      return false
    } finally {
      setBusy(false)
      lock.current = false
    }
  }

  const receivingAccounts = accounts.filter(a => a.is_active && a.can_receive && a.platform === platform)

  async function createCampaign() {
    const count = Number(quantity)

    if (
      !accepted ||
      !targetUrl.trim() ||
      !receivingAccounts.some(a => String(a.id) === String(receiveAccountId)) ||
      !Number.isSafeInteger(count) ||
      count < 1 ||
      count > 100000
    ) {
      setError('Vui lòng kiểm tra đầy đủ thông tin chiến dịch.')
      return
    }

    const ok = await perform(() =>
      exchangeService.createCampaign(
        {
          platform,
          task_type: taskType,
          target_url: targetUrl.trim(),
          quantity: count,
          rules_accepted: true,
          social_account_id: Number(receiveAccountId),
          is_free_reciprocal: true,
        },
        makeRequestKey()
      ),
      (result) => {
        const payload = unwrap(result)
        const campaign = payload?.data ?? payload?.campaign ?? payload
        const id = campaign?.id

        return id
          ? `Tạo chiến dịch thành công! Mã chiến dịch: ${formatCampaignCode(id, taskType)}`
          : 'Tạo chiến dịch thành công!'
      }
    )

    if (ok) {
      setTargetUrl('')
      setReceiveAccountId('')
      setAccepted(false)
      setTab('campaigns')
    }
  }

  const tabs = [
    ['available', 'Đi tương tác'],
    ['history', `Lịch sử tương tác (${data.history.length})`],
    ['returns', `Cần tương tác lại (${data.returns.length})`],
    ['create', 'Tạo chiến dịch'],
    ['campaigns', 'Chiến dịch của tôi'],
    ['accounts', 'Tài khoản liên kết'],
  ]

  const returnTotalPages = Math.max(
    1, Math.ceil(data.returns.length / 10)
  )
  const campaignTotalPages = Math.max(
    1, Math.ceil(data.campaigns.length / 10)
  )
  const safeReturnPage = Math.min(returnPage, returnTotalPages)
  const safeCampaignPage = Math.min(campaignPage, campaignTotalPages)

  const cardClass =
    'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'

  return (
    <main id="noscam-exchange-guide-root" className="min-h-[75vh] bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        
            <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-[#10265c] to-blue-700 px-5 py-8 text-white shadow-2xl shadow-blue-950/20 sm:px-10 sm:py-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-white/10 px-4 py-2 text-xs font-bold tracking-widest text-blue-100">
                <span className="h-2 w-2 rounded-full bg-cyan-300" />
                NOSCAM EXCHANGE
              </span>

              <div className="rounded-xl bg-white p-1 text-slate-900 shadow-sm">
                {loggedIn ? (
                  <ExchangeInteractiveGuide activeTab={tab} onChangeTab={setTab} />
                ) : (
                  <button
                    type="button"
                    onClick={() => authNavigate('/login')}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                  >
                    Hướng dẫn sử dụng Tương tác chéo
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                Tương tác chéo
              </h1>
              <span className="rounded-full border border-emerald-300/30 bg-emerald-400/20 px-3 py-1.5 text-xs font-extrabold text-emerald-100 sm:text-sm">
                Miễn phí 100%
              </span>
            </div>

            <p className="mt-5 max-w-3xl text-sm leading-7 text-blue-100/90 sm:text-base sm:leading-8">
              Tương tác với tài khoản khác và nhận tương tác lại.
              Chỉ cần mở liên kết và tích xác nhận sau khi thực hiện.
              Các xác nhận do người dùng tự khai báo.
            </p>
          </div>
        </section>

        {!loggedIn ? (
          <section className="relative mt-7 min-h-[420px] overflow-hidden rounded-[28px]">
            <div
              aria-hidden="true"
              className="pointer-events-none select-none blur-[2px] opacity-40"
            >
              <div className="flex flex-wrap gap-2">
                {tabs.map(([key, label]) => (
                  <div
                    key={key}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-black text-slate-900">
                    Đi tương tác
                  </h2>
                  <p className="mt-3 text-sm text-slate-500">
                    Khám phá nhiệm vụ tương tác trên các nền tảng mạng xã hội.
                  </p>
                  <div className="mt-5 h-12 rounded-xl bg-slate-100" />
                  <div className="mt-3 h-12 rounded-xl bg-slate-100" />
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-black text-slate-900">
                    Tạo chiến dịch miễn phí
                  </h2>
                  <p className="mt-3 text-sm text-slate-500">
                    Chọn nền tảng, loại tương tác và tạo chiến dịch.
                  </p>
                  <div className="mt-5 h-12 rounded-xl bg-slate-100" />
                  <div className="mt-3 h-12 rounded-xl bg-blue-100" />
                </div>
              </div>
            </div>

            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/25 p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="exchange-login-title"
                className="w-full max-w-md rounded-[28px] border border-blue-100 bg-white p-6 text-center shadow-2xl shadow-blue-950/15 sm:p-8"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
                  ♧
                </div>

                <h2
                  id="exchange-login-title"
                  className="mt-5 text-xl font-black text-slate-950"
                >
                  Đăng nhập để sử dụng Tương tác chéo
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Vui lòng đăng nhập hoặc đăng ký tài khoản NoScam.vn
                  để thực hiện nhiệm vụ và tạo chiến dịch miễn phí.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => authNavigate('/login')}
                    className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    Đăng nhập
                  </button>

                  <button
                    type="button"
                    onClick={() => authNavigate('/register')}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                  >
                    Đăng ký
                  </button>
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  Đăng nhập để mở khóa các chức năng Tương tác chéo.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <div className="mt-7 flex flex-wrap gap-2">
              {tabs.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setTab(key)
                    setError('')
                    setSuccess('')
                  }}
                  className={
                    'rounded-xl px-4 py-3 text-sm font-semibold ' +
                    (tab === key
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-700')
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {error && (
              <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {error}
              </p>
            )}

            {/* NOSCAM_SUCCESS_POPUP_V2 */}
            {success && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4"
                onMouseDown={event => {
                  if (event.target === event.currentTarget) {
                    setSuccess('')
                  }
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="exchange-success-title"
                  className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="h-9 w-9 text-emerald-600"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 12.5l4.5 4.5L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <h3
                    id="exchange-success-title"
                    className="mt-5 text-xl font-black text-slate-900"
                  >
                    Xác nhận thành công
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {success}
                  </p>

                  <button
                    type="button"
                    onClick={() => setSuccess('')}
                    className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <p className="mt-6 text-sm text-slate-600">
                Đang tải dữ liệu...
              </p>
            )}

            {!loading && tab === 'available' && (
              <section className="mt-6 space-y-4">
                <h2 className="text-xl font-bold">Đi tương tác</h2>

                {data.available.length === 0 && (
                  <p className={cardClass}>
                    Hiện tại không có tương tác chéo nào.
                  </p>
                )}

                {data.available
                  .slice(exchangeTaskPage * 3, exchangeTaskPage * 3 + 3)
                  .map((item) => {
                  const usedIds = new Set(
                    (item.used_account_ids || []).map(String)
                  )

                  const platformAccounts = accounts
                    .filter(a =>
                      a.platform === item.platform &&
                      a.is_active &&
                      a.can_perform
                    )
                    .sort((a, b) =>
                      (Number(a.priority) || 100) -
                      (Number(b.priority) || 100) ||
                      Number(a.id) - Number(b.id)
                    )

                  const targetKey = normalizeExchangeTarget(
                    item.platform, item.task_type, item.target_url
                  )

                  const availableAccounts = platformAccounts
                    .filter(a =>
                      !usedIds.has(String(a.id)) &&
                      !performedTargetsByAccount.has(`${a.id}|${targetKey}`)
                    )

                  const usedAccounts = platformAccounts
                    .filter(a =>
                      usedIds.has(String(a.id)) ||
                      performedTargetsByAccount.has(`${a.id}|${targetKey}`)
                    )

                  const remainingSlots = Math.max(
                    0,
                    Number(item.quantity) - Number(item.completed)
                  )

                  const eligibleAccounts = availableAccounts
                    .slice(0, remainingSlots)

                  const selectedIds = (
                    checkedPerformAccounts[item.id] || []
                  ).map(String)

                  const receiveOptions = accounts
                    .filter(a => a.platform === item.platform && a.is_active && a.can_receive)
                    .sort((a, b) => (Number(a.priority) || 100) - (Number(b.priority) || 100) || Number(a.id) - Number(b.id))
                  const allocations = returnAllocation[item.id] || {}
                  const allocatedTotal = receiveOptions.reduce((n, a) => n + (Number(allocations[a.id]) || 0), 0)
                  const changeAllocation = (accountId, delta) => {
                    if (busy) return
                    setReturnAllocation(prev => {
                      const current = prev[item.id] || {}
                      const currentValue = Number(current[accountId]) || 0
                      const sum = receiveOptions.reduce((n, a) => n + (Number(current[a.id]) || 0), 0)
                      const next = Math.max(0, currentValue + delta)
                      if (delta > 0 && sum >= selectedEligibleIds.length) return prev
                      return { ...prev, [item.id]: { ...current, [accountId]: next } }
                    })
                  }

                  const selectedEligibleIds = eligibleAccounts
                    .filter(a => selectedIds.includes(String(a.id)))
                    .map(a => Number(a.id))

                  const togglePerformAccount = (accountId, checked) => {
                    const id = String(accountId)

                    setCheckedPerformAccounts(prev => {
                      const previous = (prev[item.id] || []).map(String)

                      const next = checked
                        ? [...new Set([...previous, id])]
                        : previous.filter(value => value !== id)

                      return {
                        ...prev,
                        [item.id]: next,
                      }
                    })
                  }

                  return (
                    <article key={item.id} className={cardClass}>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {platformNames[item.platform] || item.platform}
                          {' · '}
                          {taskNames[item.task_type] || item.task_type}
                        </h3>
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          Đã ghi nhận {item.completed}/{item.quantity} lượt
                        </span>
                      </div>

                      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
<div className="min-w-0 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
                        <div className="mb-1 flex items-center gap-2">
                          <PlatformIcon platform={item.platform} size={22} />
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                            Tài khoản hoặc bài viết cần tương tác
                          </p>
                        </div>

                        {(() => {
                          let username = null

                          try {
                            const url = new URL(item.target_url)
                            const host = url.hostname.toLowerCase().replace(/^www\./, '')
                            const segments = url.pathname.split('/').filter(Boolean)
                            const first = segments[0] || ''
                            const reserved = new Set([
                              'p', 'reel', 'reels', 'stories', 'explore',
                              'tv', 'share', 'video', 'videos', 'watch',
                              'photo', 'photos', 'posts', 'post',
                              'hashtag', 'tag', 'search', 'login',
                              'signup', 't', 'groups', 'events'
                            ])

                            if (
                              host === 'instagram.com' &&
                              segments.length === 1 &&
                              !reserved.has(first.toLowerCase())
                            ) {
                              username = '@' + first
                            } else if (
                              ['tiktok.com', 'threads.net', 'threads.com'].includes(host) &&
                              segments.length === 1 &&
                              first.startsWith('@')
                            ) {
                              username = first
                            } else if (
                              host === 'facebook.com' &&
                              segments.length === 1 &&
                              !reserved.has(first.toLowerCase())
                            ) {
                              username = first
                            }
                          } catch {
                            // Không suy đoán username từ link không hợp lệ.
                          }

                          return username ? (
                            <p className="mb-2 break-all text-base font-bold text-slate-900">
                              {username}
                            </p>
                          ) : (
                            <p className="mb-2 text-sm font-semibold text-slate-800">
                              {item.task_type === 'follow'
                                ? 'Trang cá nhân cần theo dõi'
                                : 'Nội dung cần tương tác'}
                            </p>
                          )
                        })()}

                        <p className="mb-1 text-xs font-medium text-slate-500">
                          Đường dẫn đầy đủ
                        </p>

                        <a
                          href={item.target_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block max-w-full truncate text-xs font-semibold text-blue-700 underline underline-offset-2" title={item.target_url}
                        >
                          {item.target_url}
                        </a>

                        <a
                          href={item.target_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50"
                        >
                          Mở trang {platformNames[item.platform] || item.platform}
                          <span aria-hidden="true">↗</span>
                        </a>
                      </div>

                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-base font-bold text-blue-700">
                              <PlatformIcon platform={item.platform} />
                            </span>

                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                Danh sách tài khoản
                              </p>
                              <p className="text-xs text-slate-500">
                                {eligibleAccounts.length} có thể tham gia
                                {' · '}
                                {usedAccounts.length} đã gửi
                              </p>
                            </div>
                          </div>

                          <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                            Còn {remainingSlots} lượt
                          </span>
                        </div>

                        <div className="relative">
                          <div
                            id={`exchange-account-scroll-${item.id}`}
                            className="flex gap-2 overflow-x-auto pb-2"
                            style={{
                              scrollbarWidth: 'thin',
                              scrollSnapType: 'x proximity',
                            }}
                          >
                            {eligibleAccounts.map((account, index) => {
                              const isChecked = selectedIds.includes(
                                String(account.id)
                              )

                              return (
                                <label
                                  key={account.id}
                                  title={account.username}
                                  className={
                                    'flex w-32 min-w-32 shrink-0 cursor-pointer flex-col justify-between gap-1 rounded-lg border px-2 py-1.5 transition ' +
                                    (isChecked
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-slate-200 bg-white hover:border-blue-300')
                                  }
                                  style={{ scrollSnapAlign: 'start' }}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-blue-600">
                                      #{index + 1}
                                    </span>

                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={busy}
                                      onChange={event =>
                                        togglePerformAccount(
                                          account.id,
                                          event.target.checked
                                        )
                                      }
                                      className="h-4 w-4 accent-blue-600"
                                    />
                                  </div>

                                  <span className="truncate text-xs font-semibold text-slate-800">
                                    {account.username}
                                  </span>

                                  <span className="text-[10px] text-slate-500">
                                    {isChecked ? 'Đã tích chọn' : 'Chưa thực hiện'}
                                  </span>
                                </label>
                              )
                            })}

                            {usedAccounts.map(account => (
                              <div
                                key={'used-' + account.id}
                                title={account.username}
                                className="flex w-32 min-w-32 shrink-0 flex-col justify-between gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5"
                                style={{ scrollSnapAlign: 'start' }}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-emerald-700">
                                    Đã gửi
                                  </span>
                                  <span className="text-emerald-700">✓</span>
                                </div>

                                <span className="truncate text-xs font-semibold text-slate-800">
                                  {account.username}
                                </span>

                                <span className="text-[10px] text-emerald-700">
                                  Đã tương tác · Không thể gửi lại
                                </span>
                              </div>
                            ))}

                            {eligibleAccounts.length === 0 &&
                              usedAccounts.length === 0 && (
                                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                                  Không có tài khoản phù hợp.
                                </div>
                              )}
                          </div>

                          {(eligibleAccounts.length + usedAccounts.length) > 3 && (
                            <div className="mt-2 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                aria-label="Xem tài khoản phía trước"
                                title="Previous - Xem tài khoản phía trước"
                                onClick={() => {
                                  const list = document.getElementById(
                                    `exchange-account-scroll-${item.id}`
                                  )
                                  if (list) {
                                    list.scrollBy({
                                      left: -Math.max(280, list.clientWidth * 0.7),
                                      behavior: 'smooth',
                                    })
                                  }
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-white text-xl font-bold text-blue-600 shadow-sm transition hover:bg-blue-50"
                              >
                                ‹
                              </button>

                              <button
                                type="button"
                                aria-label="Xem tài khoản tiếp theo"
                                title="Next - Xem tài khoản tiếp theo"
                                onClick={() => {
                                  const list = document.getElementById(
                                    `exchange-account-scroll-${item.id}`
                                  )
                                  if (list) {
                                    list.scrollBy({
                                      left: Math.max(280, list.clientWidth * 0.7),
                                      behavior: 'smooth',
                                    })
                                  }
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white shadow-sm transition hover:bg-blue-700"
                              >
                                ›
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-slate-500">
                            Đã chọn {selectedEligibleIds.length}/{eligibleAccounts.length}
                            {' '}tài khoản
                            {(eligibleAccounts.length + usedAccounts.length) > 3
                              ? ' · Vuốt ngang để xem thêm ›'
                              : ''}
                          </p>

                          <button
                            type="button"
                            disabled={
                              busy ||
                              selectedEligibleIds.length === 0 ||
                              selectedEligibleIds.length > remainingSlots
                            }
                            onClick={() => setConfirmCampaignId(item.id)}
                            className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Xác nhận {selectedEligibleIds.length} tài khoản
                          </button>
                        </div>

                        <p className="text-xs text-slate-500">
                          Chỉ tích sau khi đã tương tác thật.
                          Đã gửi không đồng nghĩa đã được duyệt.
                        </p>
                      </div>
</div>

{confirmCampaignId === item.id && (
                        <div
                          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3"
                          role="presentation"
                          onMouseDown={event => {
                            if (event.target === event.currentTarget && !busy) {
                              setConfirmCampaignId(null)
                            }
                          }}
                        >
                          <div
                            role="dialog"
                            aria-modal="true"
                            aria-label="Xác nhận gửi tương tác"
                            className="w-full w-full max-w-none overflow-hidden rounded-2xl bg-white shadow-2xl"
                          >
                            <div className="border-b border-slate-100 px-5 py-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50">
                                    <PlatformIcon platform={item.platform} size={27} />
                                  </span>
                                  <div>
                                    <h3 className="text-lg font-bold text-slate-900">
                                      Xác nhận gửi tương tác
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                      {platformNames[item.platform] || item.platform}
                                      {' · '}
                                      {taskNames[item.task_type] || item.task_type}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setConfirmCampaignId(null)}
                                  aria-label="Đóng popup"
                                  className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100"
                                >
                                  ×
                                </button>
                              </div>
                            </div>

                            <div className="max-h-[65vh] space-y-5 overflow-y-auto px-5 py-5">
                              <div className="space-y-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                  Tài khoản nhận tương tác
                                </p>

                                {(() => {
                                  let displayName = 'Tài khoản hoặc bài viết đích'
                                  let isProfile = false

                                  try {
                                    const url = new URL(item.target_url)
                                    const host = url.hostname.toLowerCase().replace(/^www\./, '')
                                    const segments = url.pathname.split('/').filter(Boolean)
                                    const first = segments[0] || ''

                                    const reserved = new Set([
                                      'p', 'reel', 'reels', 'stories',
                                      'explore', 'tv', 'share', 'video',
                                      'videos', 'watch', 'photo',
                                      'photos', 'posts', 'post',
                                      'hashtag', 'tag', 'search',
                                      'login', 'signup', 't'
                                    ])

                                    if (
                                      host === 'instagram.com' &&
                                      segments.length === 1 &&
                                      !reserved.has(first.toLowerCase())
                                    ) {
                                      displayName = '@' + first
                                      isProfile = true
                                    } else if (
                                      host === 'tiktok.com' &&
                                      first.startsWith('@') &&
                                      segments.length === 1
                                    ) {
                                      displayName = first
                                      isProfile = true
                                    } else if (
                                      host === 'threads.net' &&
                                      first.startsWith('@') &&
                                      segments.length === 1
                                    ) {
                                      displayName = first
                                      isProfile = true
                                    } else if (
                                      host === 'facebook.com' &&
                                      segments.length === 1 &&
                                      !reserved.has(first.toLowerCase())
                                    ) {
                                      displayName = first
                                      isProfile = true
                                    }
                                  } catch {
                                    // Keep generic label for invalid or unsupported URLs.
                                  }

                                  return (
                                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                                      <div className="flex items-center gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-blue-700">
                                          <PlatformIcon platform={item.platform} size={23} />
                                        </span>

                                        <div className="min-w-0">
                                          <p className="text-xs text-slate-500">
                                            {isProfile ? 'Username nhận tương tác' : 'Đích nhận tương tác'}
                                          </p>
                                          <p className="break-all text-base font-bold text-slate-900">
                                            {displayName}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="mt-4 border-t border-blue-100 pt-3">
                                        <p className="mb-1 text-xs font-semibold text-slate-600">
                                          Đường dẫn đầy đủ
                                        </p>

                                        <a
                                          href={item.target_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block break-all text-sm font-semibold leading-6 text-blue-700 underline underline-offset-2"
                                        >
                                          {item.target_url}
                                        </a>

                                        <p className="mt-2 text-xs text-slate-500">
                                          Nhấn vào đường dẫn để mở tài khoản hoặc bài viết nhận tương tác.
                                        </p>
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>

                              <div>
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Tài khoản đi tương tác
                                  </p>
                                  <span className="text-xs font-bold text-blue-700">
                                    {selectedEligibleIds.length} tài khoản
                                  </span>
                                </div>

                                <div className="max-h-52 space-y-2 overflow-y-auto">
                                  {eligibleAccounts
                                    .filter(account =>
                                      selectedEligibleIds.includes(Number(account.id))
                                    )
                                    .map((account, index) => (
                                      <div
                                        key={account.id}
                                        className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2"
                                      >
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                                          {index + 1}
                                        </span>
                                        <span className="min-w-0 flex-1 break-all text-sm font-semibold text-slate-800">
                                          {account.username}
                                        </span>
                                        <span className="text-xs font-semibold text-emerald-700">
                                          Đã tích
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              </div>

                              <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-bold text-slate-900">Phân bổ lượt nhận lại của bạn</p>
                                  <span className={'text-sm font-bold ' + (allocatedTotal === selectedEligibleIds.length ? 'text-emerald-700' : 'text-amber-700')}>
                                    {allocatedTotal}/{selectedEligibleIds.length} lượt
                                  </span>
                                </div>
                                {receiveOptions.length === 0 && (
                                  <p className="text-sm text-amber-800">Bạn chưa bật “Nhận tương tác” cho tài khoản nào cùng nền tảng. Hãy bật ở phần Quản lý tài khoản.</p>
                                )}
                                {receiveOptions.map(account => {
                                  const value = Number(allocations[account.id]) || 0
                                  return (
                                    <div key={account.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                                      <div className="min-w-0 flex-1">
                                        <p className="break-all text-sm font-semibold text-slate-900">{account.username}</p>
                                        <p className="text-xs text-slate-500">Tự tạo lượt nhận khi được duyệt</p>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-2">
                                        <button type="button" disabled={busy || value <= 0} onClick={() => changeAllocation(account.id, -1)} className="h-9 w-9 rounded-lg border border-slate-300 bg-white font-bold text-blue-700 disabled:opacity-40">−</button>
                                        <span className="w-6 text-center text-sm font-bold tabular-nums">{value}</span>
                                        <button type="button" disabled={busy || allocatedTotal >= selectedEligibleIds.length} onClick={() => changeAllocation(account.id, 1)} className="h-9 w-9 rounded-lg border border-slate-300 bg-white font-bold text-blue-700 disabled:opacity-40">+</button>
                                      </div>
                                    </div>
                                  )
                                })}
                                <p className="text-xs text-slate-500">Lượt phân bổ đang chờ chủ chiến dịch duyệt; lượt bị từ chối không được tính.</p>
                              </div>

                              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                                Bạn đang chuẩn bị gửi xác nhận cho
                                {' '}<strong>{selectedEligibleIds.length} lượt</strong>.
                                Chỉ tiếp tục nếu đã thực hiện tương tác thật
                                bằng tất cả tài khoản được liệt kê.
                                Gửi thành công không đồng nghĩa đã được duyệt.
                              </div>
                            </div>

                            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setConfirmCampaignId(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
                              >
                                Quay lại
                              </button>
                              <button
                                type="button"
                                disabled={
                                  busy ||
                                   allocatedTotal !== selectedEligibleIds.length ||
                                   receiveOptions.length === 0 ||
                                  selectedEligibleIds.length === 0 ||
                                  selectedEligibleIds.length > remainingSlots
                                }
                                onClick={async () => {
                                  const ids = [...selectedEligibleIds]
                                  try {
                                    await perform(() =>
                                      exchangeService.tickReciprocal(item.id, ids, receiveOptions.filter(a => Number(allocations[a.id]) > 0).map(a => ({ account_id: Number(a.id), quantity: Number(allocations[a.id]) })))
                                    )
                                    setConfirmCampaignId(null)
                                  } catch (err) {
                                    // perform() handles its own error display.
                                    // Keep the dialog open if the request fails.
                                  }
                                }}
                                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                              >
                                {busy
                                  ? 'Đang xử lý...'
                                  : `Xác nhận gửi ${selectedEligibleIds.length} lượt`}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
</article>
                  )
                })}


                {data.available.length > 0 && <nav aria-label="Phân trang nhiệm vụ" className="mt-6 flex flex-col items-center gap-3">
                  <p className="text-sm text-slate-500">
                    Trang {Math.min(exchangeTaskPage + 1, Math.max(1, Math.ceil(data.available.length / 3)))}
                    /{Math.max(1, Math.ceil(data.available.length / 3))}
                    {' · '}{data.available.length} nhiệm vụ
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button type="button"
                      disabled={busy || exchangeTaskPage === 0}
                      onClick={() => setExchangeTaskPage(p => Math.max(0, p - 1))}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">
                      ‹ Trước
                    </button>
                    {Array.from(
                      { length: Math.ceil(data.available.length / 3) },
                      (_, i) => i + 1
                    ).filter(n =>
                      n === 1 ||
                      n === Math.ceil(data.available.length / 3) ||
                      Math.abs(n - (exchangeTaskPage + 1)) <= 1
                    ).reduce((result, n, i, pages) => {
                      if (i && n - pages[i - 1] > 1) result.push('dots-' + n)
                      result.push(n)
                      return result
                    }, []).map(n => typeof n === 'string' ? (
                      <span key={n} className="px-1 text-slate-400">...</span>
                    ) : (
                      <button type="button" key={n} disabled={busy}
                        onClick={() => setExchangeTaskPage(n - 1)}
                        className={'min-w-10 rounded-xl border px-3 py-2 text-sm font-bold ' +
                          (exchangeTaskPage + 1 === n
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700')}>
                        {n}
                      </button>
                    ))}
                    <button type="button"
                      disabled={busy || (exchangeTaskPage + 1) * 3 >= data.available.length}
                      onClick={() => setExchangeTaskPage(p =>
                        Math.min(Math.max(0, Math.ceil(data.available.length / 3) - 1), p + 1)
                      )}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">
                      Tiếp ›
                    </button>
                  </div>
                </nav>}

              </section>
            )}


            {/* NOSCAM_EXCHANGE_DETAIL_UI_V1 */}


            {/* NOSCAM_RECIPROCAL_HISTORY_V3 */}
            {!loading && tab === 'history' && (
              <section className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      Lịch sử tương tác
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Tài khoản đã gửi, đối tượng nhận và trạng thái xác nhận.
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {data.history.length} lượt
                  </span>
                </div>

                {data.history.length === 0 ? (
                  <div className={cardClass}>
                    <p className="font-bold text-slate-800">
                      Chưa có lịch sử tương tác
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {Object.values(
                        data.history
                          .slice((historyPage - 1) * 10, historyPage * 10)
                          .reduce((groups, item) => {
                            const key = String(item.campaign_id)
                            if (!groups[key]) {
                              groups[key] = {
                                id: item.campaign_id,
                                platform: item.platform,
                                type: item.task_type,
                                url: item.target_url,
                                items: [],
                              }
                            }
                            groups[key].items.push(item)
                            return groups
                          }, {})
                      ).map(group => {
                        const platform = String(group.platform || '').toLowerCase()
                        const platformLabel = ({
                          instagram: 'Instagram',
                          facebook: 'Facebook',
                          tiktok: 'TikTok',
                        })[platform] || group.platform

                        const taskLabel = ({
                          follow: 'Theo dõi',
                          like: 'Thích',
                          comment: 'Bình luận',
                          share: 'Chia sẻ',
                          view: 'Lượt xem',
                        })[group.type] || group.type

                        const logoClass = 'bg-blue-50'

                        const validLink =
                          typeof group.url === 'string' &&
                          /^https?:\/\//i.test(group.url)

                        let receiver = 'Đối tượng trong link'
                        if (validLink) {
                          try {
                            const parsed = new URL(group.url)
                            const path = parsed.pathname.split('/').filter(Boolean)
                            if (
                              platform === 'instagram' &&
                              path.length === 1 &&
                              !['p', 'reel', 'reels', 'stories', 'explore'].includes(path[0].toLowerCase())
                            ) {
                              receiver = '@' + path[0]
                            } else {
                              receiver = parsed.hostname + parsed.pathname
                            }
                          } catch {
                            receiver = 'Đối tượng trong link'
                          }
                        }

                        const statusInfo = item => {
                          const s = item.reciprocal_status
                          if (s === 'confirmed' && item.status === 'approved') {
                            return ['Đã hoàn thành', 'bg-emerald-50 text-emerald-700']
                          }
                          if (s === 'rejected' || item.status === 'rejected') {
                            return ['Đã từ chối', 'bg-rose-50 text-rose-700']
                          }
                          if (s === 'pending_review' || s === 'awaiting_return') {
                            return ['Chờ tương tác lại', 'bg-amber-50 text-amber-700']
                          }
                          return ['Chưa hoàn tất', 'bg-slate-100 text-slate-600']
                        }

                        const renderHistoryRow = item => {
                          const [label, color] = statusInfo(item)
                          const time = item.submitted_at || item.created_at

                          return (
                            <div
                              key={item.id}
                              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-slate-100 px-3 py-2"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-bold text-slate-900 break-all">
                                    {item.username || 'Chưa rõ tài khoản'}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    #{item.id}
                                  </span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                  <span className="font-semibold text-slate-500">
                                    Đã gửi:
                                  </span>
                                  <span className="font-bold text-slate-900">
                                    {item.username || 'Chưa rõ'}
                                  </span>

                                  <span className="text-slate-400">→</span>

                                  <span className="font-semibold text-slate-500">
                                    Tương tác lại:
                                  </span>

                                  {item.return_profile_url &&
                                  /^https?:\/\//i.test(item.return_profile_url) ? (
                                    <a
                                      href={item.return_profile_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="break-all font-bold text-blue-600 hover:underline"
                                    >
                                      {item.return_username || 'Mở tài khoản'}
                                    </a>
                                  ) : (
                                    <span className="font-bold text-slate-800">
                                      {item.return_username || 'Chưa có thông tin'}
                                    </span>
                                  )}
                                </div>

                                <p className="mt-1 text-[11px] text-slate-500">
                                  Thời gian gửi: {time
                                    ? new Date(time).toLocaleString('vi-VN')
                                    : 'Chưa có thời gian'}
                                </p>
                              </div>
                              <span className={
                                'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ' + color
                              }>
                                {label}
                              </span>
                            </div>
                          )
                        }

                        return (
                          <article
                            key={group.id}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                          >
                            <div className="p-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <span className={
                                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ' + logoClass
                                  }>
                                    <PlatformIcon
                                      platform={platform}
                                      className="h-6 w-6"
                                    />
                                  </span>
                                  <div className="min-w-0">
                                    <h3 className="font-black text-slate-900">
                                      {formatCampaignCode(group.id, group.task_type)}
                                    </h3>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {platformLabel} · {taskLabel}
                                    </p>
                                  </div>
                                </div>
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                  {group.items.length} lượt đã gửi
                                </span>
                              </div>

                              <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                  Tài khoản / đối tượng nhận tương tác
                                </p>
                                <p className="mt-1 break-all text-sm font-bold text-slate-900">
                                  {receiver}
                                </p>
                                {validLink && (
                                  <a
                                    href={group.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-block max-w-full break-all text-xs font-semibold text-blue-600 hover:underline"
                                  >
                                    {group.url} ↗
                                  </a>
                                )}
                              </div>

                              <p className="mt-3 text-xs font-bold text-slate-600">
                                Tài khoản đã gửi tương tác
                              </p>
                            </div>

                            <div>
                              {group.items.slice(0, 3).map(renderHistoryRow)}
                            </div>

                            {group.items.length > 3 && (
                              <details className="group border-t border-slate-100">
                                <summary className="cursor-pointer list-none px-4 py-3 text-center text-xs font-bold text-blue-600 hover:bg-blue-50 sm:px-5">
                                  Xem thêm {group.items.length - 3} tài khoản
                                  <span className="ml-1 inline-block transition-transform group-open:rotate-180">
                                    ▾
                                  </span>
                                </summary>
                                <div>
                                  {group.items.slice(3).map(renderHistoryRow)}
                                </div>
                              </details>
                            )}
                          </article>
                        )
                      })}
                    </div>

                    {data.history.length > 10 && (
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                        <button
                          type="button"
                          disabled={historyPage <= 1}
                          onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
                        >
                          ‹ Trước
                        </button>
                        <span className="text-sm text-slate-500">
                          Trang {Math.min(historyPage, Math.ceil(data.history.length / 10))}
                          / {Math.ceil(data.history.length / 10)}
                        </span>
                        <button
                          type="button"
                          disabled={historyPage * 10 >= data.history.length}
                          onClick={() => setHistoryPage(p => p + 1)}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
                        >
                          Tiếp ›
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}

            {/* NOSCAM_OWNER_REVIEW_UI_V1 */}
            {!loading && tab === 'returns' && (
              <section className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      Cần tương tác lại
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Kiểm tra và xác nhận tương tác người khác đã gửi vào
                      các chiến dịch của bạn.
                    </p>
                  </div>
                  <span className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">
                    {data.returns.length} lượt cần kiểm tra
                  </span>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                  <h3 className="text-sm font-bold text-slate-900">
                    Cách xác nhận tương tác
                  </h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {[
                      ['1', 'Xem chiến dịch', 'Xác định đúng chiến dịch và tài khoản đã gửi tương tác.'],
                      ['2', 'Kiểm tra', 'Mở tài khoản để kiểm tra tương tác thực tế.'],
                      ['3', 'Xác nhận', 'Chỉ duyệt khi bạn đã nhận được tương tác.'],
                    ].map(([number, title, description]) => (
                      <div
                        key={number}
                        className="rounded-xl border border-blue-100 bg-white p-4"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                            {number}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {title}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          {description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {data.returns.length === 0 && (
                  <div className="rounded-2xl border border-emerald-100 bg-white px-6 py-10 text-center shadow-sm">
                    <h3 className="font-bold text-slate-900">
                      Không có lượt nào đang chờ bạn duyệt
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Những lượt chưa đến bước duyệt vẫn có thể xuất hiện
                      trong Chi tiết tương tác của từng chiến dịch.
                    </p>
                  </div>
                )}

                {Object.entries(
                  data.returns
                    .slice((safeReturnPage - 1) * 10, safeReturnPage * 10)
                    .reduce((groups, item) => {
                      const key = String(item.campaign_id ?? 'unknown')
                      if (!groups[key]) groups[key] = []
                      groups[key].push(item)
                      return groups
                    }, {})
                ).map(([campaignId, items]) => (
                  <div
                    key={campaignId}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-5">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">
                          {campaignId === 'unknown'
                            ? 'Chiến dịch chưa xác định'
                            : `${'NSC'}-${({follow:'FOL',like:'LIK',comment:'CMT'})[items[0]?.task_type] || 'TSK'}-${String(campaignId).padStart(6,'0')}`}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Mỗi lượt được xác nhận độc lập, kể cả khi trùng username.
                        </p>
                      </div>
                      <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                        {items.length} lượt chờ duyệt trên trang này
                      </span>
                    </div>

                    {/* NOSCAM_OWNER_REVIEW_COMPACT_V2 */}
                    <div className="divide-y divide-slate-100">
                      {items.map(item => (
                        <div
                          key={`${item.campaign_id}-${item.id}`}
                          className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:flex-nowrap"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                            <PlatformIcon platform={item.platform} size={20} />
                          </span>

                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate text-sm font-bold text-slate-900"
                              title={item.username || ''}
                            >
                              {item.username || 'Chưa có username'}
                            </p>
                            <p className="text-xs text-slate-400">
                              Lượt #{item.id}
                              {' · '}
                              {taskNames[item.task_type] || item.task_type}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {item.profile_url ? (
                              <a
                                href={item.profile_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={item.profile_url}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                              >
                                Mở ↗
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">
                                Thiếu link
                              </span>
                            )}

                            <span className="hidden rounded-lg bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-700 md:inline-flex">
                              Chờ duyệt
                            </span>

                            <label
                              className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
                              title="Xác nhận đã nhận tương tác"
                            >
                              <input
                                type="checkbox"
                                checked={false}
                                disabled={busy}
                                onChange={event => {
                                  if (event.target.checked) {
                                    setReturnConfirmAccountId('')
                                    setReciprocalToConfirm(item)
                                  }
                                }}
                                className="h-4 w-4 accent-blue-600"
                              />
                              <span className="text-xs font-semibold text-slate-700">
                                Xác nhận
                              </span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {data.returns.length > 0 && returnTotalPages > 1 && (
                  <nav
                    aria-label="Phân trang lượt chờ duyệt"
                    className="flex flex-wrap items-center justify-center gap-3 pt-3"
                  >
                    <button
                      type="button"
                      disabled={safeReturnPage <= 1}
                      onClick={() => setReturnPage(safeReturnPage - 1)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
                    >
                      ‹ Trước
                    </button>
                    <span className="text-sm text-slate-600">
                      Trang {safeReturnPage}/{returnTotalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safeReturnPage >= returnTotalPages}
                      onClick={() => setReturnPage(safeReturnPage + 1)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
                    >
                      Tiếp ›
                    </button>
                  </nav>
                )}
              </section>
            )}

            {/* NOSCAM_EXCHANGE_CREATE_CUSTOM_SELECT_V1 */}
            {!loading && tab === 'create' && (
              <section className={`mt-6 w-full space-y-5 ${cardClass}`}>
                <h2 className="text-xl font-bold">
                  Tạo chiến dịch miễn phí
                </h2>

                
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="min-w-0">
                    <label className="block text-sm font-semibold">
                  Nền tảng
                  <CustomSelect
                    value={platform}
                    disabled={busy}
                    onChange={(value) => {
                      setPlatform(value)
                      setReceiveAccountId('')
                      setTargetUrl('')
                    }}
                    options={Object.entries(platformNames).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                  />
                </label>
                  </div>
                  <div className="min-w-0">
                    <label className="block text-sm font-semibold">
                  Loại tương tác
                  <CustomSelect
                    value={taskType}
                    disabled={busy}
                    onChange={(value) => {
                      setTaskType(value)
                      setTargetUrl('')
                    }}
                    options={Object.entries(taskNames).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                  />
                </label>
                  </div>
                  <div className="min-w-0">
                    <label className="block text-sm font-semibold">
                  Tài khoản nhận tương tác
                  <CustomSelect
                    value={receiveAccountId}
                    disabled={busy || receivingAccounts.length === 0}
                    placeholder="Chọn tài khoản nhận"
                    onChange={(value) => {
                      setReceiveAccountId(String(value))
                      if (taskType === 'follow') {
                        const chosen = receivingAccounts.find(
                          a => String(a.id) === String(value)
                        )
                        setTargetUrl(chosen?.profile_url || '')
                      }
                    }}
                    options={receivingAccounts.map(a => ({
                      value: String(a.id),
                      label: a.username,
                    }))}
                  />
                  {receivingAccounts.length === 0 && <p className="mt-1 text-xs text-red-600">Hãy bật Nhận tương tác trong Tài khoản liên kết.</p>}
                </label>
                  </div>
                  <div className="min-w-0">
                    <label className="block text-sm font-semibold">
                  Số lượt muốn nhận
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="mt-2 block w-full rounded-xl border border-slate-300 p-3"
                  />
                </label>
                  </div>
                  <div className="min-w-0 md:col-span-2">
                    <label className="block text-sm font-semibold">
                  Liên kết tài khoản hoặc bài viết
                  <input
                    type="url"
                    value={targetUrl}
                    onChange={(event) => setTargetUrl(event.target.value)}
                    placeholder="https://..."
                    maxLength={2048}
                    className="mt-2 block w-full rounded-xl border border-slate-300 p-3"
                  />
                </label>
                  </div>
                </div>


                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(event) => setAccepted(event.target.checked)}
                  />
                  Tôi đồng ý với quy định tương tác chéo miễn phí.
                </label>

                <button
                  type="button"
                  disabled={busy || !accepted}
                  onClick={createCampaign}
                  className="w-full rounded-xl bg-blue-600 p-4 font-bold text-white disabled:opacity-50"
                >
                  {busy ? 'Đang xử lý...' : 'Tạo chiến dịch miễn phí'}
                </button>
              </section>
            )}


            {!loading && tab === 'campaigns' && (
              <section className="mt-6 space-y-5">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Chiến dịch của tôi
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Theo dõi các chiến dịch tương tác miễn phí và tiến độ đã ghi nhận.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    {
                      label: 'Tổng chiến dịch',
                      value: data.campaigns.length,
                      color: 'text-blue-700',
                    },
                    {
                      label: 'Lượt đã ghi nhận',
                      value: data.campaigns.reduce(
                        (sum, item) => sum + (Number(item.completed) || 0), 0
                      ),
                      color: 'text-emerald-700',
                    },
                    {
                      label: 'Mục tiêu tổng',
                      value: data.campaigns.reduce(
                        (sum, item) => sum + (Number(item.quantity) || 0), 0
                      ),
                      color: 'text-slate-900',
                    },
                    {
                      label: 'Lượt còn lại',
                      value: data.campaigns.reduce(
                        (sum, item) => sum + Math.max(
                          0,
                          (Number(item.quantity) || 0) -
                          (Number(item.completed) || 0)
                        ), 0
                      ),
                      color: 'text-amber-700',
                    },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <p className="text-xs font-semibold text-slate-500">
                        {stat.label}
                      </p>
                      <p className={'mt-2 text-2xl font-black tabular-nums ' + stat.color}>
                        {stat.value.toLocaleString('vi-VN')}
                      </p>
                    </div>
                  ))}
                </div>

                {data.campaigns.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
                    <h3 className="font-bold text-slate-900">
                      Chưa có chiến dịch
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Bạn có thể tạo chiến dịch miễn phí để bắt đầu nhận tương tác.
                    </p>
                    <button type="button" onClick={() => setTab('create')}
                      className="mt-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">
                      Tạo chiến dịch
                    </button>
                  </div>
                )}

                {data.campaigns
                  .slice((safeCampaignPage - 1) * 10, safeCampaignPage * 10)
                  .map(item => {
                    const quantity = Math.max(0, Number(item.quantity) || 0)
                    const completed = Math.max(0, Number(item.completed) || 0)
                    const remaining = Math.max(0, quantity - completed)
                    const percent = quantity > 0
                      ? Math.min(100, Math.round(completed / quantity * 100))
                      : 0
                    const isComplete = quantity > 0 && completed >= quantity

                    return (
                      <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                              <PlatformIcon platform={item.platform} size={26} />
                            </span>
                            <div>
                              <h3 className="font-bold text-slate-900">
                                {platformNames[item.platform] || item.platform}
                                {' · '}
                                {taskNames[item.task_type] || item.task_type}
                              </h3>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatCampaignCode(item.id, item.task_type)}
                              </p>
                            </div>
                          </div>
                          <span className={'rounded-lg px-3 py-1.5 text-xs font-bold ' +
                            (isComplete
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-blue-700')}>
                            {isComplete ? 'Đạt mục tiêu' : 'Đang nhận tương tác'}
                          </span>
                        </div>

                        <div className="space-y-2 p-3">
                          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                            <span className="shrink-0 text-xs font-semibold text-slate-700">
                              Tiến độ: {completed}/{quantity} lượt
                            </span>
                            <div
                              role="progressbar"
                              aria-valuenow={percent}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label="Tiến độ chiến dịch"
                              className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-slate-200"
                            >
                              <div
                                className="h-full rounded-full bg-blue-600 transition-all"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="shrink-0 text-xs font-bold text-blue-700">
                              {percent}%
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-slate-100 px-3 py-2 text-xs">
                            <span className="text-slate-600">
                              Đã ghi nhận: <strong className="text-slate-900">{completed}</strong>
                            </span>
                            <span className="text-slate-600">
                              Mục tiêu: <strong className="text-slate-900">{quantity}</strong>
                            </span>
                            <span className="text-slate-600">
                              Còn lại: <strong className="text-slate-900">{remaining}</strong>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <a
                              href={item.target_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={item.target_url}
                              className="min-w-0 flex-1 truncate text-xs font-semibold text-blue-700 underline underline-offset-2"
                            >
                              {item.target_url}
                            </a>

                            <button
                              type="button"
                              onClick={() => {
                                setClaimsStatus('all')
                                setClaimsSearch('')
                                loadCampaignClaims(item, 1, 'all', '')
                              }}
                              className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                            >
                              Xem chi tiết
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })}

                {!loading && data.campaigns.length > 0 && campaignTotalPages > 1 && (
                  <nav aria-label="Phân trang chiến dịch" className="mt-4 flex flex-col items-center gap-3">
                    <p className="text-sm font-medium text-slate-500">
                      Trang {safeCampaignPage}/{campaignTotalPages} · {data.campaigns.length} chiến dịch
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button type="button" disabled={safeCampaignPage <= 1}
                        onClick={() => setCampaignPage(safeCampaignPage - 1)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">
                        ‹ Trước
                      </button>
                      {Array.from({ length: campaignTotalPages }, (_, i) => i + 1)
                        .filter(n => n === 1 || n === campaignTotalPages || Math.abs(n - safeCampaignPage) <= 1)
                        .reduce((result, n, i, pages) => {
                          if (i && n - pages[i - 1] > 1) result.push('dots-' + n)
                          result.push(n)
                          return result
                        }, [])
                        .map(n => typeof n === 'string' ? (
                          <span key={n} className="px-1 text-slate-400">...</span>
                        ) : (
                          <button key={n} type="button"
                            aria-current={safeCampaignPage === n ? 'page' : undefined}
                            onClick={() => setCampaignPage(n)}
                            className={'min-w-10 rounded-xl border px-3 py-2 text-sm font-bold ' +
                              (safeCampaignPage === n
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-200 bg-white text-slate-700')}>
                            {n}
                          </button>
                        ))}
                      <button type="button" disabled={safeCampaignPage >= campaignTotalPages}
                        onClick={() => setCampaignPage(safeCampaignPage + 1)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">
                        Tiếp ›
                      </button>
                    </div>
                  </nav>
                )}
              </section>
            )}


        {/* Popup xác nhận tương tác lại */}
        {reciprocalToConfirm && (
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4"
            onClick={() => !busy && setReciprocalToConfirm(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="reciprocal-confirm-title"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              onClick={event => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <h2
                  id="reciprocal-confirm-title"
                  className="text-xl font-black text-slate-900"
                >
                  Xác nhận đã nhận tương tác
                </h2>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setReciprocalToConfirm(null)}
                  className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                Bạn đã kiểm tra và thực sự nhận được tương tác từ tài khoản này?
              </p>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-bold text-slate-900">
                  {platformNames[reciprocalToConfirm.platform] ||
                    reciprocalToConfirm.platform}
                  {' · '}
                  {taskNames[reciprocalToConfirm.task_type] ||
                    reciprocalToConfirm.task_type}
                </p>
                <p className="mt-2 break-all text-sm text-slate-600">
                  {formatCampaignCode(reciprocalToConfirm.campaign_id, reciprocalToConfirm.task_type)}
                  {' · '}
                  Lượt #{reciprocalToConfirm.id}
                  {' · '}
                  Tài khoản: {reciprocalToConfirm.username}
                </p>
              </div>


              
              {/* NOSCAM_PRIORITY_MANUAL_SELECT_V2 */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-800">
                    Chọn tài khoản đã nhận tương tác
                  </p>
                  <span className="text-xs font-semibold text-slate-500">
                    {platformNames[reciprocalToConfirm.platform] ||
                      reciprocalToConfirm.platform}
                  </span>
                </div>

                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {accounts
                    .filter(a =>
                      a.platform === reciprocalToConfirm.platform &&
                      a.is_active &&
                      a.can_receive &&
                      String(a.username || '').trim() &&
                      reciprocalToConfirm.task_type === 'follow' &&
                      (() => {
                        const clean = url => {
                          try {
                            const u = new URL(url)
                            return u.hostname.toLowerCase().replace(/^www\./, '') +
                              u.pathname.replace(/\/+$/, '').toLowerCase()
                          } catch { return null }
                        }
                        const target = clean(reciprocalToConfirm.target_url)
                        return target !== null && target === clean(a.profile_url)
                      })()
                    )
                    .sort((a, b) =>
                      (Number(a.priority) || 100) -
                        (Number(b.priority) || 100) ||
                      Number(a.id) - Number(b.id)
                    )
                    .map(a => {
                      const selected =
                        returnConfirmAccountId === String(a.id)

                      const profileUrl =
                        typeof a.profile_url === 'string' &&
                        /^https:\/\//i.test(a.profile_url)
                          ? a.profile_url
                          : null

                      return (
                        <div
                          key={a.id}
                          className={
                            'flex items-center gap-3 rounded-xl border p-3 transition ' +
                            (selected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 bg-white')
                          }
                        >
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                            <input
                              type="radio"
                              name="return-confirm-account"
                              checked={selected}
                              onChange={() =>
                                setReturnConfirmAccountId(String(a.id))
                              }
                              className="h-4 w-4 shrink-0 accent-blue-600"
                            />

                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                              <PlatformIcon
                                platform={a.platform}
                                size={23}
                              />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block break-all text-sm font-bold text-slate-900">
                                {a.username}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {platformNames[a.platform] || a.platform}
                              </span>
                            </span>
                          </label>

                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                              Ưu tiên {a.priority || 100}
                            </span>

                            {profileUrl && (
                              <a
                                href={profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={event => event.stopPropagation()}
                                className="text-xs font-bold text-blue-600 hover:underline"
                              >
                                Xem hồ sơ ↗
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>

                {!accounts.some(a =>
                  a.platform === reciprocalToConfirm.platform &&
                  a.is_active &&
                  a.can_receive &&
                  String(a.username || '').trim() &&
                  reciprocalToConfirm.task_type === 'follow' &&
                  (() => {
                    try {
                      const norm = url => {
                        const u = new URL(url)
                        return u.hostname.toLowerCase().replace(/^www\./, '') +
                          u.pathname.replace(/\/+$/, '').toLowerCase()
                      }
                      return norm(a.profile_url) === norm(reciprocalToConfirm.target_url)
                    } catch { return false }
                  })()
                ) && (
                  <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-700">
                    Không có tài khoản liên kết trùng hồ sơ đích của chiến dịch. Hãy kiểm tra tài khoản nhận.
                  </p>
                )}
              </div>

              <p className="mt-4 text-xs leading-5 text-amber-700">
                Chỉ xác nhận khi đã kiểm tra tương tác thực tế.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setReciprocalToConfirm(null)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={busy || !returnConfirmAccountId}
                  onClick={async () => {
                    if (busy || !returnConfirmAccountId) return
                    const id = reciprocalToConfirm.id
                    const accountId = Number(returnConfirmAccountId)
                    const ok = await perform(() =>
                      exchangeService.confirmReciprocal(
                        id, 'approve', accountId
                      )
                    )
                    if (ok) {
                      setReciprocalToConfirm(null)
                      setReturnConfirmAccountId('')
                    }
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy ? 'Đang xử lý...' : 'Xác nhận hoàn tất'}
                </button>
              </div>
            </div>
          </div>
        )}


            {claimsCampaign && (
              <div
                className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-5"
                role="presentation"
                onMouseDown={event => {
                  if (event.target === event.currentTarget) {
                    setClaimsCampaign(null)
                  }
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="claims-detail-title"
                  className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
                    <div className="min-w-0">
                      <h2
                        id="claims-detail-title"
                        className="text-xl font-black text-slate-900"
                      >
                        Chi tiết tương tác
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {platformNames[claimsCampaign.platform] ||
                          claimsCampaign.platform}
                        {' · '}
                        {taskNames[claimsCampaign.task_type] ||
                          claimsCampaign.task_type}
                        {' · '}
                        {formatCampaignCode(claimsCampaign.id, claimsCampaign.task_type)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Đóng chi tiết tương tác"
                      onClick={() => setClaimsCampaign(null)}
                      className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4 overflow-y-auto p-4 sm:p-5">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        ['Tổng lượt gửi', claimsTotal],
                        ['Chờ xác nhận', claimsStats.submitted || 0],
                        ['Đã duyệt', claimsStats.approved || 0],
                        ['Hoàn tất', claimsStats.settled || 0],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <p className="text-xs text-slate-500">{label}</p>
                          <p className="mt-1 text-xl font-black text-slate-900">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="search"
                        value={claimsSearch}
                        onChange={event => setClaimsSearch(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === 'Enter' && !claimsLoading) {
                            loadCampaignClaims(
                              claimsCampaign,
                              1,
                              claimsStatus,
                              claimsSearch
                            )
                          }
                        }}
                        maxLength={100}
                        placeholder="Tìm username hoặc mã lượt..."
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                      <select
                        value={claimsStatus}
                        onChange={event => {
                          const status = event.target.value
                          setClaimsStatus(status)
                          loadCampaignClaims(
                            claimsCampaign,
                            1,
                            status,
                            claimsSearch
                          )
                        }}
                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="submitted">Chờ xác nhận</option>
                        <option value="approved">Đã duyệt</option>
                        <option value="settled">Đã hoàn tất</option>
                        <option value="rejected">Bị từ chối</option>
                      </select>
                      <button
                        type="button"
                        disabled={claimsLoading}
                        onClick={() => loadCampaignClaims(
                          claimsCampaign,
                          1,
                          claimsStatus,
                          claimsSearch
                        )}
                        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        Tìm kiếm
                      </button>
                    </div>

                    {claimsLoading && (
                      <p className="rounded-xl bg-blue-50 p-5 text-center text-sm text-blue-700">
                        Đang tải danh sách tài khoản...
                      </p>
                    )}

                    {claimsError && (
                      <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {claimsError}
                      </p>
                    )}

                    {!claimsLoading && !claimsError && claimsRows.length === 0 && (
                      <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                        Không tìm thấy tài khoản tương tác phù hợp.
                      </p>
                    )}

                    {!claimsLoading && !claimsError && claimsRows.map(claim => (
                      <article
                        key={claim.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-all font-bold text-slate-900">
                              {claim.social_username || 'Chưa có username'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Lượt tương tác #{claim.id}
                            </p>
                          </div>
                          <span className={
                            'rounded-lg px-3 py-1.5 text-xs font-bold ' +
                            (claim.status === 'approved' ||
                             claim.status === 'settled'
                              ? 'bg-emerald-50 text-emerald-700'
                              : claim.status === 'rejected'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700')
                          }>
                            {claim.status === 'submitted' &&
                            claim.reciprocal_status === 'awaiting_return'
                              ? 'Chờ hoàn tất tương tác lại'
                              : claim.status === 'submitted' &&
                                claim.reciprocal_status === 'pending_review'
                                ? 'Chờ chủ chiến dịch duyệt'
                                : claim.status === 'submitted' &&
                                  claim.reciprocal_status === 'confirmed'
                                  ? 'Đã xác nhận - cần kiểm tra trạng thái'
                                  : claimsStatusLabels[claim.status] ||
                                    claim.status ||
                                    'Chưa xác định'}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                          <p>Gửi lúc: {formatClaimDate(claim.submitted_at)}</p>
                          <p>Hoàn tất lúc: {formatClaimDate(claim.settled_at)}</p>
                        </div>

                        {claim.rejection_reason && (
                          <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                            Lý do từ chối: {claim.rejection_reason}
                          </p>
                        )}

                        {claim.risk_hold && (
                          <p className="mt-3 text-xs font-semibold text-amber-700">
                            Tương tác đang được kiểm tra thêm.
                          </p>
                        )}

                        {claim.social_profile_url && (
                          <a
                            href={claim.social_profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                          >
                            Xem tài khoản ↗
                          </a>
                        )}
                      </article>
                    ))}

                    {!claimsLoading && !claimsError && claimsPages > 1 && (
                      <nav
                        aria-label="Phân trang chi tiết tương tác"
                        className="flex items-center justify-center gap-3 border-t border-slate-100 pt-4"
                      >
                        <button
                          type="button"
                          disabled={claimsPage <= 1}
                          onClick={() => loadCampaignClaims(
                            claimsCampaign,
                            claimsPage - 1,
                            claimsStatus,
                            claimsSearch
                          )}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40"
                        >
                          ‹ Trước
                        </button>
                        <span className="text-sm text-slate-600">
                          {claimsPage}/{claimsPages}
                        </span>
                        <button
                          type="button"
                          disabled={claimsPage >= claimsPages}
                          onClick={() => loadCampaignClaims(
                            claimsCampaign,
                            claimsPage + 1,
                            claimsStatus,
                            claimsSearch
                          )}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40"
                        >
                          Tiếp ›
                        </button>
                      </nav>
                    )}
                  </div>

                  <div className="border-t border-slate-100 p-4 text-right">
                    <button
                      type="button"
                      onClick={() => setClaimsCampaign(null)}
                      className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            )}


            {!loading && tab === 'accounts' && (
              <section className="mt-6">
                <ExchangeAccounts
                  accounts={accounts}
                  onRefresh={load}
                />
              </section>
            )}

            
          </>
        )}
      </div>
          
    </main>
  )
}
