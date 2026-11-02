import NoScamSelect from '../../components/ui/NoScamSelect'
import { useNoScamUI } from '../../components/ui/NoScamUI'
import * as ReactClaimAccounts from 'react'
import { useEffect, useMemo, useState } from 'react'
import adminExchangeService from '../../services/adminExchangeService'

const platforms = {
  youtube: 'YouTube',
  threads: 'Threads',
  twitter: 'X (Twitter)',
  telegram: 'Telegram',
  zalo: 'Zalo',
  pinterest: 'Pinterest',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
}

const taskTypes = {
  view: 'Lượt xem',
  share: 'Chia sẻ',
  subscribe: 'Đăng ký',
  repost: 'Đăng lại',
  join: 'Tham gia',
  reaction: 'Cảm xúc',
  save: 'Lưu',
  upvote: 'Bình chọn',
  follow: 'Theo dõi',
  like: 'Thích',
  comment: 'Bình luận',
}

const statuses = {
  draft: 'Bản nháp',
  active: 'Đang chạy',
  paused: 'Tạm dừng',
  completed: 'Hoàn thành',
  cancelling: 'Đang hủy',
  cancelled: 'Đã hủy',
}

const claimLabels = [
  ['claimed_count', 'Đã nhận, chưa gửi'],
  ['submitted_count', 'Chờ duyệt'],
  ['approved_count', 'Được duyệt'],
  ['rejected_count', 'Bị từ chối'],
  ['disputed_count', 'Khiếu nại'],
  ['refunded_count', 'Đã hoàn theo claim'],
]

const money = (value) =>
  `${Number(value ?? 0).toLocaleString('vi-VN', {
    maximumFractionDigits: 0,
  })} xu`

const date = (value) => {
  if (!value) return 'Chưa có dữ liệu'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? 'Chưa có dữ liệu'
    : parsed.toLocaleString('vi-VN')
}

const number = (value) => Number(value ?? 0)

const statusClass = (status) => ({
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  paused: 'bg-amber-50 text-amber-700 ring-amber-200',
  completed: 'bg-blue-50 text-blue-700 ring-blue-200',
  cancelling: 'bg-orange-50 text-orange-700 ring-orange-200',
  cancelled: 'bg-red-50 text-red-700 ring-red-200',
  draft: 'bg-slate-100 text-slate-600 ring-slate-200',
}[status] || 'bg-slate-100 text-slate-600 ring-slate-200')

