import { useNoScamUI } from '../../components/ui/NoScamUI'
import ExchangeCampaignList from './ExchangeCampaignList'
import ExchangeDisputeList from './ExchangeDisputeList'
import { useCallback, useEffect, useRef, useState } from 'react'
import AdminNav from '../../components/admin/AdminNav'
import AdminExchangeLists from './AdminExchangeLists'
import adminExchangeService from '../../services/adminExchangeService'


// NOSCAM_EXCHANGE_TOGGLE_ONLY_V1
// Các nền tảng bổ sung chỉ được bật khi backend trả về cấu hình hỗ trợ.
// NOSCAM_EXCHANGE_TOGGLE_V2
const platformNames = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  youtube: 'YouTube',
  threads: 'Threads',
  twitter: 'X (Twitter)',
  telegram: 'Telegram',
  zalo: 'Zalo',
  pinterest: 'Pinterest',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
}

const taskNames = {
  follow: 'Follow',
  like: 'Like',
  comment: 'Comment',
  view: 'View',
  share: 'Share',
  subscribe: 'Subscribe',
  repost: 'Repost',
  join: 'Join',
  reaction: 'Reaction',
  save: 'Save',
  upvote: 'Upvote',
}

// NOSCAM_EXCHANGE_RESPONSIVE_V2
function AdminExchangePricePanel() {
  const { confirm, notify } = useNoScamUI()
  const [platforms, setPlatforms] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await adminExchangeService.toggles()
      if (!Array.isArray(response?.data)) {
        throw new Error('Dữ liệu cấu hình không hợp lệ.')
      }
      setPlatforms(response.data)
    } catch (err) {
      setError(err?.message || 'Không thể tải cấu hình.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const change = async (platform, task, current) => {
    if (saving) return

    const next = !current
    const name = platformNames[platform] || platform
    const actionName = task === '__platform__'
      ? name
      : `${taskNames[task] || task} - ${name}`

    if (!(await confirm(
      `${next ? 'Bật' : 'Tắt'} ${actionName}?`
    ))) return

    setSaving(`${platform}:${task}`)
    setError('')

    try {
      const response = await adminExchangeService.updateToggle({
        platform,
        task_type: task,
        is_enabled: next,
      })

      if (
        response?.data?.platform !== platform ||
        response?.data?.task_type !== task ||
        response?.data?.is_enabled !== next
      ) {
        throw new Error('Máy chủ chưa xác nhận trạng thái.')
      }

      await load()
      notify('Đã lưu trạng thái.', 'success')
    } catch (err) {
      setError(err?.message || 'Không thể lưu trạng thái.')
      notify(err?.message || 'Không thể lưu trạng thái.', 'error')
    } finally {
      setSaving('')
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-5 sm:py-7 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-[28px]">
              Quản lý tương tác chéo
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Bật/tắt nền tảng và từng loại tương tác.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading || Boolean(saving)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98] disabled:opacity-50 sm:text-sm"
          >
            Tải lại
          </button>
        </div>

        {error && (
          <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p>Đang tải cấu hình...</p>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            {platforms.map((platform) => (
              <section
                key={platform.platform}
                className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/50 sm:p-5"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex min-w-0 items-center gap-3"><ExchangePlatformIcon platform={platform.platform || platform.name} /><div className="min-w-0"><h2 className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                      {platformNames[platform.platform] || platform.platform}
                    </h2></div></div>
                    <p className="mt-1 text-xs text-slate-500">
                      {platform.is_enabled ? 'Nền tảng đang bật' : 'Nền tảng đang tắt'}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition-colors group-hover:bg-blue-50 sm:text-sm">
                    <span>Bật nền tảng</span>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={platform.is_enabled}
                      disabled={Boolean(saving)}
                      onChange={() => change(
                        platform.platform,
                        '__platform__',
                        platform.is_enabled
                      )}
                      className="h-4 w-4 cursor-pointer accent-blue-600 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                  {platform.services.map((task) => (
                    <div
                      key={task.task_type}
                      className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/70"
                    >
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {taskNames[task.task_type] || task.task_type}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {!task.backend_supported
                            ? 'Chưa hỗ trợ tạo nhiệm vụ'
                            : !platform.is_enabled
                              ? 'Nền tảng đang tắt'
                              : task.is_enabled
                                ? 'Đang bật'
                                : 'Đang tắt'}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        role="switch"
                        aria-label={`${task.task_type} ${platform.platform}`}
                        checked={task.is_enabled}
                        disabled={Boolean(saving)}
                        onChange={() => change(
                          platform.platform,
                          task.task_type,
                          task.is_enabled
                        )}
                        className="h-4 w-4 cursor-pointer accent-blue-600 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}



// NOSCAM_ALL_PLATFORM_ICONS_V4
const exchangePlatformIcons = {
  instagram: ['instagram', 'E4405F', 'FFF0F5', 'IG'],
  tiktok: ['tiktok', '000000', 'F1F5F9', 'TT'],
  facebook: ['facebook', '0866FF', 'EFF6FF', 'f'],
  youtube: ['youtube', 'FF0033', 'FFF1F2', 'YT'],
  threads: ['threads', '000000', 'F1F5F9', '@'],
  twitter: ['x', '000000', 'F1F5F9', 'X'],
  x: ['x', '000000', 'F1F5F9', 'X'],
  telegram: ['telegram', '26A5E4', 'EFF9FF', 'TG'],
  zalo: ['zalo', '0068FF', 'EFF6FF', 'Z'],
  pinterest: ['pinterest', 'BD081C', 'FFF1F2', 'P'],
  linkedin: ['linkedin', '0A66C2', 'EFF6FF', 'in'],
  reddit: ['reddit', 'FF4500', 'FFF7ED', 'r'],
}

function ExchangePlatformIcon({ platform }) {
  const key = String(platform || '').trim().toLowerCase()
  const config = exchangePlatformIcons[key]
  const [failed, setFailed] = useState(false)

  const slug = config?.[0]
  const color = config?.[1] || '475569'
  const background = config?.[2] || 'F1F5F9'
  const fallback = config?.[3] || key.slice(0, 2).toUpperCase() || '?'

  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-100"
      style={{ backgroundColor: `#${background}` }}
      title={platform}
    >
      {slug && !failed ? (
        <img
          src={`https://cdn.simpleicons.org/${slug}/${color}`}
          alt=""
          width="26"
          height="26"
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-[26px] w-[26px] object-contain"
        />
      ) : (
        <span
          className="text-sm font-black"
          style={{ color: `#${color}` }}
        >
          {fallback}
        </span>
      )}
    </span>
  )
}

export default function AdminExchangePage() {
  const [tab, setTab] = useState('campaigns')

  const tabs = [
    { id: 'campaigns', label: 'Chiến dịch' },
    { id: 'disputes', label: 'Khiếu nại' },
    { id: 'prices', label: 'Quản lý tương tác' }
  ]

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-7xl px-5 pt-6 lg:px-8">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-pressed={tab === item.id}
              className={`rounded-xl px-5 py-3 text-sm font-bold ${
                tab === item.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </main>

      <div className="mx-auto w-full max-w-7xl px-5 pb-12 pt-6 lg:px-8">
        {tab === 'prices' && <AdminExchangePricePanel />}
        {tab === 'campaigns' && <ExchangeCampaignList />}
        {tab === 'disputes' && <ExchangeDisputeList />}
      </div>
    </>
  )
}
