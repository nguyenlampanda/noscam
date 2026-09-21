import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'

import EvidenceGallery
  from '../../components/admin/EvidenceGallery'

import adminService
  from '../../services/adminService'

const tabs = [
  {
    value: 'pending',
    label: 'Chờ duyệt',
    countKey: 'pending',
  },
  {
    value: 'approved',
    label: 'Đã duyệt',
    countKey: 'approved',
  },
  {
    value: 'rejected',
    label: 'Đã từ chối',
    countKey: 'rejected',
  },
]

function AdminReportsPage() {
  const navigate = useNavigate()

  const [status, setStatus] =
    useState('pending')

  const [reports, setReports] =
    useState([])

  const [dashboard, setDashboard] =
    useState(null)

  const [pagination, setPagination] =
    useState(null)

  const [searchInput, setSearchInput] =
    useState('')

  const [search, setSearch] =
    useState('')

  const [page, setPage] =
    useState(1)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [
    processingId,
    setProcessingId,
  ] = useState(null)

  const handleUnauthorized =
    useCallback(async () => {
      await adminService.logout()

      navigate(
        '/admin/login',
        {
          replace: true,
        },
      )
    }, [navigate])

  const loadDashboard =
    useCallback(async () => {
      try {
        const response =
          await adminService.getDashboard()

        /*
         * apiClient.js đã return JSON trực tiếp.
         *
         * Backend:
         * {
         *   data: {
         *     reports: {...},
         *     entities: {...}
         *   }
         * }
         *
         * Vì vậy chỉ lấy response.data.
         */
        setDashboard(
          response?.data ?? null,
        )
      } catch (err) {
        if (err.status === 401) {
          await handleUnauthorized()
          return
        }

        console.error(
          'Dashboard error:',
          err,
        )
      }
    }, [handleUnauthorized])

  const loadReports =
    useCallback(async () => {
      setLoading(true)
      setError('')

      try {
        const response =
          await adminService.getReports(
            status,
            search,
            page,
          )

        /*
         * Backend:
         *
         * {
         *   data: {
         *     current_page: 1,
         *     data: [...reports],
         *     last_page: 1,
         *     ...
         *   }
         * }
         *
         * apiClient return JSON trực tiếp,
         * nên paginator = response.data.
         */
        const paginator =
          response?.data ?? null

        setReports(
          paginator?.data ?? [],
        )

        setPagination(
          paginator,
        )
      } catch (err) {
        if (err.status === 401) {
          await handleUnauthorized()
          return
        }

        setReports([])
        setPagination(null)

        setError(
          err.message ||
            'Không thể tải danh sách báo cáo.',
        )
      } finally {
        setLoading(false)
      }
    }, [
      status,
      search,
      page,
      handleUnauthorized,
    ])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  function changeStatus(
    newStatus,
  ) {
    setStatus(newStatus)
    setPage(1)
  }

  function handleSearch(event) {
    event.preventDefault()

    setSearch(
      searchInput.trim(),
    )

    setPage(1)
  }

  function clearSearch() {
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  async function handleModerate(
    id,
    newStatus,
  ) {
    const message =
      newStatus === 'approved'
        ? 'Bạn chắc chắn muốn duyệt báo cáo này?'
        : 'Bạn chắc chắn muốn từ chối báo cáo này?'

    if (!window.confirm(message)) {
      return
    }

    setProcessingId(id)
    setError('')

    try {
      await adminService
        .updateReportStatus(
          id,
          newStatus,
        )

      await Promise.all([
        loadReports(),
        loadDashboard(),
      ])
    } catch (err) {
      if (err.status === 401) {
        await handleUnauthorized()
        return
      }

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

    navigate(
      '/admin/login',
      {
        replace: true,
      },
    )
  }

  const counts =
    dashboard?.reports ?? {}

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
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Quản lý báo cáo
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Kiểm duyệt dữ liệu cảnh báo của NoScam.vn
          </p>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Tổng báo cáo"
            value={
              counts.total ?? '—'
            }
          />

          <StatCard
            label="Chờ duyệt"
            value={
              counts.pending ?? '—'
            }
          />

          <StatCard
            label="Đã duyệt"
            value={
              counts.approved ?? '—'
            }
          />

          <StatCard
            label="Đã từ chối"
            value={
              counts.rejected ?? '—'
            }
          />

          <StatCard
            label="Cảnh báo công khai"
            value={
              dashboard?.entities
                ?.public_alerts ??
              '—'
            }
          />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap border-b border-slate-200 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() =>
                  changeStatus(
                    tab.value,
                  )
                }
                className={`border-b-2 px-4 py-4 text-sm font-semibold transition ${
                  status === tab.value
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}

                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {counts[
                    tab.countKey
                  ] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 p-4 sm:flex-row"
          >
            <input
              value={searchInput}
              onChange={(event) =>
                setSearchInput(
                  event.target.value,
                )
              }
              placeholder="Tìm ID, SĐT, STK, ngân hàng, website, social..."
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Tìm kiếm
            </button>

            {search && (
              <button
                type="button"
                onClick={
                  clearSearch
                }
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Xóa lọc
              </button>
            )}
          </form>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              Đang tải...
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <div className="font-semibold text-slate-800">
                Không tìm thấy báo cáo.
              </div>

              {search && (
                <button
                  type="button"
                  onClick={
                    clearSearch
                  }
                  className="mt-3 text-sm font-semibold text-blue-600"
                >
                  Xóa tìm kiếm
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {reports.map(
                (report) => (
                  <ReportCard
                    key={
                      report.id
                    }
                    report={
                      report
                    }
                    processing={
                      processingId ===
                      report.id
                    }
                    onModerate={
                      handleModerate
                    }
                  />
                ),
              )}
            </div>
          )}
        </div>

        <Pagination
          pagination={pagination}
          page={page}
          setPage={setPage}
          loading={loading}
        />
      </main>
    </div>
  )
}

function StatCard({
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-2 text-2xl font-bold text-slate-950">
        {value}
      </div>
    </div>
  )
}

function ReportCard({
  report,
  processing,
  onModerate,
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-lg font-bold text-slate-950">
              Report #{report.id}
            </div>

            <StatusBadge
              status={
                report.status
              }
            />
          </div>

          <div className="mt-2 text-xs text-slate-400">
            {formatDateTime(
              report.created_at,
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to={`/admin/reports/${report.id}`}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Chi tiết
          </Link>

          {report.status !==
            'rejected' && (
            <button
              type="button"
              disabled={processing}
              onClick={() =>
                onModerate(
                  report.id,
                  'rejected',
                )
              }
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
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
              disabled={processing}
              onClick={() =>
                onModerate(
                  report.id,
                  'approved',
                )
              }
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
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

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Info
          label="Loại"
          value={
            report.scam_type
          }
        />

        <Info
          label="SĐT"
          value={
            report.phone
          }
        />

        <Info
          label="STK"
          value={
            report.bank_account
          }
        />

        <Info
          label="Ngân hàng"
          value={
            report.bank
          }
        />

        <Info
          label="Social"
          value={
            report.social
          }
        />

        <Info
          label="Website"
          value={
            report.website
          }
        />

        <Info
          label="Thiệt hại"
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

      {report.description && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          {report.description}
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
  )
}

function Pagination({
  pagination,
  page,
  setPage,
  loading,
}) {
  if (
    !pagination ||
    pagination.last_page <= 1
  ) {
    return null
  }

  return (
    <div className="mt-8 flex items-center justify-center gap-4">
      <button
        type="button"
        disabled={
          loading || page <= 1
        }
        onClick={() =>
          setPage(
            (current) =>
              Math.max(
                1,
                current - 1,
              ),
          )
        }
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
      >
        ← Trước
      </button>

      <div className="text-sm text-slate-600">
        Trang{' '}
        <strong>{page}</strong>
        {' / '}
        <strong>
          {pagination.last_page}
        </strong>
      </div>

      <button
        type="button"
        disabled={
          loading ||
          page >=
            pagination.last_page
        }
        onClick={() =>
          setPage(
            (current) =>
              current + 1,
          )
        }
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
      >
        Sau →
      </button>
    </div>
  )
}

function StatusBadge({
  status,
}) {
  const config = {
    pending: [
      'Chờ duyệt',
      'bg-amber-50 text-amber-700',
    ],

    approved: [
      'Đã duyệt',
      'bg-emerald-50 text-emerald-700',
    ],

    rejected: [
      'Đã từ chối',
      'bg-red-50 text-red-700',
    ],
  }

  const current =
    config[status] ?? [
      status,
      'bg-slate-100 text-slate-600',
    ]

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${current[1]}`}
    >
      {current[0]}
    </span>
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
      <div className="text-xs font-medium text-slate-400">
        {label}
      </div>

      <div className="mt-1 break-all text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
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

function formatDateTime(value) {
  if (!value) {
    return ''
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

  return date.toLocaleString(
    'vi-VN',
  )
}

export default AdminReportsPage