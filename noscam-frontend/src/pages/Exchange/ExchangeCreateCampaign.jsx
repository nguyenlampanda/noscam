import NoScamSelect from '../../components/ui/NoScamSelect'
import { useNoScamUI } from '../../components/ui/NoScamUI'
import { useRef, useState } from 'react'
import exchangeService from '../../services/exchangeService'
import customerService, {
  getCustomerToken,
} from '../../services/customerService'

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

const coins = (value) =>
  `${Math.round(Number(value || 0)).toLocaleString('vi-VN')} xu`

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

const STORAGE_KEY = 'noscam_exchange_pending_campaign'

function sessionIdentity() {
  const token = getCustomerToken()
  if (!token) return null

  // Không lưu token; chỉ dùng dấu nhận diện để đối chiếu phiên.
  let hash = 2166136261

  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(16)
}

function savePending(attempt) {
  try {
    const identity = sessionIdentity()
    if (!identity) return false

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...attempt,
        sessionIdentity: identity,
      }),
    )
    return true
  } catch {
    return false
  }
}

function readPending() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const value = JSON.parse(raw)

    if (
      !value ||
      !sessionIdentity() ||
      value.sessionIdentity !== sessionIdentity() ||
      typeof value.key !== 'string' ||
      !/^[A-Za-z0-9_-]{16,128}$/.test(value.key) ||
      !value.payload ||
      typeof value.payload !== 'object'
    ) {
      return null
    }

    return value
  } catch {
    return null
  }
}

function removePending() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable.
  }
}

function makeKey() {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error('Trình duyệt không hỗ trợ tạo mã giao dịch an toàn.')
  }
  return `exchange_${globalThis.crypto.randomUUID()}`
}