function Status({ value }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClass(value)}`}>
      {statuses[value] || value || 'Không rõ'}
    </span>
  )
}

function Info({ label, children }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-1 break-words text-sm font-bold text-slate-900">
        {children ?? '—'}
      </div>
    </div>
  )
}

function TargetLink({ url }) {
  let valid = false
  try {
    const parsed = new URL(url)
    valid = ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    valid = false
  }

  if (!valid) return <span>Không có liên kết hợp lệ</span>

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all text-blue-700 underline underline-offset-2 hover:text-blue-900"
    >
      {url}
    </a>
  )
}

// NOSCAM_CAMPAIGN_ACTION_SAFE_V2
function CampaignDetails({ campaign, onClose, onChanged }) {
  const { confirm, prompt } = useNoScamUI()
  const c = campaign
  const [reason, setReason] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [finalizeReason, setFinalizeReason] = useState('')
  const [finalizeError, setFinalizeError] = useState('')
  const [finalizeAcknowledged, setFinalizeAcknowledged] = useState(false)
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)
  const total = Math.max(0, number(c.quantity))
  const approved = Math.max(0, number(c.approved_count))
  const progress = total ? Math.min(100, approved / total * 100) : 0
  // NOSCAM_CAMPAIGN_DETAILS_V3
  const remaining = Math.max(0, total - approved)
  const hasLegacyBudget = [
    c.budget_total,
    c.budget_held,
    c.budget_settled,
    c.budget_refunded,
  ].some((value) => Number(value || 0) > 0)

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const changeStatus = async (action) => {
    if (saving) return

    const cleanReason = reason.trim()

const verb = action === 'pause' ? 'TẠM DỪNG' : 'TIẾP TỤC'

    if (!await confirm(
      `Xác nhận ${verb} chiến dịch #${c.id}?`
    )) return

    setSaving(true)
    setActionError('')

    try {
      await adminExchangeService.changeCampaignStatus(
        c.id, action, cleanReason
      )
      onChanged()
    } catch (error) {
      setActionError(error?.message || 'Không thể cập nhật chiến dịch.')
    } finally {
      setSaving(false)
    }
  }

  const finalizeCancellation = async () => {
    if (saving || c.status !== 'cancelling') return

    const cleanReason = finalizeReason.trim()

    if (cleanReason.length < 10 || cleanReason.length > 2000) {
      setFinalizeError('Nhập lý do quyết toán từ 10 đến 2000 ký tự.')
      return
    }

    if (!finalizeAcknowledged) {
      setFinalizeError('Bạn phải xác nhận đã kiểm tra nhiệm vụ và ngân sách.')
      return
    }

    const expected = `HOAN XU ${c.id}`
    const confirmation = await prompt(
      `HOÀN XU THẬT cho chiến dịch #${c.id}.\n\n` +
      `Ngân sách đang giữ (tham khảo): ${money(c.budget_held)}\n` +
      'Backend sẽ kiểm tra điều kiện và xác định số xu thực tế.\n' +
      'Thao tác có thể ghi giao dịch vào ví người tạo.\n\n' +
      `Nhập chính xác "${expected}" để tiếp tục:`
    )

    if (confirmation !== expected) return

    if (!await confirm(
      `XÁC NHẬN LẦN CUỐI\n\n` +
      `Hoàn tất hủy chiến dịch #${c.id} và hoàn ngân sách ` +
      'theo kết quả kiểm tra của backend?'
    )) return

    setSaving(true)
    setFinalizeError('')

    try {
      await adminExchangeService.finalizeCampaignCancellation(
        c.id, cleanReason
      )
      onChanged()
    } catch (error) {
      setFinalizeError(
        error?.message ||
        'Không thể hoàn tất hủy. Kiểm tra nhiệm vụ và ngân sách.'
      )
    } finally {
      setSaving(false)
    }
  }

  const requestCancellation = async () => {
    if (saving || !['active', 'paused'].includes(c.status)) return

    const cleanReason = cancelReason.trim()

    if (!await confirm(
      `Xác nhận HỦY chiến dịch #${c.id} và HOÀN XU còn lại?\n\n` +
      `Ngân sách đang giữ (tham khảo): ${money(c.budget_held)}\n` +
      'Backend sẽ kiểm tra nhiệm vụ, ký quỹ và ví trước khi hoàn xu.\n' +
      'Nếu còn nhiệm vụ chưa quyết toán, thao tác sẽ bị từ chối.'
    )) return

    setSaving(true)
    setCancelError('')

    try {
      await adminExchangeService.requestCampaignCancellation(
        c.id, cleanReason
      )
      onChanged()
    } catch (error) {
      setCancelError(error?.message || 'Không thể yêu cầu hủy chiến dịch.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết chiến dịch ${c.id}`}
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Quản trị chiến dịch
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-950">
              {adminCampaignCode(c)}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {platforms[c.platform] || c.platform} · {taskTypes[c.task_type] || c.task_type}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Status value={c.status} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng chi tiết"
              className="rounded-xl bg-slate-100 px-3 py-2 text-xl text-slate-600 hover:bg-slate-200"
            >
              ×
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">

          {/* NOSCAM_CAMPAIGN_DETAILS_V3 */}

          <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-5 text-white sm:p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-100">
                Tổng quan chiến dịch
              </p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-black">
                    {approved.toLocaleString('vi-VN')}
                    <span className="text-lg font-medium text-blue-100">
                      {' / '}{total.toLocaleString('vi-VN')}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-blue-100">
                    Lượt tương tác đã hoàn thành
                  </p>
                </div>
                <div className="rounded-xl bg-white/15 px-4 py-2 text-right">
                  <p className="text-2xl font-black">
                    {progress.toFixed(1)}%
                  </p>
                  <p className="text-xs text-blue-100">
                    Tiến độ
                  </p>
                </div>
              </div>
              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
              {[
                ['Mục tiêu', total],
                ['Hoàn thành', approved],
                ['Còn lại', remaining],
                ['Tiến độ', `${progress.toFixed(1)}%`],
              ].map(([label, value]) => (
                <div key={label} className="bg-white px-4 py-4">
                  <p className="text-xs font-medium text-slate-500">
                    {label}
                  </p>
                  <p className="mt-2 text-xl font-black text-slate-900">
                    {typeof value === 'number'
                      ? value.toLocaleString('vi-VN')
                      : value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h4 className="text-base font-black text-slate-950">
                Thông tin chiến dịch
              </h4>
              <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                #{c.id}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Nền tảng">
                {platforms[c.platform] || c.platform}
              </Info>
              <Info label="Loại tương tác">
                {taskTypes[c.task_type] || c.task_type}
              </Info>
              <Info label="Trạng thái">
                <Status value={c.status} />
              </Info>
              {/* NOSCAM_RECIPROCAL_DETAILS_V1 */}
              <Info label="Tài khoản nhận tương tác">
                {c.social_account?.username
                  ? `@${String(c.social_account.username).replace(/^@/, '')}`
                  : c.social_account_id
                    ? `Tài khoản liên kết #${c.social_account_id}`
                    : 'Chưa có dữ liệu'}
              </Info>
              <Info label="Tài khoản mục tiêu">
                {c.social_account?.username ||
                  (c.social_account_id
                    ? `#${c.social_account_id}`
                    : 'Chưa có dữ liệu')}
              </Info>
            </div>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <p className="mb-2 text-xs font-bold text-slate-600">
                Liên kết mục tiêu
              </p>
              <TargetLink url={c.target_url} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="mb-4 text-base font-black text-slate-950">
              Người tạo chiến dịch
            </h4>

            <div className="grid gap-3 sm:grid-cols-3">
              <Info label="Tên người tạo">
                {c.user?.name || 'Chưa có tên'}
              </Info>
              <Info label="User ID">
                #{c.user_id}
              </Info>
              <Info label="Email">
                {c.user?.email || 'Chưa có dữ liệu'}
              </Info>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="mb-4 text-base font-black text-slate-950">
              Trạng thái và thời gian
            </h4>

            <div className="flex flex-wrap items-center gap-3">
              <Status value={c.status} />
              <span className="text-sm text-slate-600">
                {c.status === 'active'
                  ? 'Chiến dịch đang hoạt động.'
                  : c.status === 'paused'
                    ? 'Chiến dịch đã được tạm dừng.'
                    : c.status === 'completed'
                      ? 'Chiến dịch đã hoàn thành mục tiêu.'
                      : c.status === 'cancelling'
                        ? 'Chiến dịch đang trong quy trình hủy.'
                        : c.status === 'cancelled'
                          ? 'Chiến dịch đã bị hủy.'
                          : 'Chiến dịch chưa được kích hoạt.'}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="Ngày tạo">
                {date(c.created_at)}
              </Info>
              <Info label="Cập nhật gần nhất">
                {date(c.updated_at)}
              </Info>
            </div>
          </section>

          {!c.is_free_reciprocal && hasLegacyBudget && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
              <h4 className="text-base font-black text-slate-950">
                Dữ liệu ngân sách chiến dịch cũ
              </h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Chiến dịch này có dữ liệu xu. Thông tin được giữ
                để Admin đối chiếu khi xử lý hủy hoặc hoàn ngân sách.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Info label="Tổng ngân sách">
                  {money(c.budget_total)}
                </Info>
                <Info label="Đang giữ">
                  {money(c.budget_held)}
                </Info>
                <Info label="Đã quyết toán">
                  {money(c.budget_settled)}
                </Info>
                <Info label="Đã hoàn">
                  {money(c.budget_refunded)}
                </Info>
              </div>
            </section>
          )}

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-6 text-slate-700">
            Các thông tin trên được lấy từ dữ liệu chiến dịch.
            Thay đổi trạng thái chỉ có hiệu lực khi máy chủ
            xác nhận thành công.
          </div>

          {['active', 'paused'].includes(c.status) && (
            <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <h4 className="font-black text-slate-900">
                Điều khiển chiến dịch
              </h4>
              <p className="text-sm text-slate-600">
                Tạm dừng sẽ chặn nhận nhiệm vụ mới. Nhiệm vụ đã nhận
                vẫn cần được xử lý theo quy định.
              </p>
              <label
                htmlFor="campaign-action-reason"
                className="block text-sm font-semibold text-slate-700"
              >
                Lý do thao tác
              </label>
              <textarea
                id="campaign-action-reason"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value)
                  setActionError('')
                }}
                rows={3}
                maxLength={2000}
                placeholder="Nhập lý do tạm dừng hoặc tiếp tục chiến dịch..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-500"
              />
              {actionError && (
                <p role="alert" className="text-sm font-semibold text-red-600">
                  {actionError}
                </p>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => changeStatus(
                  c.status === 'active' ? 'pause' : 'resume'
                )}
                className={`rounded-xl px-5 py-3 text-sm font-bold text-white disabled:opacity-50 ${
                  c.status === 'active'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {saving
                  ? 'Đang xử lý...'
                  : c.status === 'active'
                    ? 'Tạm dừng nhận nhiệm vụ (không hoàn xu)'
                    : 'Tiếp tục chiến dịch'}
              </button>

            </div>
          )}


          {c.status === 'cancelling' && (
            <section className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    Xem trước quyết toán và hoàn ngân sách
                  </h4>
                  <p className="mt-1 text-sm text-slate-600">
                    Thông tin tham khảo từ dữ liệu chiến dịch hiện tại.
                    Đây không phải kết quả kiểm toán giao dịch.
                  </p>
                </div>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
                  Chỉ hoàn xu khi Admin xác nhận
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Info label="Ngân sách đang giữ">
                  {c.budget_held == null ? 'Chưa có dữ liệu' : money(c.budget_held)}
                </Info>
                <Info label="Đã quyết toán">
                  {c.budget_settled == null ? 'Chưa có dữ liệu' : money(c.budget_settled)}
                </Info>
                <Info label="Đã hoàn trước đó">
                  {c.budget_refunded == null ? 'Chưa có dữ liệu' : money(c.budget_refunded)}
                </Info>
              </div>

              <div className="mt-4 rounded-xl border border-orange-100 bg-white p-4">
                <h5 className="font-bold text-slate-900">
                  Kiểm tra trước khi quyết toán
                </h5>

                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <p>
                    Nhiệm vụ đã nhận, chưa gửi:
                    <strong className="ml-2">
                      {c.claimed_count == null ? 'Chưa có dữ liệu' : number(c.claimed_count)}
                    </strong>
                  </p>

                  <p>
                    Nhiệm vụ đang chờ duyệt:
                    <strong className="ml-2">
                      {c.submitted_count == null ? 'Chưa có dữ liệu' : number(c.submitted_count)}
                    </strong>
                  </p>

                  <p>
                    Khiếu nại:
                    <strong className="ml-2">
                      {c.disputed_count == null ? 'Chưa có dữ liệu' : number(c.disputed_count)}
                    </strong>
                  </p>
                </div>

                <p className="mt-3 text-xs leading-5 text-orange-800">
                  Các số liệu trên có thể thay đổi.
                  Backend phải kiểm tra lại toàn bộ claim, ký quỹ
                  và lịch sử giao dịch trước khi quyết toán.
                </p>
              </div>

              <div className="mt-4 space-y-3 rounded-xl border border-red-200 bg-white p-4">
                <h5 className="font-black text-red-800">
                  Hoàn tất hủy chiến dịch
                </h5>

                <p className="text-sm leading-6 text-slate-700">
                  Chỉ thực hiện sau khi đã xử lý xong nhiệm vụ
                  và khiếu nại. Backend sẽ kiểm tra lại ngân sách,
                  giao dịch ký quỹ và điều kiện hoàn xu.
                </p>

                <label
                  htmlFor="campaign-finalize-reason"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Lý do hoàn tất hủy
                </label>

                <textarea
                  id="campaign-finalize-reason"
                  rows={3}
                  maxLength={2000}
                  value={finalizeReason}
                  onChange={(event) => {
                    setFinalizeReason(event.target.value)
                    setFinalizeError('')
                  }}
                  placeholder="Nhập lý do quyết toán và hoàn xu..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-red-500"
                />

                <label className="flex items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={finalizeAcknowledged}
                    onChange={(event) => {
                      setFinalizeAcknowledged(event.target.checked)
                      setFinalizeError('')
                    }}
                    className="mt-1"
                  />
                  <span>
                    Tôi đã kiểm tra nhiệm vụ, khiếu nại và ngân sách.
                    Tôi hiểu thao tác này có thể hoàn xu thật
                    vào ví người tạo chiến dịch.
                  </span>
                </label>

                {finalizeError && (
                  <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                    {finalizeError}
                  </p>
                )}

                <button
                  type="button"
                  disabled={saving || !finalizeAcknowledged}
                  onClick={finalizeCancellation}
                  className="rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? 'Đang kiểm tra và xử lý...'
                    : 'Hoàn tất hủy chiến dịch'}
                </button>
              </div>
            </section>
          )}

          {['active', 'paused'].includes(c.status) && (
            <section className="space-y-3 rounded-2xl border border-red-200 bg-red-50/50 p-4">
              <div>
                <h4 className="font-black text-red-800">
                  Hủy chiến dịch
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Backend sẽ kiểm tra điều kiện trước khi hủy.
                  Chỉ hoàn xu khi mọi nhiệm vụ đã quyết toán.
                  Nếu chưa đủ điều kiện, chiến dịch giữ nguyên.
                </p>
              </div>

              <label
                htmlFor="campaign-cancel-reason"
                className="block text-sm font-semibold text-slate-700"
              >
                Lý do hủy chiến dịch
              </label>

              <textarea
                id="campaign-cancel-reason"
                value={cancelReason}
                onChange={(event) => {
                  setCancelReason(event.target.value)
                  setCancelError('')
                }}
                rows={3}
                maxLength={2000}
                placeholder="Nhập lý do muốn hủy chiến dịch..."
                className="w-full rounded-xl border border-red-200 bg-white p-3 text-sm outline-none focus:border-red-500"
              />

              {cancelError && (
                <p role="alert" className="text-sm font-semibold text-red-700">
                  {cancelError}
                </p>
              )}

              <button
                type="button"
                disabled={saving}
                onClick={requestCancellation}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Đang xử lý...' : 'Hủy chiến dịch'}
              </button>
            </section>
          )}

          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
            Hủy và hoàn xu được thực hiện cùng một thao tác khi đủ điều kiện.
            Hoàn xu chỉ thực hiện khi Admin xác nhận và backend chấp nhận.
            Không xóa cứng chiến dịch có giao dịch.
          </p>
        </div>

        <footer className="border-t border-slate-100 p-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            Đóng chi tiết
          </button>
        </footer>
      </section>
    </div>
  )
}



// NOSCAM_ADMIN_INTERACTION_AUDIT_UI_V1
function AdminCampaignClaimAccounts({ campaignId, quantity }) {
  const [payload, setPayload] = ReactClaimAccounts.useState(null)
  const [loading, setLoading] = ReactClaimAccounts.useState(true)
  const [error, setError] = ReactClaimAccounts.useState('')

  ReactClaimAccounts.useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setPayload(null)

    adminExchangeService.campaignClaims(campaignId)
      .then((response) => {
        if (!active) return
        setPayload(response?.data?.data ?? response?.data ?? response)
      })
      .catch((err) => {
        if (active) {
          setError(err?.response?.data?.message || err?.message || 'Không tải được lịch sử.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [campaignId])

  const claims = Array.isArray(payload?.claims) ? payload.claims : []
  const history = Array.isArray(payload?.performed_history)
    ? payload.performed_history : []

  const safeUrl = (value) => {
    if (!value) return null
    try {
      const url = new URL(String(value))
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null
    } catch {
      return null
    }
  }

  const showDate = (value) => {
    if (!value) return 'Chưa có dữ liệu'
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? 'Chưa có dữ liệu'
      : date.toLocaleString('vi-VN')
  }

  const username = (value) => value
    ? `@${String(value).replace(/^@/, '')}`
    : 'Chưa có dữ liệu'

  const link = (value) => {
    const url = safeUrl(value)
    return url
      ? <a href={url} target="_blank" rel="noopener noreferrer"
          className="break-all font-semibold text-blue-600 underline">
          {url}
        </a>
      : <span className="text-slate-400">Chưa có dữ liệu</span>
  }

  const statusName = (value) => ({
    claimed: 'Đã nhận nhiệm vụ',
    submitted: 'Đã gửi thực hiện',
    approved: 'Đã duyệt',
    rejected: 'Đã từ chối',
    confirmed: 'Đã xác nhận',
    pending_review: 'Chờ xác nhận',
    pending: 'Đang chờ',
    settled: 'Đã quyết toán',
    refunded: 'Đã hoàn',
  }[value] || value || 'Chưa có dữ liệu')

  const info = (label, content) => (
    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
      <p className="mb-1 text-xs font-semibold text-slate-500">{label}</p>
      <div className="break-words text-sm text-slate-900">{content}</div>
    </div>
  )

  const renderClaim = (claim, index, outgoing = false) => (
    <article key={claim.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <strong className="text-sm text-slate-900">
          Lượt #{claim.id} · {outgoing ? 'Đã thực hiện cho người khác' : `Lượt nhận ${index + 1}`}
        </strong>
        <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
          {statusName(claim.status)}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {info('Người thực hiện trên NoScam',
          claim.worker?.username || claim.worker?.name ||
          (claim.worker?.id ? `User #${claim.worker.id}` : 'Chưa có dữ liệu'))}
        {info('Username mạng xã hội thực hiện', username(claim.account_username))}
        {info('Link tài khoản thực hiện', link(claim.profile_url))}
        {info('Username tài khoản nhận', username(
          outgoing ? claim.target_username : payload?.receiver?.username
        ))}
        {info('Link đích nhận tương tác',
          link(claim.target_url || (outgoing ? null : payload?.receiver?.target_url)))}
        {info('Mã chiến dịch đích', claim.campaign_id
          ? `NSC-${({follow:'FOL',like:'LIK',comment:'CMT'}[claim.task_type] || 'TSK')}-${String(claim.campaign_id).padStart(6, '0')}`
          : 'Chưa có dữ liệu')}
        {info('Ngày nhận nhiệm vụ', showDate(claim.claimed_at))}
        {info('Ngày gửi thực hiện', showDate(claim.submitted_at))}
        {info('Trạng thái xác nhận', statusName(claim.reciprocal_status))}
        {info('Ngày xác nhận', showDate(claim.reciprocal_confirmed_at))}
      </div>

      {!outgoing && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
          <p className="mb-2 text-sm font-bold text-blue-900">
            Thông tin tài khoản nhận khi xác nhận lượt
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {info('Username nhận', username(claim.return_username))}
            {info('Link tài khoản nhận', link(claim.return_profile_url))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Đây là tài khoản nhận tương tác được ghi nhận khi xác nhận,
            không phải lịch sử chủ chiến dịch thực hiện cho người khác.
          </p>
        </div>
      )}
    </article>
  )

  return (
    <section className="mt-5 space-y-5">
      {loading && <p className="rounded-xl bg-white p-4">Đang tải lịch sử tương tác...</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}

      {!loading && !error && payload && (
        <>
          <div className="rounded-2xl border border-blue-100 bg-white p-4">
            <h3 className="text-base font-black text-slate-950">
              1. Người khác thực hiện cho chiến dịch này
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {claims.length} lượt ghi nhận · Mục tiêu {quantity} lượt
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {info('Chủ chiến dịch NoScam',
                payload.creator?.username || payload.creator?.name || 'Chưa có dữ liệu')}
              {info('Tài khoản nhận tương tác', username(payload.receiver?.username))}
              {info('Link tài khoản nhận', link(payload.receiver?.profile_url))}
              {info('Link đích chiến dịch', link(payload.receiver?.target_url))}
            </div>
          </div>

          <div className="space-y-3">
            {claims.map((claim, index) => renderClaim(claim, index))}
            {claims.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                Chưa có lượt thực hiện nào.
              </p>
            )}
          </div>

          {payload.is_free_reciprocal && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-blue-100 bg-white p-4">
                <h3 className="text-base font-black text-slate-950">
                  2. Chủ chiến dịch đã thực hiện cho người khác
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {history.length} lượt gần nhất được trả về.
                  Mỗi lượt có tài khoản thực hiện và link đích riêng.
                </p>
              </div>

              {history.map((claim, index) => renderClaim(claim, index, true))}

              {history.length === 0 && (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  Chưa có lịch sử thực hiện tương tác chéo.
                </p>
              )}

              {history.length >= (payload.performed_history_limit || 100) && (
                <p className="text-xs text-amber-700">
                  Chỉ đang hiển thị tối đa 100 lượt gần nhất, chưa phải toàn bộ lịch sử.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}

// NOSCAM_CAMPAIGN_FULLNAME_CLICK_V2
function adminCampaignCode(c) {
  const type = {
    follow: 'FOL',
    like: 'LIK',
    comment: 'CMT',
  }[c.task_type] || 'TSK'

  return `NSC-${type}-${String(c.id).padStart(6, '0')}`
}

export default function ExchangeCampaignList() {
  const [items, setItems] = useState([])
  // NOSCAM_CAMPAIGN_ADMIN_V2
  const [platform, setPlatform] = useState('')
  const [taskType, setTaskType] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [selected, setSelected] = useState(null)
  // NOSCAM_ADMIN_STATS_INTERACTIVE_V1
  const [statView, setStatView] = useState('all')


  useEffect(() => {
    let active = true
    setLoading(true)

    adminExchangeService.campaigns({ platform, taskType, status, page })
      .then((response) => {
        if (!active) return
        setItems(Array.isArray(response?.data) ? response.data : [])
        setLastPage(Math.max(1, Number(response?.last_page || 1)))
        setError('')
      })
      .catch((err) => {
        if (!active) return
        setItems([])
        setError(err?.message || 'Không tải được chiến dịch.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [platform, taskType, status, page, refresh])

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return items

    return items.filter((c) => [
      adminCampaignCode(c),
      adminCampaignCode(c).replace(/0+(?=\d+$)/, ''),
      c.id, c.user_id, c.user?.name, c.user?.email,
      c.platform, c.task_type, c.target_url,
      c.social_account?.username,
    ].some((value) => String(value ?? '').toLowerCase().includes(keyword)))
  }, [items, search])

  const visibleCampaigns = useMemo(() => {
    if (statView === 'active') {
      return filtered.filter(c => c.status === 'active')
    }
    if (statView === 'completed') {
      return filtered.filter(c => Number(c.approved_count || 0) > 0)
    }
    return filtered
  }, [filtered, statView])

  const openStatView = (view) => {
    setStatView(current => current === view ? 'all' : view)
  }

  const changeFilter = (setter, value) => {
    setPage(1)
    setter(value)
  }

  const totalRequested = filtered.reduce(
    (sum, c) => sum + Math.max(0, number(c.quantity)), 0
  )
  const totalCompleted = filtered.reduce(
    (sum, c) => sum + Math.max(0, number(c.approved_count)), 0
  )

  return (
    <section className="w-full min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Quản lý chiến dịch</h2>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi người tạo, nền tảng, loại tương tác và tiến độ thực hiện.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Làm mới dữ liệu
        </button>
      </div>


      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['all', 'Chiến dịch hiển thị', filtered.length],
          ['active', 'Đang hoạt động',
            filtered.filter(c => c.status === 'active').length],
          ['requested', 'Lượt yêu cầu',
            totalRequested.toLocaleString('vi-VN')],
          ['completed', 'Lượt hoàn thành',
            totalCompleted.toLocaleString('vi-VN')],
        ].map(([key, label, value]) => (
          <button
            key={key}
            type="button"
            onClick={() => openStatView(key)}
            aria-pressed={statView === key}
            className={`rounded-2xl border p-4 text-left shadow-sm transition
              hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md
              focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100
              ${statView === key
                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                : 'border-slate-200 bg-white'}`}
          >
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 break-words text-xl font-black text-slate-900">
              {value}
            </p>
            <p className="mt-2 text-xs font-semibold text-blue-600">
              {statView === key ? 'Đang xem · Bấm để bỏ lọc' : 'Bấm để xem chi tiết'}
            </p>
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Thống kê phía trên chỉ tính các chiến dịch đang hiển thị trên trang này,
        không phải tổng toàn hệ thống.
      </p>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm ID, người tạo, email, liên kết..."
          aria-label="Tìm chiến dịch trên trang hiện tại"
          className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
        />
        <NoScamSelect
          aria-label="Lọc nền tảng"
          value={platform}
          onChange={(event) => changeFilter(setPlatform, event.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
        >
          <option value="">Tất cả nền tảng</option>
          {Object.entries(platforms).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </NoScamSelect>
        <NoScamSelect
          aria-label="Lọc loại tương tác"
          value={taskType}
          onChange={(event) => changeFilter(setTaskType, event.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
        >
          <option value="">Tất cả tương tác</option>
          {[
            'follow', 'like', 'comment', 'view', 'share',
            'subscribe', 'repost', 'join', 'reaction',
            'save', 'upvote'
          ].map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </NoScamSelect>
        <NoScamSelect
          aria-label="Lọc trạng thái"
          value={status}
          onChange={(event) => changeFilter(setStatus, event.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(statuses).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </NoScamSelect>
      </div>

      <p className="text-xs text-slate-500">
        Ô tìm kiếm lọc trong trang hiện tại. Bộ lọc nền tảng và trạng thái lấy dữ liệu từ máy chủ.
      </p>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
      )}
      {loading && <p className="p-5 text-sm text-slate-500">Đang tải chiến dịch...</p>}
      {!loading && !error && visibleCampaigns.length === 0 && (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">
          Không tìm thấy chiến dịch phù hợp.
        </p>
      )}

      {/* NOSCAM_CAMPAIGN_HORIZONTAL_V3 */}
      {!loading && !error && visibleCampaigns.length > 0 && (
        <div className="space-y-3">
          {visibleCampaigns.map((c) => {
            const total = Math.max(0, number(c.quantity))
            const approved = Math.max(0, number(c.approved_count))
            const remaining = Math.max(0, total - approved)
            const progress = total
              ? Math.min(100, approved / total * 100)
              : 0

            const platformName = platforms[c.platform] || c.platform
            const taskName = taskTypes[c.task_type] || c.task_type

            const themes = {
              instagram: 'from-purple-600 via-fuchsia-600 to-pink-500',
              tiktok: 'from-slate-950 to-cyan-800',
              facebook: 'from-blue-700 to-blue-500',
              youtube: 'from-red-700 to-red-500',
              threads: 'from-slate-900 to-slate-600',
              twitter: 'from-slate-900 to-slate-600',
              telegram: 'from-sky-600 to-cyan-500',
              zalo: 'from-blue-600 to-sky-500',
              pinterest: 'from-red-700 to-rose-500',
              linkedin: 'from-blue-800 to-blue-600',
              reddit: 'from-orange-600 to-orange-400',
            }

            const theme = themes[c.platform] ||
              'from-slate-700 to-slate-500'

            return (
              <article
                key={c.id}
                role="button"
                tabIndex={0}
                aria-label={`Xem chi tiết chiến dịch ${adminCampaignCode(c)}`}
                onClick={() => setSelected(c)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelected(c)
                  }
                }}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md sm:p-5"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center">

                  {/* Nền tảng */}
                  <div className="flex min-w-0 items-center gap-3 xl:w-64 xl:shrink-0">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${theme} text-xl font-black text-white`}
                      aria-hidden="true"
                    >
                      {platformName.charAt(0).toUpperCase()}
                    </div>




                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-950">
                        {platformName}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelected(c)}
                        className="mt-0.5 block max-w-full text-left text-blue-600 hover:text-blue-800 hover:underline block max-w-full text-left text-[13px] font-semibold leading-6 tracking-normal text-blue-600 hover:text-blue-700 whitespace-normal"
                        title="Xem toàn bộ thông tin chiến dịch"
                      >
                        <span className="block text-xs font-medium text-slate-500">
                        {taskName}
                      </span>
                      <span className="block whitespace-nowrap font-mono text-[12px] font-semibold tracking-tight text-blue-600">
                        {adminCampaignCode(c)}
                      </span>
                      </button>
                      <div className="mt-2">
                        <Status value={c.status} />
                      </div>
                    </div>
                  </div>

                  {/* Thông tin chiến dịch */}
                  <div className="min-w-0 flex-1 border-t border-slate-100 pt-4 xl:border-l xl:border-t-0 xl:py-1 xl:pl-5">
                    {/* NOSCAM_ADMIN_TARGET_LINK_LAYOUT_V3 */}
                    <div className="mb-4 min-w-0 rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2">
                      <p className="mb-1 text-[11px] font-semibold text-slate-500">
                        Liên kết nhận tương tác
                      </p>
                      {c.target_url ? (
                        <a
                          href={c.target_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          title={c.target_url}
                          className="block max-w-full truncate text-xs font-semibold text-blue-600 hover:underline"
                        >
                          {c.target_url}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Chưa có liên kết
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">

                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <svg width="15" height="15" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round"
                          aria-hidden="true">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
                        </svg>
                        Người tạo
                      </p>
                      <p className="mt-1 truncate text-sm font-bold text-slate-900">
                        {c.user?.name || `User #${c.user_id}`}
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <svg width="15" height="15" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round"
                          aria-hidden="true">
                          <circle cx="12" cy="12" r="9" />
                          <circle cx="12" cy="12" r="5" />
                          <circle cx="12" cy="12" r="1" />
                        </svg>
                        Mục tiêu
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {total.toLocaleString('vi-VN')}
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <svg width="15" height="15" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round"
                          aria-hidden="true">
                          <circle cx="12" cy="12" r="9" />
                          <path d="m8 12 3 3 5-6" />
                        </svg>
                        Hoàn thành
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {approved.toLocaleString('vi-VN')}
                        <span className="font-normal text-slate-400">
                          {' / '}{total.toLocaleString('vi-VN')}
                        </span>
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <svg width="15" height="15" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round"
                          aria-hidden="true">
                          <rect x="3" y="5" width="18" height="16" rx="2" />
                          <path d="M7 3v4M17 3v4M3 10h18" />
                        </svg>
                        Ngày tạo
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-800">
                        {date(c.created_at)}
                      </p>
                    </div>
                  </div>

                  </div>

                  {/* Tiến độ */}
                  <div className="min-w-0 xl:w-32 xl:shrink-0">
                    <div className="mb-2 flex justify-between gap-2 text-xs">
                      <span className="text-slate-500">Tiến độ</span>
                      <strong className="text-blue-700">
                        {progress.toFixed(0)}%
                      </strong>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <p className="mt-1.5 text-xs text-slate-400">
                      Còn {remaining.toLocaleString('vi-VN')} lượt
                    </p>
                  </div>

                  {/* Xem chi tiết */}
                  <button
                    type="button"
                    onClick={() => setSelected(c)}
                    className="shrink-0 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    Xem chi tiết
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          disabled={loading || page <= 1}
          onClick={() => setPage((value) => value - 1)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
        >
          Trước
        </button>
        <span className="text-sm font-semibold text-slate-600">
          Trang {page}/{lastPage}
        </span>
        <button
          type="button"
          disabled={loading || page >= lastPage}
          onClick={() => setPage((value) => value + 1)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
        >
          Sau
        </button>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
        <h3 className="text-base font-black text-slate-900">
          Hướng dẫn quản lý chiến dịch
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Chiến dịch đang hoạt động có thể nhận nhiệm vụ mới.
          Chiến dịch tạm dừng không nhận nhiệm vụ mới nhưng
          những nhiệm vụ đã nhận vẫn cần xử lý.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Các chiến dịch cũ có ngân sách vẫn được xử lý theo
          quy trình quyết toán và hoàn tiền hiện tại.
          Thông tin tài chính được giữ trong phần chi tiết.
        </p>
      </div>


      {selected && (
        <CampaignDetails
          campaign={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null)
            setRefresh((value) => value + 1)
          }}
        />
      )}
    </section>
  )
}
