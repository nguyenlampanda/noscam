import NoScamSelect from '../../components/ui/NoScamSelect'
import { useNoScamUI } from '../../components/ui/NoScamUI'
import { useRef, useState } from 'react'
import exchangeService from '../../services/exchangeService'

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

const formatCoins = (value) =>
  `${Math.round(Number(value || 0)).toLocaleString('vi-VN')} xu`

function safeTargetUrl(value, platform) {
  try {
    const url = new URL(value)

    if (url.protocol !== 'https:') return null

    const hosts = {
      instagram: ['instagram.com', 'www.instagram.com'],
      tiktok: ['tiktok.com', 'www.tiktok.com'],
      facebook: [
        'facebook.com',
        'www.facebook.com',
        'm.facebook.com',
        'web.facebook.com',
        'fb.com',
        'www.fb.com',
      ],
    }

    return hosts[platform]?.includes(url.hostname.toLowerCase())
      ? url.href
      : null
  } catch {
    return null
  }
}


export default function ExchangeAvailableTasks({
  tasks,
  accounts,
  myTasks = [],
  claimsReady = false,
  loading,
  onRefresh,
}) {
  const { confirm } = useNoScamUI()
  const [selectedAccounts, setSelectedAccounts] = useState({})
  const [activeTaskId, setActiveTaskId] = useState(null)
  const [platformFilter, setPlatformFilter] = useState('all')
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [progress, setProgress] = useState('')
  const locked = useRef(false)

  const claimedIds = (campaignId) => new Set(
    myTasks
      .filter((claim) => Number(claim.campaign_id) === Number(campaignId))
      .map((claim) => Number(claim.social_account_id)),
  )

  const matchingAccounts = (task) => accounts.filter(
    (account) => account.is_active && account.platform === task.platform,
  )

  const availableAccounts = (task) => {
    const claimed = claimedIds(task.id)
    return matchingAccounts(task).filter(
      (account) => !claimed.has(Number(account.id)),
    )
  }

  const getSelected = (task) => {
    const availableIds = new Set(
      availableAccounts(task).map((account) => Number(account.id)),
    )
    return (selectedAccounts[task.id] || []).filter(
      (id) => availableIds.has(Number(id)),
    )
  }

  const toggleAccount = (task, id, checked) => {
    setSelectedAccounts((current) => {
      const availableIds = new Set(
        availableAccounts(task).map((account) => Number(account.id)),
      )
      const old = (current[task.id] || []).filter((item) => availableIds.has(item))
      const next = checked
        ? [...new Set([...old, id])].slice(0, 10)
        : old.filter((item) => item !== id)
      return { ...current, [task.id]: next }
    })
  }

  const activeTask = tasks.find(
    (task) => Number(task.id) === Number(activeTaskId),
  )
  const visibleTasks = tasks.filter(
    (task) => platformFilter === 'all' || task.platform === platformFilter,
  )

  async function receive(task) {
    if (locked.current || loading || !claimsReady) return

    const selectedIds = new Set(getSelected(task))
    const chosen = availableAccounts(task)
      .filter((account) => selectedIds.has(Number(account.id)))
      .slice(0, 10)

    if (!chosen.length) {
      setError('Vui lòng chọn ít nhất một tài khoản.')
      return
    }

    const reward = Number(task.reward_per_task || 0) * chosen.length
    if (!await confirm(
      `Xác nhận nhận ${chosen.length} nhiệm vụ?\n` +
      `Tổng thưởng dự kiến: ${formatCoins(reward)}.\n` +
      'Xu chỉ được cộng sau khi chủ chiến dịch duyệt.',
    )) return

    locked.current = true
    setBusyId(task.id)
    setError('')
    setSuccess('')
    setProgress('')

    let completed = 0
    let failure = ''

    try {
      for (let i = 0; i < chosen.length; i += 1) {
        const account = chosen[i]
        setProgress(`Đang xử lý ${i + 1}/${chosen.length}: ${account.username}`)

        try {
          await exchangeService.claimTask(task.id, account.id)
          completed += 1
          setSelectedAccounts((current) => ({
            ...current,
            [task.id]: (current[task.id] || []).filter(
              (id) => Number(id) !== Number(account.id),
            ),
          }))
        } catch (err) {
          failure = `${account.username}: ${err?.message || 'Chưa xác định được kết quả'}`
          break
        }
      }

      setSuccess(`Đã nhận thành công ${completed}/${chosen.length} tài khoản.`)

      if (failure) {
        setError(
          `${failure}. Hãy kiểm tra mục Nhiệm vụ của tôi trước khi thử lại.`,
        )
      } else {
        setActiveTaskId(null)
      }

      try {
        await onRefresh()
      } catch {
        setError('Không cập nhật được dữ liệu. Vui lòng tải lại trang.')
      }
    } finally {
      locked.current = false
      setBusyId(null)
      setProgress('')
    }
  }

  const platformStyles = {
    instagram: {
      background: 'from-fuchsia-600 via-pink-500 to-orange-400',
      icon: '◎',
      name: 'Instagram',
    },
    tiktok: {
      background: 'from-slate-950 via-slate-900 to-cyan-900',
      icon: '♪',
      name: 'TikTok',
    },
    facebook: {
      background: 'from-blue-800 via-blue-600 to-sky-400',
      icon: 'f',
      name: 'Facebook',
    },
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">
            Nhiệm vụ có sẵn
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Chọn chiến dịch và tài khoản để nhận nhiệm vụ.
          </p>
        </div>

        <NoScamSelect
          value={platformFilter}
          onChange={(event) => setPlatformFilter(event.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
          aria-label="Lọc nền tảng"
        >
          <option value="all">Tất cả nền tảng</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="facebook">Facebook</option>
        </NoScamSelect>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </p>
      )}
      {progress && (
        <p role="status" className="mt-3 text-sm font-semibold text-blue-700">
          {progress}
        </p>
      )}

      {!loading && visibleTasks.length === 0 && (
        <p className="mt-6 rounded-xl bg-slate-50 p-6 text-sm text-slate-500">
          Hiện chưa có nhiệm vụ phù hợp.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleTasks.map((task) => {
          const style = platformStyles[task.platform] || platformStyles.facebook
          const available = availableAccounts(task)
          const url = safeTargetUrl(task.target_url, task.platform)
          const count = Number(task.quantity || 0)
          const claimed = Number(task.claimed_count || 0)
          const hasCount = Number.isFinite(count) && count > 0
          const remaining = hasCount ? Math.max(0, count - claimed) : null

          return (
            <article
              key={task.id}
              className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
            >
              <div className={`relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br ${style.background}`}>
                <div className="absolute -right-8 -top-12 h-44 w-44 rounded-full border-[25px] border-white/10" />
                <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-white/10 blur-xl" />
                <div className="relative flex items-center gap-3 text-white">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/30 bg-white/20 text-5xl font-black shadow-lg backdrop-blur-sm">
                    {style.icon}
                  </div>
                  <div>
                    <p className="text-xl font-black">{style.name}</p>
                    <p className="text-sm font-semibold text-white/90">
                      {taskNames[task.task_type] || task.task_type}
                    </p>
                  </div>
                </div>
                <span className="absolute left-3 top-3 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-black text-slate-800">
                  NHIỆM VỤ
                </span>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-base font-black text-slate-950">
                  {style.name} · {taskNames[task.task_type] || task.task_type}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Chiến dịch #{task.id}
                </p>

                <div className="mt-4 rounded-xl bg-blue-50 px-3 py-3">
                  <p className="text-xs font-medium text-slate-500">Thưởng mỗi tài khoản</p>
                  <p className="mt-1 text-xl font-black text-blue-700">
                    {formatCoins(task.reward_per_task)}
                  </p>
                </div>

                <p className="mt-3 text-xs font-medium text-slate-500">
                  {available.length} tài khoản của bạn có thể nhận
                </p>

                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 break-words text-sm font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-800"
                  >
                    Xem liên kết nhiệm vụ ↗
                  </a>
                )}

                <div className="mt-auto pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      setActiveTaskId(task.id)
                    }}
                    disabled={loading || !claimsReady || busyId !== null || !url || available.length === 0}
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {available.length === 0 ? 'Không còn tài khoản' : 'Nhận nhiệm vụ'}
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {activeTask && (() => {
        const task = activeTask
        const style = platformStyles[task.platform] || platformStyles.facebook
        const claimed = claimedIds(task.id)
        const matching = matchingAccounts(task)
        const available = availableAccounts(task)
        const selected = getSelected(task)
        const selectedSet = new Set(selected)
        const maxSelection = Math.min(10, available.length)
        const disabled = busyId !== null || loading || !claimsReady

        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-5"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !disabled) {
                setActiveTaskId(null)
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Nhận nhiệm vụ"
              className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${style.background} text-3xl font-black text-white`}>
                    {style.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-slate-950">Nhận nhiệm vụ</h3>
                    <p className="text-xs text-slate-500">
                      {style.name} · {taskNames[task.task_type] || task.task_type} · #{task.id}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTaskId(null)}
                  disabled={disabled}
                  aria-label="Đóng popup"
                  className="rounded-xl px-3 py-2 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                >
                  ×
                </button>
              </div>

              <div className="overflow-y-auto p-5">
                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">
                    Thưởng mỗi tài khoản
                  </p>
                  <p className="mt-1 text-2xl font-black text-blue-700">
                    {formatCoins(task.reward_per_task)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Chỉ cộng xu sau khi nhiệm vụ được duyệt.
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      Chọn tài khoản thực hiện
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Tối đa 10 tài khoản mỗi lần.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={disabled || available.length === 0}
                    onClick={() => setSelectedAccounts((current) => ({
                      ...current,
                      [task.id]: selected.length === maxSelection
                        ? []
                        : available.slice(0, 10).map((account) => Number(account.id)),
                    }))}
                    className="shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
                  >
                    {selected.length === maxSelection ? 'Bỏ chọn' : 'Chọn tất cả'}
                  </button>
                </div>

                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {matching.length === 0 && (
                    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                      Chưa có tài khoản phù hợp.
                    </p>
                  )}

                  {matching.map((account) => {
                    const id = Number(account.id)
                    const already = claimed.has(id)
                    const checked = selectedSet.has(id)
                    const blocked = disabled || already || (!checked && selected.length >= 10)

                    return (
                      <label
                        key={account.id}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                          already
                            ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-60'
                            : checked
                              ? 'cursor-pointer border-blue-400 bg-blue-50'
                              : 'cursor-pointer border-slate-200 bg-white hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={blocked}
                          onChange={(event) => toggleAccount(task, id, event.target.checked)}
                          className="h-5 w-5 shrink-0 accent-blue-600"
                        />
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${style.background} text-xl font-bold text-white`}>
                          {String(account.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="break-all text-sm font-bold text-slate-900">
                            {account.username}
                          </p>
                          <p className={`text-xs font-semibold ${already ? 'text-slate-500' : 'text-emerald-600'}`}>
                            {already ? 'Đã nhận' : 'Chưa nhận'}
                          </p>
                        </div>
                        <span className="hidden rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 sm:block">
                          {style.name}
                        </span>
                      </label>
                    )
                  })}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-500">
                    Đã chọn <strong className="text-blue-700">{selected.length}/{maxSelection}</strong>
                  </p>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Tổng thưởng dự kiến</p>
                    <p className="text-xl font-black text-blue-700">
                      {formatCoins(Number(task.reward_per_task || 0) * selected.length)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t border-slate-100 bg-white p-5">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setActiveTaskId(null)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={disabled || selected.length === 0}
                  onClick={() => receive(task)}
                  className="col-span-2 rounded-xl bg-blue-600 px-3 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {busyId === task.id
                    ? 'Đang xử lý...'
                    : `Xác nhận nhận ${selected.length} nhiệm vụ`}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </section>
  )
}
