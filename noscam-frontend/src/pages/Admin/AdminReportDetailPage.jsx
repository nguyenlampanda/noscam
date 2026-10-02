import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  AnimatePresence,
  motion,
} from 'motion/react'

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import EvidenceGallery from '../../components/admin/EvidenceGallery'
import ModerationHistory from '../../components/admin/ModerationHistory'

import adminService, {
  removeAdminToken,
} from '../../services/adminService'

function AdminReportDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [report, setReport] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [processing, setProcessing] =
    useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const [
    confirmation,
    setConfirmation,
  ] = useState(null)

  const handleUnauthorized =
    useCallback(() => {
      removeAdminToken()

      navigate('/admin/login', {
        replace: true,
      })
    }, [navigate])

  const loadReport =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        if (!silent) {
          setLoading(true)
        }

        try {
          const response =
            await adminService.getReport(
              id,
            )

          setReport(
            response?.data ?? null,
          )

          setError('')
        } catch (err) {
          if (
            err.status === 401 ||
            err.status === 403
          ) {
            handleUnauthorized()
            return
          }

          setError(
            err.message ||
              'Không thể tải báo cáo.',
          )
        } finally {
          if (!silent) {
            setLoading(false)
          }
        }
      },
      [
        id,
        handleUnauthorized,
      ],
    )

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    loadReport()
  }, [loadReport])

  function requestModeration(
    status,
  ) {
    setConfirmation(status)
    setSuccess('')
  }

  async function moderate() {
    if (!confirmation) {
      return
    }

    const nextStatus =
      confirmation

    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      await adminService
        .updateReportStatus(
          id,
          nextStatus,
        )

      setConfirmation(null)

      await loadReport({
        silent: true,
      })

      setSuccess(
        nextStatus === 'approved'
          ? report?.status ===
            'rejected'
            ? 'Báo cáo đã được duyệt lại và dữ liệu cảnh báo đã được cập nhật.'
            : 'Báo cáo đã được duyệt và dữ liệu cảnh báo đã được cập nhật.'
          : 'Báo cáo đã được từ chối và không còn đóng góp vào dữ liệu cảnh báo công khai.',
      )
    } catch (err) {
      if (
        err.status === 401 ||
        err.status === 403
      ) {
        handleUnauthorized()
        return
      }

      setError(
        err.message ||
          'Không thể cập nhật báo cáo.',
      )
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <AdminPage>
        <DetailSkeleton />
      </AdminPage>
    )
  }

  if (!report) {
    return (
      <AdminPage>
        <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-red-200">
          <div className="text-lg font-bold">
            Không thể mở báo cáo
          </div>

          <p className="mt-2 text-sm">
            {error ||
              'Không tìm thấy báo cáo.'}
          </p>

          <Link
            to="/admin/reports"
            className="mt-5 inline-flex rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-slate-950"
          >
            ← Quay lại danh sách
          </Link>
        </div>
      </AdminPage>
    )
  }

  const evidenceCount =
    report.evidences?.length ?? 0

  const entityCount =
    report.entities?.length ?? 0

  const logCount =
    report.moderation_logs
      ?.length ?? 0

  return (
    <AdminPage>
      <motion.div
        initial={{
          opacity: 0,
          y: 18,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >
        <Link
          to="/admin/reports"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-400 transition hover:text-blue-300"
        >
          ← Quay lại danh sách
        </Link>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950">
                Report #{report.id}
              </h1>

              <StatusBadge
                status={report.status}
              />
            </div>

            <p className="mt-3 text-sm text-slate-500">
              Gửi lúc{' '}
              {formatDateTime(
                report.created_at,
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <MiniStat
              label="Bằng chứng"
              value={evidenceCount}
            />

            <MiniStat
              label="Entity"
              value={entityCount}
            />

            <MiniStat
              label="Lịch sử"
              value={logCount}
            />
          </div>
        </div>

        <AnimatePresence>
          {success && (
            <motion.div
              initial={{
                opacity: 0,
                y: -10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
              }}
              className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200"
            >
              <span>{success}</span>

              <button
                type="button"
                onClick={() =>
                  setSuccess('')
                }
                className="font-bold"
              >
                ×
              </button>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{
                opacity: 0,
                y: -10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
              }}
              className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-6">
            <SectionCard
              eyebrow="Thông tin báo cáo"
              title="Dữ liệu người dùng cung cấp"
            >
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Info
                  label="Loại báo cáo"
                  value={
                    report.scam_type
                  }
                />

                <Info
                  label="Số điện thoại"
                  value={report.phone}
                />

                <Info
                  label="Số tài khoản"
                  value={
                    report.bank_account
                  }
                />

                <Info
                  label="Ngân hàng"
                  value={report.bank}
                />

                <Info
                  label="Mạng xã hội"
                  value={report.social}
                />

                <Info
                  label="Website"
                  value={
                    report.website
                  }
                />

                <Info
                  label="Thiệt hại khai báo"
                  value={formatMoney(
                    report.loss_amount,
                  )}
                />

                <Info
                  label="Ngày xảy ra"
                  value={formatDate(
                    report.occurred_at,
                  )}
                />
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Nội dung"
              title="Mô tả sự việc"
            >
              <div className="whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                {report.description ||
                  'Không có nội dung.'}
              </div>
            </SectionCard>

            {entityCount > 0 && (
              <SectionCard
                eyebrow="Dữ liệu hệ thống"
                title="Entity đã liên kết"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.entities.map(
                    (entity) => (
                      <motion.div
                        key={
                          entity.id
                        }
                        whileHover={{
                          y: -2,
                        }}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          {formatEntityType(
                            entity.type,
                          )}
                        </div>

                        <div className="mt-2 break-all text-sm font-bold text-slate-900">
                          {
                            entity.value
                          }
                        </div>

                        {entity.risk_score !==
                          undefined && (
                          <div className="mt-3 text-xs text-slate-500">
                            Risk Score:{' '}
                            <strong className="text-slate-800">
                              {
                                entity.risk_score
                              }
                              /100
                            </strong>
                          </div>
                        )}
                      </motion.div>
                    ),
                  )}
                </div>
              </SectionCard>
            )}

            <SectionCard
              eyebrow="Bằng chứng"
              title={`Tệp đính kèm (${evidenceCount})`}
            >
              <EvidenceGallery
                evidences={
                  report.evidences ??
                  []
                }
              />
            </SectionCard>

            <SectionCard
              eyebrow="Audit log"
              title="Lịch sử kiểm duyệt"
            >
              <ModerationHistory
                logs={
                  report.moderation_logs ??
                  []
                }
              />
            </SectionCard>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div
                className={`h-1.5 ${statusLine(
                  report.status,
                )}`}
              />

              <div className="p-6">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Quyết định kiểm duyệt
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-600">
                    Trạng thái hiện tại
                  </div>

                  <StatusBadge
                    status={
                      report.status
                    }
                  />
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-500">
                  {report.status ===
                  'pending'
                    ? 'Báo cáo chưa đóng góp vào dữ liệu cảnh báo cho đến khi được duyệt.'
                    : report.status ===
                        'approved'
                      ? 'Báo cáo đang đóng góp vào entity, quan hệ và Risk Score của hệ thống.'
                      : 'Báo cáo hiện không đóng góp vào dữ liệu cảnh báo công khai.'}
                </p>

                <div className="mt-6 space-y-3">
                  {report.status !==
                    'approved' && (
                    <motion.button
                      whileTap={{
                        scale: 0.98,
                      }}
                      type="button"
                      disabled={
                        processing
                      }
                      onClick={() =>
                        requestModeration(
                          'approved',
                        )
                      }
                      className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {report.status ===
                      'rejected'
                        ? 'Duyệt lại báo cáo'
                        : 'Duyệt báo cáo'}
                    </motion.button>
                  )}

                  {report.status !==
                    'rejected' && (
                    <motion.button
                      whileTap={{
                        scale: 0.98,
                      }}
                      type="button"
                      disabled={
                        processing
                      }
                      onClick={() =>
                        requestModeration(
                          'rejected',
                        )
                      }
                      className="w-full rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      Từ chối báo cáo
                    </motion.button>
                  )}
                </div>

                <div className="mt-6 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">
                  Mỗi thay đổi trạng thái
                  được ghi lại trong
                  lịch sử kiểm duyệt.
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                Lưu ý
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Việc duyệt báo cáo chỉ
                xác nhận dữ liệu đủ điều
                kiện tham gia hệ thống
                cảnh báo; không phải kết
                luận một cá nhân hoặc tổ
                chức là lừa đảo.
              </p>
            </div>
          </aside>
        </div>
      </motion.div>

      <AnimatePresence>
        {confirmation && (
          <ConfirmationDialog
            report={report}
            status={confirmation}
            processing={
              processing
            }
            onCancel={() =>
              setConfirmation(null)
            }
            onConfirm={moderate}
          />
        )}
      </AnimatePresence>
    </AdminPage>
  )
}

function ConfirmationDialog({
  report,
  status,
  processing,
  onCancel,
  onConfirm,
}) {
  const approving =
    status === 'approved'

  return (
    <motion.div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm"
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !processing
        ) {
          onCancel()
        }
      }}
    >
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.94,
          y: 20,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        exit={{
          opacity: 0,
          scale: 0.96,
        }}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div
          className={`h-1.5 ${
            approving
              ? 'bg-blue-600'
              : 'bg-red-500'
          }`}
        />

        <div className="p-7">
          <div
            className={`grid h-12 w-12 place-items-center rounded-2xl text-xl font-black ${
              approving
                ? 'bg-blue-50 text-blue-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {approving
              ? '✓'
              : '×'}
          </div>

          <h2 className="mt-5 text-xl font-black text-slate-950">
            {approving
              ? report.status ===
                'rejected'
                ? 'Duyệt lại báo cáo?'
                : 'Duyệt báo cáo?'
              : 'Từ chối báo cáo?'}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Bạn đang thay đổi trạng
            thái của Report #
            {report.id}.
          </p>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            {approving
              ? 'Nếu xác nhận, dữ liệu của báo cáo có thể được đưa vào entity, quan hệ liên quan và Risk Score sẽ được tính lại.'
              : 'Nếu xác nhận, báo cáo sẽ không đóng góp vào dữ liệu cảnh báo công khai và Risk Score sẽ được tính lại.'}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              disabled={processing}
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="button"
              disabled={processing}
              onClick={onConfirm}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-60 ${
                approving
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {processing
                ? 'Đang xử lý...'
                : 'Xác nhận'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function SectionCard({
  eyebrow,
  title,
  children,
}) {
  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 14,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.12,
      }}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-black/5 sm:p-7"
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
        {eyebrow}
      </div>

      <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">
        {title}
      </h2>

      <div className="mt-5">
        {children}
      </div>
    </motion.section>
  )
}

function MiniStat({
  label,
  value,
}) {
  return (
    <div className="min-w-24 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-lg font-black text-slate-950">
        {value}
      </div>
    </div>
  )
}

function Info({
  label,
  value,
}) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
        {label}
      </div>

      <div className="mt-1.5 break-all text-sm font-bold text-slate-800">
        {value}
      </div>
    </div>
  )
}

function StatusBadge({
  status,
}) {
  const config = {
    pending: [
      'Chờ duyệt',
      'border-amber-200 bg-amber-50 text-amber-700',
    ],
    approved: [
      'Đã duyệt',
      'border-emerald-200 bg-emerald-50 text-emerald-700',
    ],
    rejected: [
      'Đã từ chối',
      'border-red-200 bg-red-50 text-red-700',
    ],
  }

  const current =
    config[status] ?? [
      status,
      'border-slate-200 bg-slate-100 text-slate-600',
    ]

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[11px] font-bold ${current[1]}`}
    >
      {current[0]}
    </span>
  )
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-40 rounded bg-white/10" />

      <div className="mt-7 h-10 w-64 rounded-xl bg-white/10" />

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_330px]">
        <div className="space-y-6">
          {[1, 2, 3].map(
            (item) => (
              <div
                key={item}
                className="h-52 rounded-3xl bg-white/10"
              />
            ),
          )}
        </div>

        <div className="h-80 rounded-3xl bg-white/10" />
      </div>
    </div>
  )
}

