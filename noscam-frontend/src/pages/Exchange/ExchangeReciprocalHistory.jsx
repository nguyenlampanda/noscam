import { useCallback, useEffect, useState } from 'react'
import exchangeService from '../../services/exchangeService'

const PAGE_SIZE = 10

function safeUrl(value, platform) {
  try {
    const url = new URL(String(value || '').trim())
    const hosts = {
      instagram: ['instagram.com'],
      tiktok: ['tiktok.com'],
      facebook: ['facebook.com', 'fb.com', 'fb.watch'],
    }
    const allowed = hosts[String(platform || '').toLowerCase()] || []
    const hostname = url.hostname.toLowerCase()

    return url.protocol === 'https:' &&
      allowed.some(host =>
        hostname === host || hostname.endsWith('.' + host)
      )
      ? url.href
      : null
  } catch {
    return null
  }
}

function formatDate(value) {
  if (!value) return 'Chưa ghi nhận'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Không xác định'
    : date.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
}

function Pagination({ page, total, onChange }) {
  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (totalPages <= 1) return null

  const start = (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
      <p className="text-xs font-medium text-slate-500">
        Hiển thị {start}–{end} / {total} tài khoản
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Trước
        </button>

        <span className="min-w-[75px] text-center text-xs font-bold text-slate-700">
          {page} / {totalPages}
        </span>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Tiếp →
        </button>
      </div>
    </div>
  )
}

