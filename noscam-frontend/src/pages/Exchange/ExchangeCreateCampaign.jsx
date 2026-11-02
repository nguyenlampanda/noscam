import { useRef, useState } from 'react'
import exchangeService from '../../services/exchangeService'

const platforms = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
}

const tasks = {
  follow: 'Theo dõi',
  like: 'Thích',
  comment: 'Bình luận',
}

function validLink(value, platform) {
  try {
    const url = new URL(value)
    const hosts = {
      instagram: ['instagram.com'],
      tiktok: ['tiktok.com'],
      facebook: ['facebook.com', 'fb.com'],
    }

    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      value.length <= 2048 &&
      hosts[platform].some(
        (host) =>
          url.hostname === host ||
          url.hostname.endsWith(`.${host}`),
      )
    )
  } catch {
    return false
  }
}

function normalizeTarget(value, platform, taskType) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  let candidate = raw

  if (/^(https?:\/\/|www\.)/i.test(raw) ||
      /^(instagram\.com|tiktok\.com|facebook\.com|fb\.com)\//i.test(raw)) {
    candidate = raw.replace(/^http:\/\//i, 'https://')
    if (!/^https:\/\//i.test(candidate)) {
      candidate = `https://${candidate}`
    }
    return validLink(candidate, platform) ? candidate : ''
  }

  if (taskType !== 'follow') return ''

  if (platform === 'instagram') {
    const username = raw.replace(/^@/, '')
    if (/^(?!.*\.\.)(?!\.)(?!.*\.$)[A-Za-z0-9._]{1,30}$/.test(username)) {
      return `https://www.instagram.com/${username}/`
    }
  }

  if (platform === 'tiktok') {
    const username = raw.replace(/^@/, '')
    if (/^[A-Za-z0-9._]{2,24}$/.test(username)) {
      return `https://www.tiktok.com/@${username}`
    }
  }

  if (platform === 'facebook') {
    const username = raw.replace(/^@/, '')
    if (/^[A-Za-z][A-Za-z0-9.]{4,49}$/.test(username)) {
      return `https://www.facebook.com/${username}`
    }
  }

  return ''
}



