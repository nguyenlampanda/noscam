import NoScamSelect from '../../components/ui/NoScamSelect'
import { useNoScamUI } from '../../components/ui/NoScamUI'
import * as ReactClaimAccounts from 'react'
import { useEffect, useMemo, useState } from 'react'
import adminExchangeService from '../../services/adminExchangeService'

const platforms = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
}

const taskTypes = {
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
  const hasStats = c.claims_count !== undefined && c.claims_count !== null

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
              Chiến dịch #{c.id}
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

        <div className="space-y-6 overflow-y-auto p-5 sm:p-6">
          <div>
            <h4 className="mb-3 font-black text-slate-900">Người tạo chiến dịch</h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <Info label="Tên người tạo">{c.user?.name || 'Chưa có tên'}</Info>
              <Info label="User ID">#{c.user_id}</Info>
              <Info label="Email">{c.user?.email || 'Chưa có dữ liệu'}</Info>
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-black text-slate-900">Thông tin nhiệm vụ</h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <Info label="Nền tảng">{platforms[c.platform] || c.platform}</Info>
              <Info label="Loại nhiệm vụ">{taskTypes[c.task_type] || c.task_type}</Info>
              <Info label="Số lượng yêu cầu">{total.toLocaleString('vi-VN')}</Info>
              <Info label="Giá mỗi lượt">{money(c.cost_per_task)}</Info>
              <Info label="Thưởng mỗi lượt">{money(c.reward_per_task)}</Info>
              <Info label="Tài khoản đích">
                {c.social_account_id
                  ? `#${c.social_account_id}`
                  : c.social_account?.username || 'Chưa có dữ liệu'}
              </Info>
            </div>
            <div className="mt-3 rounded-xl border border-slate-200 p-4">
              <p className="mb-2 text-xs font-medium text-slate-500">Liên kết mục tiêu</p>
              <TargetLink url={c.target_url} />
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-black text-slate-900">Tiến độ nhiệm vụ</h4>
            {hasStats ? (
              <>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">Được duyệt / Mục tiêu</span>
                    <strong className="text-blue-700">{approved}/{total}</strong>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Info label="Tổng claim">{number(c.claims_count)}</Info>
                <div className="col-span-full">
                  <AdminCampaignClaimAccounts
                    campaignId={c.id}
                    quantity={c.quantity}
                  />
                </div>
                  {claimLabels.map(([key, label]) => (
                    <Info key={key} label={label}>
                      {c[key] === undefined ? 'Chưa có dữ liệu' : number(c[key])}
                    </Info>
                  ))}
                </div>
              </>
            ) : (
              <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                API chưa trả về thống kê claim. Cần hoàn tất phần backend 1044A để xem tiến độ.
              </p>
            )}
          </div>


          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h4 className="text-base font-black text-slate-900">
              Tình trạng xử lý chiến dịch
            </h4>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Status value={c.status} />

              <span className="text-sm text-slate-600">
                {c.status === 'active'
                  ? 'Đang nhận nhiệm vụ mới.'
                  : c.status === 'paused'
                    ? 'Đã tạm dừng nhận nhiệm vụ mới.'
                    : c.status === 'cancelling'
                      ? 'Đang chờ hoàn tất xử lý trước khi kết thúc.'
                      : c.status === 'cancelled'
                        ? 'Chiến dịch đã kết thúc quy trình hủy.'
                        : 'Xem thông tin trạng thái chi tiết.'}
              </span>
            </div>

            {c.status === 'cancelling' && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Chiến dịch đang trong quá trình hủy.
                Các nhiệm vụ chưa xử lý xong có thể khiến việc hoàn ngân sách chưa thực hiện được.
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Info label="Đã hoàn thành">
                {approved.toLocaleString('vi-VN')} / {total.toLocaleString('vi-VN')}
              </Info>

              <Info label="Tỷ lệ hoàn thành">
                {progress.toFixed(1)}%
              </Info>

              <Info label="Trạng thái ngân sách">
                {number(c.budget_held) > 0
                  ? 'Còn xu ký quỹ'
                  : 'Không còn xu ký quỹ'}
              </Info>
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-black text-slate-900">Ngân sách chiến dịch</h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Info label="Tổng ngân sách">{money(c.budget_total)}</Info>
              <Info label="Đang giữ">{money(c.budget_held)}</Info>
              <Info label="Đã quyết toán">{money(c.budget_settled)}</Info>
              <Info label="Đã hoàn">{money(c.budget_refunded)}</Info>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Ngày tạo">{date(c.created_at)}</Info>
            <Info label="Cập nhật gần nhất">{date(c.updated_at)}</Info>
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
                    : 'Tiếp tục nhận nhiệm vụ'}
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
                  Hoàn tất hủy và hoàn xu còn lại
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
                    : 'Hoàn tất hủy và hoàn xu còn lại'}
                </button>
              </div>
            </section>
          )}

          {['active', 'paused'].includes(c.status) && (
            <section className="space-y-3 rounded-2xl border border-red-200 bg-red-50/50 p-4">
              <div>
                <h4 className="font-black text-red-800">
                  Hủy chiến dịch và hoàn xu còn lại
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
                Lý do hủy và hoàn xu
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
                {saving ? 'Đang xử lý...' : 'Hủy chiến dịch và hoàn xu còn lại'}
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


function AdminCampaignClaimAccounts({ campaignId, quantity }) {
  const [claims, setClaims] = ReactClaimAccounts.useState([])
  const [loading, setLoading] = ReactClaimAccounts.useState(true)
  const [error, setError] = ReactClaimAccounts.useState('')

  ReactClaimAccounts.useEffect(() => {
    let active = true

    setLoading(true)
    setError('')
    setClaims([])

    adminExchangeService.campaignClaims(campaignId)
      .then((response) => {
        if (!active) return

        const payload = response?.data?.data ?? response?.data ?? response
        setClaims(Array.isArray(payload?.claims) ? payload.claims : [])
      })
      .catch((err) => {
        if (active) {
          setError(err?.response?.data?.message || err?.message || 'Không tải được tài khoản.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [campaignId])

  const total = Math.max(0, Number(quantity) || 0)
  const remaining = Math.max(0, total - claims.length)

  const statusLabels = {
    claimed: 'Đã nhận',
    submitted: 'Đã gửi',
    approved: 'Đã duyệt',
    rejected: 'Bị từ chối',
    settled: 'Đã quyết toán',
    refunded: 'Đã hoàn',
  }

  const safeProfileUrl = (value) => {
    try {
      const url = new URL(value)
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null
    } catch {
      return null
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-black text-slate-900">
        Tài khoản thực hiện nhiệm vụ
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        {loading ? 'Đang tải...' : `${claims.length} lượt nhận / ${total} lượt yêu cầu`}
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>
      )}

      {!loading && !error && (
        <div className="mt-4 space-y-2">
          {claims.map((claim, index) => {
            const profileUrl = safeProfileUrl(claim.profile_url)

            return (
              <div
                key={claim.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">
                    {index + 1}. {claim.account_username || 'Chưa có tên tài khoản'}
                  </span>
                  <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                    {statusLabels[claim.status] || claim.status || 'Chưa rõ'}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-600">
                  Người thực hiện: {claim.worker?.username || claim.worker?.name || `User #${claim.worker?.id ?? '?'}`}
                </p>

                {profileUrl && (
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block break-all text-sm font-semibold text-blue-600 underline"
                  >
                    {profileUrl}
                  </a>
                )}
              </div>
            )
          })}

          {remaining > 0 && (
            <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
              Còn {remaining} vị trí chưa có lượt nhận nhiệm vụ.
            </p>
          )}

          {claims.length === 0 && remaining === 0 && (
            <p className="text-sm text-slate-500">Không có lượt nhận nhiệm vụ.</p>
          )}
        </div>
      )}
    </section>
  )
}

export default function ExchangeCampaignList() {
  const [items, setItems] = useState([])
  const [platform, setPlatform] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)

    adminExchangeService.campaigns({ platform, status, page })
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
  }, [platform, status, page, refresh])

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return items

    return items.filter((c) => [
      c.id, c.user_id, c.user?.name, c.user?.email,
      c.platform, c.task_type, c.target_url,
      c.social_account?.username,
    ].some((value) => String(value ?? '').toLowerCase().includes(keyword)))
  }, [items, search])

  const changeFilter = (setter, value) => {
    setPage(1)
    setter(value)
  }

  const totalHeld = filtered.reduce((sum, c) => sum + number(c.budget_held), 0)
  const totalSettled = filtered.reduce((sum, c) => sum + number(c.budget_settled), 0)

  return (
    <section className="w-full min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Quản lý chiến dịch</h2>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi người tạo, nhiệm vụ, tiến độ và ngân sách.
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
          ['Chiến dịch hiển thị', filtered.length],
          ['Đang hoạt động', filtered.filter((c) => c.status === 'active').length],
          ['Ngân sách đang giữ', money(totalHeld)],
          ['Đã quyết toán', money(totalSettled)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 break-words text-xl font-black text-slate-900">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Thống kê phía trên chỉ tính các chiến dịch đang hiển thị trên trang này,
        không phải tổng toàn hệ thống.
      </p>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
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
      {!loading && !error && filtered.length === 0 && (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">
          Không tìm thấy chiến dịch phù hợp.
        </p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const total = Math.max(0, number(c.quantity))
            const approved = Math.max(0, number(c.approved_count))
            const hasStats = c.claims_count !== undefined && c.claims_count !== null
            const progress = total ? Math.min(100, approved / total * 100) : 0

            return (
              <article
                key={c.id}
                className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md sm:p-5"
              >
                <div className={`rounded-xl bg-gradient-to-br p-4 text-white ${
                  String(c.platform || '').toLowerCase() === 'tiktok'
                    ? 'from-slate-950 via-slate-900 to-cyan-800'
                    : String(c.platform || '').toLowerCase() === 'instagram'
                      ? 'from-purple-800 via-fuchsia-700 to-pink-500'
                      : String(c.platform || '').toLowerCase() === 'facebook'
                        ? 'from-blue-900 via-blue-700 to-blue-500'
                        : 'from-slate-900 via-slate-800 to-blue-900'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold">
                      CHIẾN DỊCH #{c.id}
                    </span>
                    <span className="text-2xl font-black opacity-80">
                      {String(c.platform || '').toLowerCase() === 'tiktok'
                        ? '♪'
                        : String(c.platform || '').toLowerCase() === 'instagram'
                          ? '◎'
                          : '◉'}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-black">
                    {platforms[c.platform] || c.platform}
                  </h3>
                  <p className="mt-1 text-sm text-slate-200">
                    {taskTypes[c.task_type] || c.task_type}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <Status value={c.status} />
                  <span className="text-xs text-slate-500">
                    {date(c.created_at)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Info label="Người tạo">
                    {c.user?.name || `User #${c.user_id}`}
                    {c.user?.email && (
                      <p className="mt-1 break-all text-xs font-normal text-slate-500">
                        {c.user.email}
                      </p>
                    )}
                  </Info>
                  <Info label="Số lượng yêu cầu">{total.toLocaleString('vi-VN')}</Info>
                  <Info label="Thưởng mỗi lượt">{money(c.reward_per_task)}</Info>
                  <Info label="Ngân sách đang giữ">{money(c.budget_held)}</Info>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-500">
                      {hasStats
                        ? `Được duyệt ${approved}/${total} · Đã nhận ${number(c.claims_count)} claim`
                        : 'Chưa có dữ liệu tiến độ từ API'}
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${hasStats ? progress : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>Đã quyết toán: {money(c.budget_settled)}</p>
                    <p className="mt-1">Đã hoàn: {money(c.budget_refunded)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(c)}
                  className="mt-auto w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  Xem chi tiết chiến dịch
                </button>
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
          Hướng dẫn trạng thái và ngân sách
        </h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-4">
            <p className="font-bold text-emerald-700">Đang hoạt động</p>
            <p className="mt-1 text-sm text-slate-600">
              Chiến dịch đang nhận nhiệm vụ mới.
            </p>
          </div>

          <div className="rounded-xl bg-white p-4">
            <p className="font-bold text-amber-700">Tạm dừng</p>
            <p className="mt-1 text-sm text-slate-600">
              Không nhận nhiệm vụ mới; nhiệm vụ đã nhận vẫn cần xử lý.
            </p>
          </div>

          <div className="rounded-xl bg-white p-4">
            <p className="font-bold text-orange-700">Đang hủy</p>
            <p className="mt-1 text-sm text-slate-600">
              Đang chờ kiểm tra và quyết toán các nhiệm vụ còn tồn.
            </p>
          </div>

          <div className="rounded-xl bg-white p-4">
            <p className="font-bold text-slate-700">Đã hủy</p>
            <p className="mt-1 text-sm text-slate-600">
              Chiến dịch đã kết thúc quy trình hủy.
              Kiểm tra mục Đã hoàn để biết số xu được hoàn.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-blue-100 bg-white p-4">
          <p className="font-bold text-slate-900">Cách đọc ngân sách</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            <strong>Tổng ngân sách:</strong> số xu dành cho chiến dịch.
            <br />
            <strong>Đang giữ:</strong> số xu còn nằm trong ký quỹ.
            <br />
            <strong>Đã quyết toán:</strong> số xu đã được ghi nhận thanh toán.
            <br />
            <strong>Đã hoàn:</strong> số xu đã hoàn lại cho người tạo.
          </p>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-600">
          Admin có thể hủy chiến dịch và hoàn xu còn lại trong một thao tác.
          Backend chỉ hoàn xu khi các nhiệm vụ đã quyết toán
          và dữ liệu ngân sách hợp lệ.
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