export default function ExchangeReciprocalHistory({
  campaignId,
  onRefresh,
}) {
  const [items, setItems] = useState([])
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [confirmItem, setConfirmItem] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pendingPage, setPendingPage] = useState(1)
  const [confirmedPage, setConfirmedPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await exchangeService.reciprocal()
      const data = response?.data?.data ??
        response?.data ?? response

      const campaigns = Array.isArray(data?.campaigns)
        ? data.campaigns : []

      const history = Array.isArray(data?.history)
        ? data.history : []

      setCampaign(
        campaigns.find(c =>
          String(c.id) === String(campaignId)
        ) || null
      )

      setItems(
        history.filter(i =>
          String(i.campaign_id) === String(campaignId)
        )
      )
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Không tải được danh sách.'
      )
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    setPendingPage(1)
    setConfirmedPage(1)
    void load()
  }, [load])

  async function confirm(item) {
    if (busyId !== null) return

    setBusyId(item.id)
    setError('')
    setSuccess('')

    try {
      await exchangeService.confirmReciprocal(item.id)
      await load()
      setSuccess('Đã xác nhận tương tác lại thành công.')

      if (typeof onRefresh === 'function') {
        await onRefresh()
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Xác nhận thất bại.'
      )
    } finally {
      setBusyId(null)
      setConfirmItem(null)
    }
  }

  const pending = items.filter(
    i => i.reciprocal_status === 'awaiting_return'
  )

  const confirmed = items.filter(
    i => i.reciprocal_status === 'confirmed'
  )

  const pendingTotalPages = Math.max(
    1, Math.ceil(pending.length / PAGE_SIZE)
  )

  const confirmedTotalPages = Math.max(
    1, Math.ceil(confirmed.length / PAGE_SIZE)
  )

  const currentPendingPage = Math.min(
    pendingPage, pendingTotalPages
  )

  const currentConfirmedPage = Math.min(
    confirmedPage, confirmedTotalPages
  )

  const visiblePending = pending.slice(
    (currentPendingPage - 1) * PAGE_SIZE,
    currentPendingPage * PAGE_SIZE
  )

  const visibleConfirmed = confirmed.slice(
    (currentConfirmedPage - 1) * PAGE_SIZE,
    currentConfirmedPage * PAGE_SIZE
  )

  function renderAccount(item, done, index) {
    const url = safeUrl(
      item.profile_url,
      campaign?.platform
    )

    return (
      <article
        key={item.id}
        className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:border-blue-200 hover:shadow-md sm:p-5"
      >
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-600">
            {index}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="break-all text-sm font-black text-slate-950">
                @{item.username || 'Tài khoản chưa có tên'}
              </p>

              <span className={
                'rounded-full px-3 py-1 text-xs font-bold ' +
                (done
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-800')
              }>
                {done ? '✓ Đã hoàn thành' : 'Đang chờ xác nhận'}
              </span>
            </div>

            <div className="mt-2 space-y-1 text-xs text-slate-500">
              <p>Tham gia: {formatDate(item.submitted_at)}</p>

              {done && (
                <p>
                  Xác nhận: {formatDate(item.confirmed_at)}
                </p>
              )}
            </div>

            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block max-w-full break-all text-sm font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-800"
              >
                Xem tài khoản mạng xã hội ↗
              </a>
            ) : (
              <p className="mt-3 text-xs text-amber-700">
                Chưa có liên kết hợp lệ.
              </p>
            )}

            {!done && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setConfirmItem(item)}
                  disabled={busyId !== null}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {busyId === item.id
                    ? 'Đang xác nhận...'
                    : '✓ Xác nhận đã tương tác lại'}
                </button>
              </div>
            )}
          </div>
        </div>
      </article>
    )
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-4 sm:p-5">
        <div>
          <h4 className="text-lg font-black text-slate-950">
            Danh sách người tham gia
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            Chiến dịch #{campaignId}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-100 bg-white p-4">
            <p className="text-xs text-slate-500">
              Lượt mong muốn
            </p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              {campaign?.quantity ?? '—'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-4">
            <p className="text-xs text-slate-500">
              Đã tham gia
            </p>
            <p className="mt-1 text-2xl font-black text-blue-600">
              {campaign?.completed ?? items.length}
            </p>
          </div>
        </div>

        {Number(campaign?.quantity) > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs font-semibold text-slate-600">
              <span>Tiến độ chiến dịch</span>
              <span>
                {Math.min(
                  100,
                  Math.round(
                    Number(campaign?.completed || 0) /
                    Number(campaign.quantity) * 100
                  )
                )}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Number(campaign?.completed || 0) /
                    Number(campaign.quantity) * 100
                  )}%`
                }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
          {success}
        </p>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-black text-slate-950">
              Chờ tương tác lại ({pending.length})
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Những tài khoản cần bạn tương tác lại.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading || busyId !== null}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            ↻ Làm mới
          </button>
        </div>

        {loading ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Đang tải danh sách...
          </p>
        ) : pending.length ? (
          <div className="space-y-3">
            {visiblePending.map((item, index) =>
              renderAccount(
                item,
                false,
                (currentPendingPage - 1) * PAGE_SIZE + index + 1
              )
            )}

            <Pagination
              page={currentPendingPage}
              total={pending.length}
              onChange={setPendingPage}
            />
          </div>
        ) : (
          <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
            Không có tài khoản nào đang chờ tương tác lại.
          </p>
        )}
      </div>

      <div className="border-t border-slate-100 pt-5">
        <div className="mb-4">
          <h4 className="text-base font-black text-slate-950">
            Đã tương tác lại ({confirmed.length})
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            Những tài khoản đã được xác nhận hoàn thành.
          </p>
        </div>

        {!loading && confirmed.length ? (
          <div className="space-y-3">
            {visibleConfirmed.map((item, index) =>
              renderAccount(
                item,
                true,
                (currentConfirmedPage - 1) * PAGE_SIZE + index + 1
              )
            )}

            <Pagination
              page={currentConfirmedPage}
              total={confirmed.length}
              onChange={setConfirmedPage}
            />
          </div>
        ) : (
          !loading && (
            <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
              Chưa có tài khoản được xác nhận.
            </p>
          )
        )}
      </div>

      {confirmItem && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="presentation"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reciprocal-detail-confirm-title"
            aria-describedby="reciprocal-detail-confirm-description"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="m8 12 3 3 5-6" />
              </svg>
            </div>

            <h3
              id="reciprocal-detail-confirm-title"
              className="text-xl font-black text-slate-950"
            >
              Xác nhận tương tác lại?
            </h3>

            <p
              id="reciprocal-detail-confirm-description"
              className="mt-3 text-sm leading-6 text-slate-600"
            >
              Bạn xác nhận rằng mình đã thực hiện tương tác lại
              với tài khoản dưới đây?
            </p>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-semibold text-slate-500">
                Tài khoản cần xác nhận
              </p>

              <p className="mt-1 break-all text-base font-black text-slate-900">
                @{confirmItem.username || 'Tài khoản chưa có tên'}
              </p>
            </div>

            <p className="mt-4 text-xs leading-5 text-amber-700">
              Chỉ xác nhận sau khi đã thực hiện tương tác thật sự.
              Hệ thống sẽ ghi nhận tài khoản này là đã hoàn thành.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => setConfirmItem(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => confirm(confirmItem)}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {busyId !== null
                  ? 'Đang xử lý...'
                  : 'Xác nhận đã tương tác'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
