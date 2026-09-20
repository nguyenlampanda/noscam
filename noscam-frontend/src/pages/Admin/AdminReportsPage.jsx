import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  Link,
  useNavigate,
} from 'react-router-dom'

import EvidenceGallery from '../../components/admin/EvidenceGallery'
import adminService from '../../services/adminService'

function AdminReportsPage() {
  const navigate = useNavigate()

  const [reports, setReports] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [
    processingId,
    setProcessingId,
  ] = useState(null)

  const loadReports =
    useCallback(async () => {
      setLoading(true)
      setError('')

      try {
        const response =
          await adminService.getReports(
            'pending',
          )

        setReports(
          response?.data?.data ?? [],
        )
      } catch (err) {
        if (err.status === 401) {
          await adminService.logout()

          navigate('/admin/login', {
            replace: true,
          })

          return
        }

        setError(
          err.message ||
            'Không thể tải danh sách báo cáo.',
        )
      } finally {
        setLoading(false)
      }
    }, [navigate])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  async function handleModerate(
    id,
    status,
  ) {
    const message =
      status === 'approved'
        ? 'Bạn chắc chắn muốn duyệt báo cáo này?'
        : 'Bạn chắc chắn muốn từ chối báo cáo này?'

    if (!window.confirm(message)) {
      return
    }

    setProcessingId(id)
    setError('')

    try {
      await adminService.updateReportStatus(
        id,
        status,
      )

      setReports((current) =>
        current.filter(
          (report) =>
            report.id !== id,
        ),
      )
    } catch (err) {
      setError(
        err.message ||
          'Không thể cập nhật báo cáo.',
      )
    } finally {
      setProcessingId(null)
    }
  }

  async function handleLogout() {
    await adminService.logout()

    navigate('/admin/login', {
      replace: true,
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-lg font-bold text-slate-950">
              NoScam.vn
            </div>

            <div className="text-xs text-slate-500">
              Moderation Panel
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-950">
            Báo cáo chờ kiểm duyệt
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Xem thông tin và bằng chứng trực tiếp trước khi duyệt.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Đang tải báo cáo...
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            Không có báo cáo đang chờ.
          </div>
        ) : (
          <div className="space-y-6">
            {reports.map((report) => (
              <article
                key={report.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-lg font-bold text-slate-950">
                        Report #{report.id}
                      </span>

                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Pending
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-slate-400">
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
                    <Link
                      to={`/admin/reports/${report.id}`}
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
                    >
                      Chi tiết
                    </Link>

                    <button
                      type="button"
                      disabled={
                        processingId ===
                        report.id
                      }
                      onClick={() =>
                        handleModerate(
                          report.id,
                          'rejected',
                        )
                      }
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50"
                    >
                      Từ chối
                    </button>

                    <button
                      type="button"
                      disabled={
                        processingId ===
                        report.id
                      }
                      onClick={() =>
                        handleModerate(
                          report.id,
                          'approved',
                        )
                      }
                      className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {processingId ===
                      report.id
                        ? 'Đang xử lý...'
                        : 'Duyệt'}
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-x-8 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
                  <Info
                    label="Loại báo cáo"
                    value={report.scam_type}
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
                    label="Thiệt hại"
                    value={
                      report.loss_amount
                    }
                  />

                  <Info
                    label="Ngày xảy ra"
                    value={
                      report.occurred_at
                    }
                  />
                </div>

                {report.description && (
                  <div className="mt-6 rounded-xl bg-slate-50 p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Nội dung
                    </div>

                    <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {report.description}
                    </div>
                  </div>
                )}

                <div className="mt-6 border-t border-slate-100 pt-6">
                  <EvidenceGallery
                    evidences={
                      report.evidences ??
                      []
                    }
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function Info({ label, value }) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  return (
    <div>
      <div className="text-xs font-medium text-slate-400">
        {label}
      </div>

      <div className="mt-1 break-all text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  )
}

export default AdminReportsPage