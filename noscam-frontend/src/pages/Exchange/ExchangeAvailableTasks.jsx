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
  onOpenAccounts,
  myTasks = [],
  completedAccounts = {},
  claimsReady = false,
  loading,
  onRefresh,
}) {
  const { confirm } = useNoScamUI()
  const [selectedAccounts, setSelectedAccounts] = useState({})
  const [activeTaskId, setActiveTaskId] = useState(null)
  const [platformFilter, setPlatformFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')
  const [pageSize, setPageSize] = useState(5)
  const [currentPage, setCurrentPage] = useState(1)

  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [progress, setProgress] = useState('')
  const locked = useRef(false)

  const claimedIds = (campaignId) => new Set(
    (completedAccounts[String(campaignId)] || []).map(Number)
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
  const allTasks = Array.isArray(tasks) ? tasks : []

  const statistics = {
    total: allTasks.length,
    tiktok: allTasks.filter(t => t.platform === 'tiktok').length,
    instagram: allTasks.filter(t => t.platform === 'instagram').length,
    facebook: allTasks.filter(t => t.platform === 'facebook').length,
    available: allTasks.filter(t => availableAccounts(t).length > 0).length,
  }

  const visibleTasks = allTasks.filter((task) => {
    const matchingForTask = matchingAccounts(task)
    if (matchingForTask.length > 0 && availableAccounts(task).length === 0) {
      return false
    }
    if (platformFilter !== 'all' && task.platform !== platformFilter) return false
    if (typeFilter !== 'all' && task.task_type !== typeFilter) return false

    const matching = matchingAccounts(task)
    const available = availableAccounts(task)

    if (statusFilter === 'available' && available.length === 0) return false
    if (statusFilter === 'completed' &&
        (matching.length === 0 || available.length !== 0)) return false
    if (statusFilter === 'unlinked' && matching.length !== 0) return false

    return true
  }).sort((a, b) =>
    sortOrder === 'newest'
      ? Number(b.id) - Number(a.id)
      : Number(a.id) - Number(b.id)
  )

  const totalPages = Math.max(1, Math.ceil(visibleTasks.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const pagedTasks = visibleTasks.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  )

  const changeFilter = (setter, value) => {
    setter(value)
    setCurrentPage(1)
  }

  async function receive(task) {
    if (locked.current || loading) return

    const selectedIds = new Set(getSelected(task))
    const chosen = availableAccounts(task)
      .filter((account) => selectedIds.has(Number(account.id)))
      .slice(0, 10)

    if (!chosen.length) {
      setError('Vui lòng chọn tài khoản chưa tương tác.')
      return
    }

    locked.current = true
    setBusyId(task.id)
    setError('')
    setSuccess('')
    setProgress('')

    let completed = 0
    let failure = ''

    try {
      for (const account of chosen) {
        setProgress(
          `Đang xác nhận ${completed + 1}/${chosen.length}: ${account.username}`
        )

        try {
          await exchangeService.tickReciprocal(task.id, account.id)
          completed += 1
          setSelectedAccounts((current) => ({
            ...current,
            [task.id]: (current[task.id] || []).filter(
              (id) => Number(id) !== Number(account.id)
            ),
          }))
        } catch (err) {
          failure = `${account.username}: ${
            err?.response?.data?.message || err?.message ||
            'Không thể xác nhận.'
          }`
          break
        }
      }

      if (completed) {
        setSuccess(
          `Đã xác nhận ${completed}/${chosen.length} tài khoản.`
        )
      }

      if (failure) setError(failure)

      await onRefresh()

      if (!failure) setActiveTaskId(null)
    } catch (err) {
      setError(err?.message || 'Không tải lại được danh sách.')
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
    <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">
            Khám phá tương tác chéo
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Kết nối và tương tác qua lại trên các nền tảng mạng xã hội.
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


      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        {[
          ['Tổng bài tương tác', statistics.total],
          ['TikTok', statistics.tiktok],
          ['Instagram', statistics.instagram],
          ['Facebook', statistics.facebook],
          ['Có thể thực hiện', statistics.available],
        ].map(([label, count]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{count}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:flex lg:flex-wrap lg:items-end">
        <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-slate-600 lg:min-w-36">
          Loại tương tác
          <select value={typeFilter}
            onChange={e => changeFilter(setTypeFilter, e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800">
            <option value="all">Tất cả</option>
            <option value="follow">Theo dõi</option>
            <option value="like">Thích</option>
            <option value="comment">Bình luận</option>
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-slate-600 lg:min-w-44">
          Trạng thái
          <select value={statusFilter}
            onChange={e => changeFilter(setStatusFilter, e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800">
            <option value="all">Tất cả</option>
            <option value="available">Có thể thực hiện</option>
            <option value="completed">Đã tương tác</option>
            <option value="unlinked">Chưa liên kết tài khoản</option>
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-slate-600 lg:min-w-32">
          Sắp xếp
          <select value={sortOrder}
            onChange={e => changeFilter(setSortOrder, e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800">
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-slate-600 lg:min-w-28">
          Hiển thị
          <select value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800">
            <option value={5}>5 bài</option>
            <option value={10}>10 bài</option>
            <option value={20}>20 bài</option>
          </select>
        </label>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        Hiển thị {visibleTasks.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
        –{Math.min(safePage * pageSize, visibleTasks.length)}
        / {visibleTasks.length} bài tương tác
      </p>

      {!loading && visibleTasks.length === 0 && (
        <p className="mt-6 rounded-xl bg-slate-50 p-6 text-sm text-slate-500">
          Hiện chưa có lượt tương tác phù hợp.
        </p>
      )}

      <div className="mt-5 flex min-w-0 flex-col gap-3">
        {pagedTasks.map((task) => {
          const style = platformStyles[task.platform] || platformStyles.facebook
          const available = availableAccounts(task)
          const matching = matchingAccounts(task)
          const url = safeTargetUrl(task.target_url, task.platform)

          const actionLabel =
            matching.length === 0
              ? 'Chưa liên kết tài khoản'
              : available.length === 0
                ? 'Đã tương tác'
                : 'Thực hiện tương tác'

          return (
            <article
              key={task.id}
              className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-2xl font-black text-white ${style.background}`}
                >
                  {style.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black text-slate-950 sm:text-base">
                    {style.name} · {taskNames[task.task_type] || task.task_type}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    Bài #{task.id} · {available.length} tài khoản có thể tương tác
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                    Miễn phí
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      setActiveTaskId(task.id)
                    }}
                    disabled={loading || !claimsReady || busyId !== null || !url}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {matching.length === 0 ? 'Liên kết →' : 'Tương tác →'}
                  </button>
                </div>
              </div>

              <div className="mt-2 flex min-w-0 items-center gap-2">
                {url ? (
                  <a
                    href={url}
                    title={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-xs font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800"
                  >
                    {url}
                  </a>
                ) : (
                  <span className="min-w-0 flex-1 text-xs text-slate-400">
                    Liên kết không hợp lệ
                  </span>
                )}
              </div>


            </article>
          )
        })}
      </div>


      {!loading && (
        <nav
          aria-label="Phân trang tương tác"
          className="mt-5 flex flex-wrap items-center justify-center gap-2"
        >
          {safePage > 1 && (
            <button
              type="button"
              onClick={() => setCurrentPage(safePage - 1)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← Lùi
            </button>
          )}

          <span className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">
            Trang {safePage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage(safePage + 1)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Tiếp →
          </button>
        </nav>
      )}

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
              aria-label="Thực hiện tương tác"
              className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${style.background} text-3xl font-black text-white`}>
                    {style.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-slate-950">Thực hiện tương tác</h3>
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

                {/* Liên kết tương tác trong popup */}
                {safeTargetUrl(task.target_url, task.platform) && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                    <h4 className="text-sm font-black text-slate-900">
                      Liên kết tương tác
                    </h4>

                    <a
                      href={safeTargetUrl(task.target_url, task.platform)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block break-all text-sm font-semibold leading-6 text-blue-700 underline underline-offset-2 hover:text-blue-900"
                    >
                      {safeTargetUrl(task.target_url, task.platform)}
                    </a>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={safeTargetUrl(task.target_url, task.platform)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                      >
                        Mở liên kết ↗
                      </a>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              safeTargetUrl(task.target_url, task.platform)
                            )
                            setSuccess('Đã sao chép liên kết tương tác.')
                            setError('')
                          } catch {
                            setError('Không sao chép được liên kết.')
                          }
                        }}
                        className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50"
                      >
                        Sao chép liên kết
                      </button>
                    </div>
                  </div>
                )}


                

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
                      Bạn chưa liên kết tài khoản {style.name}.
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTaskId(null)
                          onOpenAccounts?.()
                        }}
                        className="mt-3 block rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                      >
                        Liên kết tài khoản {style.name}
                      </button>
                    </p>
                  )}

                  {matching.length > 0 && available.length === 0 && (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                      Tất cả tài khoản {style.name} của bạn đã thực hiện nhiệm vụ này.
                      Bạn không thể xác nhận lại bằng tài khoản đã sử dụng.
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
                            {already ? 'Đã tham gia' : 'Có thể tương tác'}
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
                    : `Xác nhận tương tác (${selected.length} tài khoản)`}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </section>
  )
}
