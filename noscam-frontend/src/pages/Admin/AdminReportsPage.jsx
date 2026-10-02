import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AnimatePresence,
  motion,
} from 'motion/react'

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import EvidenceGallery from '../../components/admin/EvidenceGallery'
import adminService from '../../services/adminService'

const tabs = [
  {
    value: 'all',
    label: 'Tất cả',
    countKey: 'total',
  },
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

const statConfig = [
  {
    key: 'total',
    label: 'Tổng báo cáo',
    tone: 'slate',
  },
  {
    key: 'pending',
    label: 'Chờ duyệt',
    tone: 'amber',
  },
  {
    key: 'approved',
    label: 'Đã duyệt',
    tone: 'emerald',
  },
  {
    key: 'rejected',
    label: 'Đã từ chối',
    tone: 'red',
  },
]

function AdminReportsPage() {
  const navigate = useNavigate()

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams()

  const rawStatus =
    searchParams.get('status')

  const status = tabs.some(
    (tab) =>
      tab.value === rawStatus,
  )
    ? rawStatus
    : 'pending'

  const search =
    searchParams.get('q')?.trim() ??
    ''

  const parsedPage = Number(
    searchParams.get('page') ?? 1,
  )

  const page =
    Number.isInteger(parsedPage) &&
    parsedPage > 0
      ? parsedPage
      : 1

  const [searchInput, setSearchInput] =
    useState(search)

  const [reports, setReports] =
    useState([])

  const [dashboard, setDashboard] =
    useState(null)

  const [pagination, setPagination] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [
    dashboardLoading,
    setDashboardLoading,
  ] = useState(true)

  const [error, setError] =
    useState('')

  const [
    processingId,
    setProcessingId,
  ] = useState(null)

  const [
    confirmation,
    setConfirmation,
  ] = useState(null)

  const handleUnauthorized =
    useCallback(async () => {
      await adminService.logout()

      navigate('/admin/login', {
        replace: true,
      })
    }, [navigate])

  const loadDashboard =
    useCallback(async () => {
      try {
        const response =
          await adminService.getDashboard()

        setDashboard(
          response?.data ?? null,
        )
      } catch (err) {
        if (
          err.status === 401 ||
          err.status === 403
        ) {
          await handleUnauthorized()
          return
        }

        console.error(
          'Dashboard error:',
          err,
        )
      } finally {
        setDashboardLoading(false)
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

        const paginator =
          response?.data ?? null

        setReports(
          paginator?.data ?? [],
        )

        setPagination(paginator)
      } catch (err) {
        if (
          err.status === 401 ||
          err.status === 403
        ) {
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
    // oxlint-disable-next-line react/set-state-in-effect
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    loadReports()
  }, [loadReports])

  function updateFilters(updates) {
    const next =
      new URLSearchParams(
        searchParams,
      )

    Object.entries(updates).forEach(
      ([key, value]) => {
        if (
          value === null ||
          value === undefined ||
          value === '' ||
          (key === 'page' &&
            Number(value) === 1)
        ) {
          next.delete(key)
        } else {
          next.set(
            key,
            String(value),
          )
        }
      },
    )

    setSearchParams(next)
  }

  function changeStatus(
    newStatus,
  ) {
    updateFilters({
      status: newStatus,
      page: null,
    })
  }

  function handleSearch(event) {
    event.preventDefault()

    updateFilters({
      q: searchInput.trim() || null,
      page: null,
    })
  }

  function clearSearch() {
    setSearchInput('')

    updateFilters({
      q: null,
      page: null,
    })
  }

  function requestModeration(
    report,
    newStatus,
  ) {
    setConfirmation({
      report,
      status: newStatus,
    })
  }

  async function confirmModeration() {
    if (!confirmation) {
      return
    }

    const {
      report,
      status: newStatus,
    } = confirmation

    setProcessingId(report.id)
    setError('')

    try {
      await adminService
        .updateReportStatus(
          report.id,
          newStatus,
        )

      setConfirmation(null)

      await Promise.all([
        loadReports(),
        loadDashboard(),
      ])
    } catch (err) {
      if (
        err.status === 401 ||
        err.status === 403
      ) {
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

    navigate('/admin/login', {
      replace: true,
    })
  }

  const counts =
    dashboard?.reports ?? {}

  const publicAlerts =
    dashboard?.entities
      ?.public_alerts ?? '—'

  const totalVisible =
    pagination?.total ??
    reports.length

  const pendingRatio =
    useMemo(() => {
      const total =
        Number(counts.total) || 0

      const pending =
        Number(counts.pending) || 0

      if (!total) {
        return 0
      }

      return Math.min(
        100,
        Math.round(
          (pending / total) * 100,
        ),
      )
    }, [
      counts.total,
      counts.pending,
    ])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
          <Link
            to="/admin/reports"
            className="group"
          >
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{
                  rotate: 8,
                  scale: 1.05,
                }}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 font-black text-white shadow-lg shadow-blue-600/20"
              >
                N
              </motion.div>

              <div>
                <div className="font-bold tracking-tight text-slate-950">
                  NoScam.vn
                </div>

                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                  Moderation Panel
                </div>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:block"
            >
              Xem website
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-blue-400/10 blur-[130px]"
        />

        <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10">
          <motion.section
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                <span className="relative flex h-2 w-2">
                  <motion.span
                    className="absolute h-full w-full rounded-full bg-blue-400"
                    animate={{
                      scale: [
                        1,
                        2.2,
                        1,
                      ],
                      opacity: [
                        0.9,
                        0,
                        0.9,
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />

                  <span className="relative h-2 w-2 rounded-full bg-blue-400" />
                </span>

                Hệ thống kiểm duyệt
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Quản lý báo cáo
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Xem xét dữ liệu do
                người dùng gửi trước
                khi thông tin được
                đưa vào hệ thống cảnh
                báo.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-end justify-between gap-8">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Đang chờ xử lý
                  </div>

                  <div className="mt-1 text-2xl font-black text-slate-950">
                    {dashboardLoading
                      ? '—'
                      : counts.pending ??
                        0}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-500">
                    Tỷ lệ hàng chờ
                  </div>

                  <div className="mt-1 font-bold text-amber-400">
                    {pendingRatio}%
                  </div>
                </div>
              </div>

              <div className="mt-3 h-1.5 w-56 max-w-full overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className="h-full rounded-full bg-amber-400"
                  initial={{
                    width: 0,
                  }}
                  animate={{
                    width: `${pendingRatio}%`,
                  }}
                  transition={{
                    duration: 0.7,
                  }}
                />
              </div>
            </div>
          </motion.section>

          <motion.section
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: {
                  staggerChildren:
                    0.06,
                },
              },
            }}
            className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          >
            {statConfig.map(
              (item) => (
                <StatCard
                  key={item.key}
                  label={item.label}
                  value={
                    dashboardLoading
                      ? '—'
                      : counts[
                          item.key
                        ] ?? 0
                  }
                  tone={item.tone}
                  active={
                    item.key ===
                    'total'
                      ? status === 'all'
                      : status ===
                        item.key
                  }
                  onClick={() =>
                    changeStatus(
                      item.key ===
                        'total'
                        ? 'all'
                        : item.key,
                    )
                  }
                />
              ),
            )}

            <Link
              to="/alerts"
              className="block"
            >
              <StatCard
                label="Cảnh báo công khai"
                value={
                  dashboardLoading
                    ? '—'
                    : publicAlerts
                }
                tone="blue"
                hint="Xem danh sách →"
              />
            </Link>
          </motion.section>

          <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-black/20">
            <div className="border-b border-slate-200 bg-slate-50/80">
              <div className="flex overflow-x-auto px-2 sm:px-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() =>
                      changeStatus(
                        tab.value,
                      )
                    }
                    className={`relative shrink-0 px-4 py-4 text-sm font-semibold transition ${
                      status ===
                      tab.value
                        ? 'text-blue-700'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <span className="relative z-10">
                      {tab.label}

                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${
                          status ===
                          tab.value
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-200/70 text-slate-600'
                        }`}
                      >
                        {counts[
                          tab.countKey
                        ] ?? 0}
                      </span>
                    </span>

                    {status ===
                      tab.value && (
                      <motion.span
                        layoutId="admin-active-tab"
                        className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-blue-600"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <form
                onSubmit={
                  handleSearch
                }
                className="flex flex-col gap-3 lg:flex-row"
              >
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    ⌕
                  </span>

                  <input
                    value={
                      searchInput
                    }
                    onChange={(
                      event,
                    ) =>
                      setSearchInput(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Tìm ID, SĐT, STK, ngân hàng, website, social..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  Tìm kiếm
                </button>

                {search && (
                  <button
                    type="button"
                    onClick={
                      clearSearch
                    }
                    className="rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Xóa lọc
                  </button>
                )}
              </form>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="text-xs text-slate-500">
                  {loading
                    ? 'Đang đồng bộ dữ liệu...'
                    : `${totalVisible} báo cáo trong bộ lọc hiện tại`}
                </div>

                {search && (
                  <div className="max-w-full truncate rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    Từ khóa: “
                    {search}”
                  </div>
                )}
              </div>
            </div>
          </section>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: -8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                }}
                className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6">
            {loading ? (
              <ReportSkeleton />
            ) : reports.length ===
              0 ? (
              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.98,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm"
              >
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-xl text-slate-500">
                  ⌕
                </div>

                <div className="mt-4 font-bold text-slate-950">
                  Không tìm thấy báo
                  cáo
                </div>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Không có dữ liệu phù
                  hợp với trạng thái và
                  từ khóa hiện tại.
                </p>

                {search && (
                  <button
                    type="button"
                    onClick={
                      clearSearch
                    }
                    className="mt-4 text-sm font-bold text-blue-400"
                  >
                    Xóa tìm kiếm
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: {
                    transition: {
                      staggerChildren:
                        0.05,
                    },
                  },
                }}
                className="space-y-4"
              >
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
                        requestModeration
                      }
                    />
                  ),
                )}
              </motion.div>
            )}
          </div>

          <Pagination
            pagination={
              pagination
            }
            page={page}
            loading={loading}
            onPage={(nextPage) =>
              updateFilters({
                page:
                  nextPage === 1
                    ? null
                    : nextPage,
              })
            }
          />
        </div>
      </main>

      <AnimatePresence>
        {confirmation && (
          <ModerationDialog
            confirmation={
              confirmation
            }
            processing={
              processingId !==
              null
            }
            onCancel={() =>
              setConfirmation(null)
            }
            onConfirm={
              confirmModeration
            }
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
  active = false,
  onClick,
  hint = '',
}) {
  const toneStyles = {
    slate:
      'from-slate-50 to-white text-slate-950',
    amber:
      'from-amber-50 to-white text-amber-700',
    emerald:
      'from-emerald-50 to-white text-emerald-700',
    red:
      'from-red-50 to-white text-red-700',
    blue:
      'from-blue-50 to-white text-blue-700',
  }

  const Component =
    onClick ? motion.button : motion.div

  return (
    <Component
      type={
        onClick
          ? 'button'
          : undefined
      }
      onClick={onClick}
      variants={{
        hidden: {
          opacity: 0,
          y: 18,
        },
        show: {
          opacity: 1,
          y: 0,
        },
      }}
      whileHover={{
        y: -3,
      }}
      className={`relative overflow-hidden rounded-2xl border p-5 text-left ${
        active
          ? 'border-blue-300 bg-blue-50'
          : 'border-slate-200 bg-white shadow-sm'
      } ${
        onClick
          ? 'cursor-pointer'
          : ''
      }`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${
          toneStyles[tone] ??
          toneStyles.slate
        } opacity-40`}
      />

      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </div>

        <div
          className={`mt-3 text-3xl font-black tracking-[-0.05em] ${
            toneStyles[tone]
              ?.split(' ')
              .at(-1) ??
            'text-slate-950'
          }`}
        >
          {value}
        </div>

        {hint && (
          <div className="mt-3 text-xs font-bold text-blue-400">
            {hint}
          </div>
        )}
      </div>
    </Component>
  )
}

function ReportCard({
  report,
  processing,
  onModerate,
}) {
  const signals = [
    report.phone && {
      label: 'SĐT',
      value: report.phone,
    },
    report.bank_account && {
      label: 'STK',
      value:
        report.bank_account,
    },
    report.website && {
      label: 'Website',
      value: report.website,
    },
    report.social && {
      label: 'Social',
      value: report.social,
    },
  ].filter(Boolean)

  return (
    <motion.article
      variants={{
        hidden: {
          opacity: 0,
          y: 18,
        },
        show: {
          opacity: 1,
          y: 0,
        },
      }}
      whileHover={{
        y: -2,
      }}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-black/10"
    >
      <div
        className={`h-1 ${
          report.status ===
          'approved'
            ? 'bg-emerald-500'
            : report.status ===
                'rejected'
              ? 'bg-red-500'
              : 'bg-amber-400'
        }`}
      />

      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={`/admin/reports/${report.id}`}
                className="text-lg font-black tracking-tight text-slate-950 transition hover:text-blue-700"
              >
                Report #
                {report.id}
              </Link>

              <StatusBadge
                status={
                  report.status
                }
              />

              {report.evidences
                ?.length > 0 && (
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700">
                  {
                    report
                      .evidences
                      .length
                  }{' '}
                  bằng chứng
                </span>
              )}
            </div>

            <div className="mt-2 text-xs font-medium text-slate-500">
              Gửi lúc{' '}
              {formatDateTime(
                report.created_at,
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to={`/admin/reports/${report.id}`}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              Xem chi tiết
            </Link>

            {report.status !==
              'rejected' && (
              <button
                type="button"
                disabled={
                  processing
                }
                onClick={() =>
                  onModerate(
                    report,
                    'rejected',
                  )
                }
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Từ chối
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
                  onModerate(
                    report,
                    'approved',
                  )
                }
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {report.status ===
                'rejected'
                  ? 'Duyệt lại'
                  : 'Duyệt'}
              </button>
            )}
          </div>
        </div>

        {signals.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {signals.map(
              (signal) => (
                <div
                  key={`${signal.label}-${signal.value}`}
                  className="max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <span className="mr-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {signal.label}
                  </span>

                  <span className="break-all text-xs font-bold text-slate-700">
                    {signal.value}
                  </span>
                </div>
              ),
            )}
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info
            label="Loại"
            value={
              report.scam_type
            }
          />

          <Info
            label="Ngân hàng"
            value={report.bank}
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
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm leading-6 text-slate-700">
            {report.description}
          </div>
        )}

        {report.evidences
          ?.length > 0 && (
          <div className="mt-5 border-t border-slate-100 pt-5">
            <EvidenceGallery
              evidences={
                report.evidences
              }
            />
          </div>
        )}
      </div>
    </motion.article>
  )
}

function ModerationDialog({
  confirmation,
  processing,
  onCancel,
  onConfirm,
}) {
  const approving =
    confirmation.status ===
    'approved'

  const report =
    confirmation.report

  return (
    <motion.div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
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
          y: 18,
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

        <div className="p-6 sm:p-7">
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

          <h2 className="mt-5 text-xl font-black tracking-tight text-slate-950">
            {approving
              ? report.status ===
                'rejected'
                ? 'Duyệt lại báo cáo?'
                : 'Duyệt báo cáo?'
              : 'Từ chối báo cáo?'}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Report #{report.id}
            {approving
              ? ' sẽ được đưa vào dữ liệu cảnh báo và Risk Score có thể được tính lại.'
              : ' sẽ không đóng góp vào dữ liệu cảnh báo công khai.'}
          </p>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Nội dung
            </div>

            <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-700">
              {report.description ||
                'Không có mô tả.'}
            </p>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              disabled={processing}
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="button"
              disabled={processing}
              onClick={onConfirm}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                approving
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {processing
                ? 'Đang xử lý...'
                : approving
                  ? 'Xác nhận duyệt'
                  : 'Xác nhận từ chối'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(
        (item) => (
          <div
            key={item}
            className="overflow-hidden rounded-3xl bg-white"
          >
            <div className="h-1 animate-pulse bg-slate-200" />

            <div className="p-6">
              <div className="animate-pulse">
                <div className="h-5 w-40 rounded bg-slate-200" />

                <div className="mt-3 h-3 w-28 rounded bg-slate-100" />

                <div className="mt-7 grid gap-3 sm:grid-cols-4">
                  {[1, 2, 3, 4].map(
                    (cell) => (
                      <div
                        key={cell}
                        className="h-14 rounded-xl bg-slate-100"
                      />
                    ),
                  )}
                </div>

                <div className="mt-5 h-20 rounded-2xl bg-slate-100" />
              </div>
            </div>
          </div>
        ),
      )}
    </div>
  )
}

function Pagination({
  pagination,
  page,
  loading,
  onPage,
}) {
  if (
    !pagination ||
    pagination.last_page <= 1
  ) {
    return null
  }

  const lastPage =
    pagination.last_page

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        disabled={
          loading || page <= 1
        }
        onClick={() =>
          onPage(
            Math.max(
              1,
              page - 1,
            ),
          )
        }
        className="rounded-xl border border-slate-200 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-30"
      >
        ← Trước
      </button>

      <div className="rounded-xl border border-slate-200 bg-white/5 px-4 py-2.5 text-sm text-slate-500">
        Trang{' '}
        <strong className="text-slate-950">
          {page}
        </strong>{' '}
        /{' '}
        <strong className="text-slate-950">
          {lastPage}
        </strong>
      </div>

      <button
        type="button"
        disabled={
          loading ||
          page >= lastPage
        }
        onClick={() =>
          onPage(
            Math.min(
              lastPage,
              page + 1,
            ),
          )
        }
        className="rounded-xl border border-slate-200 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-30"
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
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>

      <div className="mt-1 break-all text-sm font-bold text-slate-800">
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

export default AdminReportsPage