export default function ExchangeCreateCampaign({
  prices,
  balance,
  onRefresh,
}) {
  const { confirm } = useNoScamUI()
  const [platform, setPlatform] = useState('instagram')
  const [taskType, setTaskType] = useState('follow')
  const [targetUrl, setTargetUrl] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [showForm, setShowForm] = useState(true)
  const [quantity, setQuantity] = useState('10')
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pending, setPending] = useState(readPending)
  const lock = useRef(false)

  const price = prices.find(
    (item) =>
      item.platform === platform &&
      item.task_type === taskType,
  )

  const normalizedUrl = normalizeTarget(targetUrl, platform, taskType)
  const minimum = Number(price?.min_quantity ?? 10)
  const count = Number(quantity)
  const validCount =
    quantity.trim() !== '' &&
    Number.isSafeInteger(count) &&
    Number.isSafeInteger(minimum) &&
    minimum >= 1 &&
    minimum <= 100000 &&
    count >= minimum &&
    count <= 100000

  const cost = Number(price?.cost_per_task || 0)
  const total = validCount ? cost * count : 0

  const validTotal =
    Number.isSafeInteger(total) &&
    total > 0 &&
    total <= 99999999999999

  const valid =
    Boolean(price) &&
    validCount &&
    validTotal &&
    Boolean(normalizedUrl) &&
    validLink(normalizedUrl, platform) &&
    accepted &&
    balance != null &&
    Number(balance) >= total

  function changeField(setter, value) {
    if (pending) return
    setter(value)
    setError('')
    setSuccess('')
  }

  async function submit() {
    if (lock.current || busy) return

    if (!pending && !valid) {
      setError('Vui lòng kiểm tra liên kết, số lượng, số dư và điều khoản.')
      return
    }

    lock.current = true
    setBusy(true)
    setError('')
    setSuccess('')

    let attempt = pending

    try {
      if (!attempt) {
        const [latestPrices, walletResponse] = await Promise.all([
          exchangeService.prices(),
          customerService.wallet(),
        ])

        const latest = (latestPrices?.data || []).find(
          (item) =>
            item.platform === platform &&
            item.task_type === taskType,
        )

        if (!latest) {
          throw new Error('Loại nhiệm vụ hiện đã ngừng hoạt động.')
        }

        const latestMinimum = Number(latest.min_quantity ?? 10)

        if (
          !Number.isSafeInteger(latestMinimum) ||
          latestMinimum < 1 ||
          latestMinimum > 100000 ||
          count < latestMinimum
        ) {
          throw new Error(
            `Số lượng tối thiểu hiện tại là ${latestMinimum} lượt.`
          )
        }

        const latestCost = Number(latest.cost_per_task)
        const latestTotal = latestCost * count
        const latestBalance = Number(walletResponse?.data?.balance)

        if (
          !Number.isSafeInteger(latestTotal) ||
          latestTotal <= 0 ||
          latestTotal > 99999999999999
        ) {
          throw new Error('Ngân sách không hợp lệ.')
        }

        if (
          !Number.isFinite(latestBalance) ||
          latestBalance < latestTotal
        ) {
          throw new Error('Số dư ví không đủ để tạo chiến dịch.')
        }

        if (latestTotal !== total) {
          throw new Error(
            'Giá nhiệm vụ đã thay đổi. Vui lòng kiểm tra ngân sách và xác nhận lại.',
          )
        }

        attempt = {
          key: makeKey(),
          payload: {
            platform,
            task_type: taskType,
            target_url: normalizedUrl,
            quantity: count,
            rules_accepted: true,
            max_budget: latestTotal,
          },
        }

        attempt = {
          ...attempt,
          sessionIdentity: sessionIdentity(),
        }

        if (!attempt.sessionIdentity || !savePending(attempt)) {
          throw new Error(
            'Không thể lưu mã giao dịch an toàn. ' +
            'Vui lòng kiểm tra phiên đăng nhập và sessionStorage.',
          )
        }

        setPending(attempt)
      } else {
        if (attempt.sessionIdentity !== sessionIdentity()) {
          throw new Error(
            'Phiên đăng nhập đã thay đổi. ' +
            'Không thể gửi lại giao dịch của phiên khác.',
          )
        }

        let found = null

        try {
          found = await exchangeService.lookupCampaign(attempt.key)
        } catch (lookupError) {
          if (lookupError?.status !== 404) {
            throw new Error(
              'Chưa thể xác minh giao dịch trước đó. ' +
              'Vui lòng kiểm tra kết nối và thử lại.',
            )
          }
        }

        if (found?.status === 'created' && found?.data?.id) {
          setSuccess(
            `Chiến dịch #${found.data.id} đã được tạo. ` +
            'Không thực hiện thêm giao dịch.',
          )

          removePending()
          setPending(null)

          if (onRefresh) {
            try {
              await onRefresh()
            } catch {
              // Không ảnh hưởng kết quả tra cứu.
            }
          }

          return
        }

        if (found && found.status !== 'created') {
          throw new Error(
            'Phản hồi tra cứu chưa xác định. Không gửi lại.',
          )
        }

        const confirmed = await confirm(
          'Chưa tìm thấy chiến dịch theo mã yêu cầu. ' +
          'Bạn có muốn gửi lại ĐÚNG yêu cầu cũ với cùng mã giao dịch? ' +
          'Backend sẽ kiểm tra và chống tạo trùng.',
        )

        if (!confirmed) return
      }

      const result = await exchangeService.createCampaign(
        attempt.payload,
        attempt.key,
      )

      setSuccess(
        `Đã tạo chiến dịch #${result?.data?.id}. ` +
        'Ngân sách đã được giữ trong ví.',
      )
      removePending()
      setPending(null)
      setAccepted(false)
      setTargetUrl('')
      setQuantity('10')

      if (onRefresh) {
        try {
          await onRefresh()
        } catch {
          // Chiến dịch đã được tạo; lỗi tải lại không phải lỗi thanh toán.
        }
      }
    } catch (err) {
      setError(
        (err?.message || 'Không thể tạo chiến dịch.') +
        (attempt
          ? ' Nếu chưa chắc kết quả, hãy dùng nút gửi lại yêu cầu cũ; không tạo yêu cầu mới.'
          : ''),
      )
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">Chiến dịch tương tác</h2>
        <button
          type="button"
          disabled={busy || Boolean(pending)}
          onClick={() => {
            setShowForm((current) => !current)
            setShowConfirm(false)
          }}
          className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:bg-slate-300"
        >
          {showForm ? 'Đóng biểu mẫu' : '+ Tạo chiến dịch mới'}
        </button>
      </div>

      {(showForm || pending) && (
        <>
      <p className="mt-2 text-sm text-slate-500">
        1 xu = 1 VNĐ. Ngân sách được giữ trước khi nhiệm vụ bắt đầu.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Nền tảng
          <NoScamSelect
            disabled={busy || Boolean(pending)}
            value={platform}
            onChange={(event) => changeField(setPlatform, event.target.value)}
            className="rounded-xl border border-slate-200 p-3"
          >
            {Object.entries(platforms).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </NoScamSelect>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Loại nhiệm vụ
          <NoScamSelect
            disabled={busy || Boolean(pending)}
            value={taskType}
            onChange={(event) => changeField(setTaskType, event.target.value)}
            className="rounded-xl border border-slate-200 p-3"
          >
            {Object.entries(tasks).map(([value, label]) => (
              <option
                key={value}
                value={value}
                disabled={!prices.some(
                  (item) =>
                    item.platform === platform &&
                    item.task_type === value,
                )}
              >
                {label}
              </option>
            ))}
          </NoScamSelect>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold md:col-span-2">
          ID, tên tài khoản hoặc liên kết mục tiêu
          <input
            disabled={busy || Boolean(pending)}
            type="text"
            maxLength={2048}
            value={targetUrl}
            onChange={(event) => changeField(setTargetUrl, event.target.value)}
            placeholder={
              taskType === 'follow'
                ? '@username hoặc https://...'
                : 'Dán liên kết bài viết hoặc video'
            }
            className="rounded-xl border border-slate-200 p-3"
          />
          {targetUrl.trim() && normalizedUrl && (
            <span className="break-all text-xs font-normal text-green-700">
              Liên kết sẽ sử dụng: {normalizedUrl}
            </span>
          )}
          {targetUrl.trim() && !normalizedUrl && (
            <span className="text-xs font-normal text-red-600">
              ID hoặc liên kết không hợp lệ. Like/Bình luận cần URL bài viết.
            </span>
          )}
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          Số lượng
          <input
            disabled={busy || Boolean(pending)}
            type="number"
            min={minimum}
            max="100000"
            step="1"
            value={quantity}
            onChange={(event) => changeField(setQuantity, event.target.value)}
            className="rounded-xl border border-slate-200 p-3"
          />
          <span className="text-xs font-normal text-slate-500">
            Tối thiểu {Number.isSafeInteger(minimum) ? minimum : 10} lượt.
            Tối đa 100.000 lượt.
          </span>
        </label>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Giá mỗi nhiệm vụ</p>
          <p className="mt-1 text-xl font-black">
            {price ? coins(cost) : 'Chưa mở'}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-slate-50 p-5">
        <p className="text-sm">
          Số dư ví: <strong>{coins(balance)}</strong>
        </p>
        <p className="mt-2 text-sm">
          Thưởng người thực hiện:{' '}
          <strong>{coins(price?.reward_per_task)}</strong>
        </p>
        <p className="mt-4 border-t border-slate-200 pt-4 text-lg font-black">
          Tổng ngân sách: {validTotal ? coins(total) : 'Không hợp lệ'}
        </p>
      </div>

      <label className="mt-5 flex items-start gap-3 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={accepted}
          disabled={busy || Boolean(pending)}
          onChange={(event) => changeField(setAccepted, event.target.checked)}
          className="mt-1"
        />
        Tôi đồng ý với quy định nhiệm vụ, duyệt kết quả
        và hoàn ngân sách của NoScam.
      </label>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="mt-4 text-sm text-green-700">
          {success}
        </p>
      )}

      {showConfirm && !pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setShowConfirm(false)
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exchange-confirm-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h3
              id="exchange-confirm-title"
              className="text-xl font-black text-slate-900"
            >
              Xác nhận tạo chiến dịch
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Kiểm tra thông tin trước khi giữ ngân sách.
            </p>

            <div className="mt-5 space-y-3 text-sm">
              <p>Nền tảng: <strong>{platforms[platform]}</strong></p>
              <p>Nhiệm vụ: <strong>{tasks[taskType]}</strong></p>
              <p>Số lượng: <strong>{count} lượt</strong></p>
              <p className="break-all">
                Liên kết: <strong><a href={normalizedUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline break-all hover:text-blue-800">{normalizedUrl}</a></strong>
              </p>
              <p>Giá mỗi lượt: <strong>{coins(cost)}</strong></p>
              <p>Thưởng mỗi lượt: <strong>{coins(price?.reward_per_task)}</strong></p>
              <div className="border-t border-slate-200 pt-4">
                <p className="text-lg font-black">
                  Tổng ngân sách: {coins(total)}
                </p>
                <p className="mt-2 text-slate-600">
                  Số dư còn lại dự kiến: {coins(Number(balance) - total)}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-amber-700">
              Ngân sách sẽ được giữ khi xác nhận thành công.
              Giá và số dư được kiểm tra lại trước khi gửi.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-bold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={busy || !valid}
                onClick={() => {
                  setShowConfirm(false)
                  submit()
                }}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:bg-slate-300"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          if (pending) {
            submit()
          } else if (valid) {
            setShowConfirm(true)
          }
        }}
        disabled={busy || (!pending && !valid)}
        className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {busy
          ? 'Đang xử lý...'
          : pending
            ? 'Gửi lại yêu cầu cũ'
            : 'Tạo chiến dịch'}
      </button>

      {pending && (
        <p className="mt-3 text-xs text-amber-700">
          Có yêu cầu chưa xác định kết quả. Không thay đổi nội dung
          hoặc tạo yêu cầu mới trước khi xác minh.
        </p>
      )}
        </>
      )}
    </section>
  )
}