function AdminPage({
  children,
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
          <Link
            to="/admin/reports"
            className="flex items-center gap-3"
          >
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 font-black text-white">
              N
            </div>

            <div>
              <div className="font-bold text-slate-950">
                NoScam.vn
              </div>

              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Moderation Panel
              </div>
            </div>
          </Link>

          <Link
            to="/admin/reports"
            className="rounded-xl border border-slate-200 bg-white/5 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            Danh sách
          </Link>
        </div>
      </header>

      <main className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-blue-400/10 blur-[140px]"
        />

        <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-6">
          {children}
        </div>
      </main>
    </div>
  )
}

function statusLine(status) {
  if (status === 'approved') {
    return 'bg-emerald-500'
  }

  if (status === 'rejected') {
    return 'bg-red-500'
  }

  return 'bg-amber-400'
}

function formatMoney(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  const number = Number(value)

  if (Number.isNaN(number)) {
    return value
  }

  return `${number.toLocaleString(
    'vi-VN',
  )} đ`
}

function formatDate(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return date.toLocaleDateString(
    'vi-VN',
  )
}

function formatDateTime(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return date.toLocaleString(
    'vi-VN',
  )
}

function formatEntityType(type) {
  const labels = {
    phone: 'Số điện thoại',
    bank_account:
      'Tài khoản',
    social: 'Mạng xã hội',
    website: 'Website',
  }

  return labels[type] ?? type
}

export default AdminReportDetailPage
