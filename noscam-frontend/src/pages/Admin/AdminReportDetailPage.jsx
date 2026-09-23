import {
  useEffect,
  useState,
} from 'react'

import ModerationHistory from '../../components/admin/ModerationHistory'
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import EvidenceGallery from '../../components/admin/EvidenceGallery'
import {
  removeAdminToken,
} from '../../services/adminService'
import adminService from '../../services/adminService'

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

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const response =
          await adminService.getReport(
            id,
          )

        if (!active) {
          return
        }

        setReport(
          response?.data ?? null,
        )
      } catch (err) {
        if (!active) {
          return
        }

        if (
          err.status === 401 ||
          err.status === 403
        ) {
          removeAdminToken()

          navigate(
            '/admin/login',
            {
              replace: true,
            },
          )

          return
        }

        setError(
          err.message ||
          'Không thể tải báo cáo.',
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [id, navigate])

  async function moderate(
    status,
  ) {
    const message =
      status === 'approved'
        ? report?.status ===
          'rejected'
          ? 'Bạn chắc chắn muốn duyệt lại báo cáo này?'
          : 'Bạn chắc chắn muốn duyệt báo cáo này?'
        : 'Bạn chắc chắn muốn từ chối báo cáo này?'

    if (
      !window.confirm(message)
    ) {
      return
    }

    setProcessing(true)
    setError('')

    try {
      await adminService
        .updateReportStatus(
          id,
          status,
        )

      navigate(
        '/admin/reports',
        {
          replace: true,
        },
      )
    } catch (err) {
      if (
        err.status === 401 ||
        err.status === 403
      ) {
        removeAdminToken()

        navigate(
          '/admin/login',
          {
            replace: true,
          },
        )

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
      <Page>
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Đang tải báo cáo...
        </div>
      </Page>
    )
  }

  if (!report) {
    return (
      <Page>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error ||
            'Không tìm thấy báo cáo.'}
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <div className="mb-6">
        <Link
          to="/admin/reports"
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          ← Quay lại danh sách
        </Link>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-950">
                Report #{report.id}
              </h1>

              <StatusBadge
                status={
                  report.status
                }
              />
            </div>

            <div className="mt-2 text-sm text-slate-500">
              {report.created_at
                ? new Date(
                  report.created_at,
                ).toLocaleString(
                  'vi-VN',
                )
                : ''}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {report.status !==
              'rejected' && (
                <button
                  type="button"
                  disabled={
                    processing
                  }
                  onClick={() =>
                    moderate(
                      'rejected',
                    )
                  }
                  className="rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing
                    ? 'Đang xử lý...'
                    : 'Từ chối'}
                </button>
              )}

            {report.status !==
              'approved' && (
                <button
                  type="button"
                  disabled={
                    processing
                  }
                  onClick={() =>
                    moderate(
                      'approved',
                    )
                  }
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing
                    ? 'Đang xử lý...'
                    : report.status ===
                      'rejected'
                      ? 'Duyệt lại'
                      : 'Duyệt'}
                </button>
              )}
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-x-10 gap-y-5 md:grid-cols-2 lg:grid-cols-3">
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
            value={report.website}
          />

          <Info
            label="Số tiền thiệt hại"
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

        <div className="mt-8">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Nội dung báo cáo
          </div>

          <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-5 text-sm leading-7 text-slate-800">
            {report.description ||
              'Không có nội dung.'}
          </div>
        </div>

        {report.entities?.length >
          0 && (
            <div className="mt-8">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Dữ liệu đã liên kết
              </div>

              <div className="flex flex-wrap gap-2">
                {report.entities.map(
                  (entity) => (
                    <div
                      key={
                        entity.id
                      }
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
                    >
                      <span className="font-semibold">
                        {formatEntityType(
                          entity.type,
                        )}
                      </span>

                      <span className="mx-2 text-slate-300">
                        |
                      </span>

                      <span>
                        {entity.value}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

        <div className="mt-8 border-t border-slate-100 pt-7">
          <ModerationHistory
            logs={
              report.moderation_logs ??
              []
            }
          />
          <EvidenceGallery
            evidences={
              report.evidences ??
              []
            }
          />
        </div>
      </article>
    </Page>
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
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 break-all text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  )
}

function StatusBadge({
  status,
}) {
  const styles = {
    pending:
      'bg-amber-50 text-amber-700',

    approved:
      'bg-emerald-50 text-emerald-700',

    rejected:
      'bg-red-50 text-red-700',
  }

  const labels = {
    pending:
      'Chờ duyệt',

    approved:
      'Đã duyệt',

    rejected:
      'Đã từ chối',
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status] ??
        'bg-slate-100 text-slate-600'
        }`}
    >
      {labels[status] ??
        status}
    </span>
  )
}

function formatMoney(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  const number =
    Number(value)

  if (
    Number.isNaN(number)
  ) {
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

  const date =
    new Date(value)

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

function formatEntityType(
  type,
) {
  const labels = {
    phone:
      'Số điện thoại',

    bank_account:
      'Tài khoản',

    social:
      'Mạng xã hội',

    website:
      'Website',
  }

  return labels[type] ??
    type
}

function Page({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="font-bold text-slate-950">
            NoScam.vn
          </div>

          <div className="text-xs text-slate-500">
            Moderation Panel
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </main>
    </div>
  )
}

export default AdminReportDetailPage