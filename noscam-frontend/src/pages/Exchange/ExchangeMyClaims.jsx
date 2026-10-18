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

const statusNames = {
  claimed: 'Đã nhận, chưa nộp',
  submitted: 'Đã nộp, chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Bị từ chối',
  appealed: 'Đang khiếu nại',
  disputed: 'Đang khiếu nại, chờ quản trị viên',
  settled: 'Đã quyết toán',
  refunded: 'Đã hoàn tiền',
  finalized: 'Đã kết thúc',
}

const formatCoins = (value) =>
  `${Math.round(Number(value || 0)).toLocaleString('vi-VN')} xu`

function safeUrl(value, platform) {
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

function formatDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString('vi-VN')
}

export default function ExchangeMyClaims({
  claims,
  loading,
  onRefresh,
}) {
  const { confirm } = useNoScamUI()
  const [busyId, setBusyId] = useState(null)
  const [checkedAt, setCheckedAt] = useState(0)
  const [appealReasons, setAppealReasons] = useState({})
  const [appealClaim, setAppealClaim] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const locked = useRef(false)

  async function submit(claim) {
    if (locked.current || claim.status !== 'claimed') return

    if (!await confirm(
      `Bạn xác nhận đã thực hiện nhiệm vụ #${claim.id} ` +
      `bằng tài khoản ${claim.social_username || 'đã chọn'}? ` +
      'Chỉ gửi hoàn thành nếu bạn đã thực sự thực hiện nhiệm vụ.',
    )) return

    locked.current = true
    setBusyId(claim.id)
    setError('')
    setSuccess('')

    try {
      await exchangeService.submitClaim(claim.id)
      setSuccess('Đã gửi hoàn thành. Xu chỉ được cộng sau khi nhiệm vụ được duyệt.')
      await onRefresh()
    } catch (err) {
      setError(
        err?.message ||
        'Chưa xác nhận được kết quả. Hãy tải lại danh sách trước khi thử lại.',
      )
    } finally {
      locked.current = false
      setBusyId(null)
    }
  }

  async function appeal(claim) {
    if (locked.current || claim.status !== 'rejected') return

    const deadline = Date.parse(claim.appeal_deadline_at || '')

    const currentTime = new Date().getTime()
    setCheckedAt(currentTime)
    if (!Number.isFinite(deadline) || deadline <= currentTime) {
      setError('Thời hạn khiếu nại đã hết hoặc không xác định.')
      return
    }

    const reason = (appealReasons[claim.id] || '').trim()

    if (reason.length < 10 || reason.length > 500) {
      setError('Lý do khiếu nại cần từ 10 đến 500 ký tự.')
      return
    }

    if (!await confirm(
      `Gửi khiếu nại cho nhiệm vụ #${claim.id}? ` +
      'Quản trị viên sẽ xem xét, không tự động cộng xu.',
    )) return

    locked.current = true
    setBusyId(claim.id)
    setError('')
    setSuccess('')

    try {
      await exchangeService.appealClaim(claim.id, reason)
      setAppealClaim(null)
      setSuccess('Đã gửi khiếu nại. Vui lòng chờ quản trị viên xem xét.')
      setAppealReasons((current) => ({
        ...current,
        [claim.id]: '',
      }))
      await onRefresh()
    } catch (err) {
      setError(
        err?.message ||
        'Chưa xác nhận được kết quả khiếu nại. Hãy làm mới danh sách trước khi thử lại.',
      )
    } finally {
      locked.current = false
      setBusyId(null)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Nhiệm vụ của tôi</h2>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi nhiệm vụ đã nhận và gửi xác nhận sau khi thực hiện.
            Danh sách hiển thị tối đa 15 nhiệm vụ mới nhất.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || busyId !== null}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-50"
        >
          Làm mới
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {success}
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {!loading && claims.length === 0 && (
          <p className="text-sm text-slate-500">
            Bạn chưa nhận nhiệm vụ nào.
          </p>
        )}

        {claims.map((claim) => {
          const url = safeUrl(claim.target_url, claim.platform)
          const deadline = formatDate(claim.review_deadline_at)
          const appealDeadline = formatDate(claim.appeal_deadline_at)
          const appealDeadlineTime = Date.parse(
            claim.appeal_deadline_at || '',
          )
          const canAppeal =
            claim.status === 'rejected' &&
            Number.isFinite(appealDeadlineTime) &&
            (checkedAt === 0 || appealDeadlineTime > checkedAt)

          return (
            <div key={claim.id} className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
              <div className={`rounded-xl bg-gradient-to-br p-3 text-white ${
                claim.platform === 'tiktok'
                  ? 'from-slate-950 via-slate-900 to-cyan-800'
                  : claim.platform === 'instagram'
                    ? 'from-purple-800 via-fuchsia-700 to-pink-500'
                    : claim.platform === 'facebook'
                      ? 'from-blue-900 via-blue-700 to-blue-500'
                      : 'from-slate-900 to-slate-700'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold">
                    NHIỆM VỤ #{claim.id}
                  </span>
                  <span className="text-xl font-black opacity-90">
                    {claim.platform === 'tiktok'
                      ? '♪'
                      : claim.platform === 'instagram'
                        ? '◎'
                        : '◉'}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-black">
                  {platformNames[claim.platform] || claim.platform}
                </h3>
                <p className="mt-1 text-sm text-white/85">
                  {taskNames[claim.task_type] || claim.task_type}
                </p>
              </div>

              <div className="mt-3 rounded-xl bg-blue-50 p-2.5">
                <p className="text-xs font-semibold text-slate-500">
                  Phần thưởng nhiệm vụ
                </p>
                <p className="mt-1 text-xl font-black text-blue-700">
                  {formatCoins(claim.reward_per_task)}
                </p>
              </div>

              <div className="mt-2 rounded-xl bg-slate-50 p-2.5">
                <p className="text-xs text-slate-500">
                  Tài khoản thực hiện
                </p>
                <p className="mt-1 break-all text-sm font-bold text-slate-900">
                  {claim.social_username || 'Không xác định'}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Chiến dịch #{claim.campaign_id}
                </p>
              </div>

              <div className="mt-3">
                <span className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-bold ${
                  ['settled', 'approved'].includes(claim.status)
                    ? 'bg-emerald-50 text-emerald-700'
                    : claim.status === 'claimed'
                      ? 'bg-amber-50 text-amber-700'
                      : claim.status === 'rejected'
                        ? 'bg-red-50 text-red-700'
                        : ['appealed', 'disputed'].includes(claim.status)
                          ? 'bg-orange-50 text-orange-700'
                          : 'bg-blue-50 text-blue-700'
                }`}>
                  {statusNames[claim.status] || claim.status}
                </span>
              </div>

              {claim.risk_hold && (
                <p className="mt-2 text-sm text-amber-700">
                  Nhiệm vụ đang được giữ để kiểm tra rủi ro.
                </p>
              )}

              {deadline && (
                <p className="mt-1 text-xs text-slate-500">
                  Hạn duyệt: {deadline}
                </p>
              )}

              {claim.rejection_reason && (
                <p className="mt-2 text-sm text-red-700">
                  Lý do từ chối: {claim.rejection_reason}
                </p>
              )}

              {appealDeadline && (
                <p className="mt-1 text-xs text-slate-500">
                  Hạn khiếu nại: {appealDeadline}
                </p>
              )}

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                  >
                    Mở liên kết nhiệm vụ
                  </a>
                )}

                {canAppeal && (
                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      setAppealClaim(claim)
                    }}
                    disabled={busyId !== null}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
                  >
                    Khiếu nại
                  </button>
                )}

                {claim.status === 'claimed' && (
                  <button
                    type="button"
                    onClick={() => submit(claim)}
                    disabled={busyId !== null}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {busyId === claim.id
                      ? 'Đang gửi...'
                      : 'Tôi đã hoàn thành'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {appealClaim && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && busyId === null) {
              setAppealClaim(null)
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exchange-appeal-title"
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <h3
                  id="exchange-appeal-title"
                  className="text-lg font-black text-slate-900"
                >
                  Khiếu nại nhiệm vụ #{appealClaim.id}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Yêu cầu quản trị viên xem xét quyết định từ chối.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAppealClaim(null)}
                disabled={busyId !== null}
                aria-label="Đóng khiếu nại"
                className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600 hover:bg-slate-200"
              >
                ×
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
              <div className="rounded-xl bg-red-50 p-4">
                <p className="text-xs font-bold text-red-700">
                  Lý do bị từ chối
                </p>
                <p className="mt-1 break-words text-sm text-slate-800">
                  {appealClaim.rejection_reason || 'Không có thông tin.'}
                </p>
              </div>

              <p className="text-sm text-slate-600">
                Hạn khiếu nại:{' '}
                <strong>
                  {formatDate(appealClaim.appeal_deadline_at) || 'Không xác định'}
                </strong>
              </p>

              <div>
                <label
                  htmlFor="exchange-appeal-reason"
                  className="block text-sm font-bold text-slate-800"
                >
                  Lý do khiếu nại
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Viết từ 10 đến 500 ký tự. Không cung cấp mật khẩu
                  hoặc thông tin nhạy cảm.
                </p>
                <textarea
                  id="exchange-appeal-reason"
                  value={appealReasons[appealClaim.id] || ''}
                  onChange={(event) => setAppealReasons((current) => ({
                    ...current,
                    [appealClaim.id]: event.target.value,
                  }))}
                  maxLength={500}
                  rows={5}
                  disabled={busyId !== null}
                  placeholder="Giải thích vì sao nhiệm vụ đã được hoàn thành..."
                  className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
                />
                <p className="mt-1 text-right text-xs text-slate-500">
                  {(appealReasons[appealClaim.id] || '').length}/500
                </p>
              </div>

              {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={() => setAppealClaim(null)}
                disabled={busyId !== null}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => appeal(appealClaim)}
                disabled={
                  busyId !== null ||
                  (appealReasons[appealClaim.id] || '').trim().length < 10 ||
                  (appealReasons[appealClaim.id] || '').trim().length > 500
                }
                className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {busyId === appealClaim.id ? 'Đang gửi...' : 'Gửi khiếu nại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