function StyledExchangeSelect({ value, onChange, disabled, options }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        onBlur={(event) => {
          if (!ref.current?.contains(event.relatedTarget)) {
            setOpen(false)
          }
        }}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
      >
        <span className="truncate">
          {options.find((item) => item.value === value)?.label || value}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-blue-600 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && !disabled && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          {options.map((item) => (
            <button
              key={item.value}
              type="button"
              role="option"
              aria-selected={value === item.value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(item.value)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
                value === item.value
                  ? 'bg-blue-50 font-bold text-blue-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{item.label}</span>
              {value === item.value && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ExchangeCreateCampaign({ onRefresh, onViewCampaigns }) {
  const [platform, setPlatform] = useState('instagram')
  const [taskType, setTaskType] = useState('follow')
  const [targetUrl, setTargetUrl] = useState('')
  const [quantity, setQuantity] = useState('10')
  const [accepted, setAccepted] = useState(false)
  const showForm = true
  const [showConfirm, setShowConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const lock = useRef(false)

  const normalizedUrl = normalizeTarget(targetUrl, platform, taskType)
  const count = Number(quantity)

  const validCount =
    quantity.trim() !== '' &&
    Number.isSafeInteger(count) &&
    count >= 1 &&
    count <= 100000

  const valid =
    validCount &&
    Boolean(normalizedUrl) &&
    validLink(normalizedUrl, platform) &&
    accepted

  function changeField(setter, value) {
    if (busy) return
    setter(value)
    setError('')
    setSuccess('')
  }

  async function submit() {
    if (lock.current || busy) return

    if (!valid) {
      setError('Vui lòng kiểm tra liên kết, số lượt và quy định.')
      return
    }

    if (!globalThis.crypto?.randomUUID) {
      setError('Trình duyệt không hỗ trợ tạo mã yêu cầu an toàn.')
      return
    }

    const key = `exchange_free_${globalThis.crypto.randomUUID()}`

    const payload = {
      platform,
      task_type: taskType,
      target_url: normalizedUrl,
      quantity: count,
      rules_accepted: true,
    }

    lock.current = true
    setBusy(true)
    setError('')

    try {
      // Endpoint /exchange/campaigns được cấu hình cho bài miễn phí.
      // Không gọi API ví, giá hoặc thanh toán.
      const result = await exchangeService.createCampaign(payload, key)

      setSuccess(
        `Bài tương tác miễn phí #${result?.data?.id || result?.id || ''} đã được tạo.`
      )
      setTargetUrl('')
      setQuantity('10')
      setAccepted(false)
      setShowConfirm(false)

      if (onRefresh) {
        try {
          await onRefresh()
        } catch {
          // Đăng thành công, chỉ lỗi làm mới danh sách.
        }
      }
    } catch (err) {
      setError(
        (err?.message || 'Chưa thể xác nhận kết quả đăng bài.') +
        ' Nếu kết nối bị gián đoạn, hãy kiểm tra danh sách bài của tôi trước khi đăng lại để tránh trùng.'
      )
      setShowConfirm(false)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return (
    <section className="mt-6 min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            Tạo bài tương tác chéo
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Đăng bài để cộng đồng tương tác qua lại hoàn toàn miễn phí.
          </p>
        </div>


      </div>

      {success && (
        <div
          role="status"
          aria-live="polite"
          className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white"
            >
              ✓
            </span>

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black text-emerald-900">
                Đăng bài thành công!
              </h3>

              <p className="mt-1 text-sm leading-6 text-emerald-800">
                {success}
              </p>

              <p className="mt-1 text-xs text-emerald-700">
                Bài tương tác chéo đã được hệ thống tiếp nhận.
              </p>

              <button
                type="button"
                onClick={() => onViewCampaigns?.()}
                className="mt-3 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800"
              >
                Xem bài của tôi
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!busy) {
              if (!valid) {
                setError('Vui lòng kiểm tra đầy đủ thông tin.')
                return
              }
              setShowConfirm(true)
            }
          }}
          className="mt-5 space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-700">
              Nền tảng
              <StyledExchangeSelect
                value={platform}
                disabled={busy}
                onChange={(value) => changeField(setPlatform, value)}
                options={Object.entries(platforms).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </label>

            <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-700">
              Loại tương tác
              <StyledExchangeSelect
                value={taskType}
                disabled={busy}
                onChange={(value) => changeField(setTaskType, value)}
                options={Object.entries(tasks).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </label>
          </div>

          <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-700">
            Tài khoản hoặc liên kết cần tương tác
            <input
              type="text"
              value={targetUrl}
              disabled={busy}
              maxLength={2048}
              onChange={(event) => changeField(setTargetUrl, event.target.value)}
              placeholder={
                taskType === 'follow'
                  ? '@username hoặc https://...'
                  : 'Dán liên kết bài viết hoặc video'
              }
              className="w-full min-w-0 rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
            />

            {targetUrl.trim() && (
              <span className={`break-all text-xs font-normal ${
                normalizedUrl ? 'text-green-700' : 'text-red-600'
              }`}>
                {normalizedUrl
                  ? `Liên kết: ${normalizedUrl}`
                  : 'Liên kết không hợp lệ. Thích/Bình luận cần liên kết bài viết.'}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Số lượt tương tác mong muốn
            <input
              type="number"
              min="1"
              max="100000"
              step="1"
              value={quantity}
              disabled={busy}
              onChange={(event) => changeField(setQuantity, event.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500"
            />
            <span className="text-xs font-normal text-slate-500">
              Từ 1 đến 100.000 lượt. Số lượt thực tế phụ thuộc vào người tham gia.
            </span>
          </label>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-900">
              Tương tác chéo miễn phí
            </p>
            <p className="mt-1 text-xs leading-5 text-blue-800">
              Bài đăng sẽ được hiển thị để các thành viên có thể thực hiện
              tương tác. Không sử dụng ví hay thanh toán.
            </p>
          </div>

          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={accepted}
              disabled={busy}
              onChange={(event) => changeField(setAccepted, event.target.checked)}
              className="mt-1"
            />
            <span>
              Tôi đồng ý với quy định tương tác chéo của NoScam.vn và
              chỉ đăng liên kết thuộc quyền quản lý hoặc được phép sử dụng.
            </span>
          </label>

          <button
            type="submit"
            disabled={busy || !valid}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busy ? 'Đang xử lý...' : 'Đăng bài miễn phí'}
          </button>
        </form>
      )}

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setShowConfirm(false)
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="free-exchange-confirm-title"
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <h3
              id="free-exchange-confirm-title"
              className="text-lg font-black text-slate-950"
            >
              Xác nhận đăng bài miễn phí
            </h3>

            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>Nền tảng: <strong>{platforms[platform]}</strong></p>
              <p>Loại tương tác: <strong>{tasks[taskType]}</strong></p>
              <p>Số lượt mong muốn: <strong>{count}</strong></p>
              <div className="min-w-0">
                <span>Liên kết: </span>
                <a
                  href={normalizedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={normalizedUrl}
                  className="break-all font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-800"
                >
                  {normalizedUrl}
                  <span aria-hidden="true"> ↗</span>
                </a>
              </div>

            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={busy || !valid}
                onClick={submit}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? 'Đang đăng...' : 'Xác nhận đăng bài'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
