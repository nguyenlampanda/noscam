import './SearchRadar.css'
import './SearchPage.polish.css'
import AlertEvidenceGallery from '../../components/risk/AlertEvidenceGallery'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  Link,
  useSearchParams,
} from 'react-router-dom'

import Container
  from '../../components/layout/Container'

import SearchBar
  from '../../components/search/SearchBar'

import SearchSummary
  from '../../components/search/SearchSummary'

import RelatedInformation
  from '../../components/search/RelatedInformation'


import RiskFactors
  from '../../components/risk/RiskFactors'

import LoadingState
  from '../../components/common/LoadingState'

import ErrorState
  from '../../components/common/ErrorState'

import EmptyState
  from '../../components/common/EmptyState'

import CommunityFeedback
  from '../../components/search/CommunityFeedback'

import MediatorLookup
  from '../../components/mediators/MediatorLookup'


import { useSearch }
  from '../../hooks/useSearch'

import { getAlerts } from '../../services/alertsService'

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 22,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [
        0.16,
        1,
        0.3,
        1,
      ],
    },
  },
}

function SearchPage() {
  const [searchParams] =
    useSearchParams()

  const query =
    searchParams
      .get('q')
      ?.trim() || ''

  const {
    data: result,
    meta,
    message,
    status,
    error,
    search,
  } = useSearch()

  useEffect(() => {
    if (query) {
      search(query)
    }
  }, [query, search])

  useEffect(() => {
    if (!query) return

    try {
      const previous = readSearchHistory()
      const next = [
        query,
        ...previous.filter((item) => item !== query),
      ].slice(0, 8)

      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next))
    } catch {
      // Trình duyệt có thể chặn localStorage.
    }
  }, [query])

  const handleRetry = () => {
    if (query) {
      search(query)
    }
  }

  if (!query) {
    return (
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div
          aria-hidden="true"
          className="noscam-grid absolute inset-0 opacity-50"
        />

        <Container>
          <motion.div
            initial={{
              opacity: 0,
              y: 25,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="relative mx-auto max-w-3xl"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              NOSCAM CHECK
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">
              Kiểm tra thông tin
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
              Nhập số điện thoại,
              số tài khoản, website
              hoặc tài khoản mạng xã
              hội bạn muốn kiểm tra.
            </p>

            <div className="mt-8">
              <SearchBar />
            </div>
          </motion.div>
          <SearchDiscovery />
        </Container>
      </section>
    )
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50/70 py-9 sm:py-12">
        <div
          aria-hidden="true"
          className="noscam-grid absolute inset-0 opacity-40"
        />

        <motion.div
          aria-hidden="true"
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-100/50 blur-3xl"
          animate={{
            scale: [
              1,
              1.15,
              1,
            ],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
          }}
        />

        <Container>
          <motion.div
            initial={{
              opacity: 0,
              y: 18,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="relative mx-auto max-w-5xl"
          >
            <div className="flex items-center gap-2">
              <motion.span
                className="h-2 w-2 rounded-full bg-blue-600"
                animate={{
                  opacity: [
                    0.4,
                    1,
                    0.4,
                  ],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
              />

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                Kết quả tra cứu
              </p>
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">
              Đánh giá thông tin
              trước khi giao dịch
            </h1>

            <div className="mt-7">
              <SearchBar
                initialValue={query}
              />
            </div>
          </motion.div>
        </Container>
      </section>

      <section className="bg-white py-8 sm:py-16">
        <Container>
          <div className="mx-auto max-w-5xl">
            {status ===
              'loading' && (
              <LoadingState />
            )}

            {status ===
              'error' && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
              >
                <ErrorState
                  title="Không thể kiểm tra thông tin"
                  description={
                    error ||
                    'NoScam chưa thể kết nối tới hệ thống dữ liệu. Vui lòng thử lại.'
                  }
                  onRetry={
                    handleRetry
                  }
                />
              </motion.div>
            )}

            {status ===
              'empty' && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
              >
                <DetectedSearch query={query} meta={meta} hasApprovedReports={false} />

                <MediatorLookup
                  query={query}
                />

                <EmptyState
                  query={query}
                />

                <CommunityFeedback
                  type={
                    meta?.detectedType ||
                    'generic'
                  }
                  value={
                    meta?.normalizedQuery ||
                    query
                  }
                />

                <motion.div
                  initial={{
                    opacity: 0,
                    y: 12,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: 0.12,
                  }}
                  className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-5 sm:p-6"
                >
                  <p className="text-sm font-semibold text-slate-950">
                    {message ||
                      'Chưa ghi nhận dữ liệu cảnh báo cho thông tin này.'}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Điều này không đồng nghĩa thông tin trên chắc chắn an toàn.
                    Hãy tiếp tục kiểm tra trước khi chuyển tiền hoặc cung cấp
                    thông tin cá nhân.
                  </p>

                  <Link
                    to="/report"
                    className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Gửi báo cáo nếu bạn có thêm thông tin →
                  </Link>
                </motion.div>

              </motion.div>
            )}

            {status ===
              'success' &&
              result && (
                <motion.div
                  variants={
                    containerVariants
                  }
                  initial="hidden"
                  animate="visible"
                >
                  <DetectedSearch query={query} meta={meta} hasApprovedReports={Number(result.reports ?? 0) > 0} reportCount={result.reports} />

                  <MediatorLookup
                    query={query}
                  />

                  <motion.div
                    variants={
                      itemVariants
                    }
                    className="grid gap-4 sm:gap-6 lg:grid-cols-[0.8fr_1.2fr]"
                  >
                    <section className="flex flex-col justify-center rounded-3xl border border-red-200 bg-red-50 p-6 sm:p-8">
                      <p className="text-xs font-bold uppercase tracking-widest text-red-600">
                        NOSCAM.VN · CẢNH BÁO
                      </p>
                      <h2 className="mt-4 text-4xl font-black tracking-tight text-red-700">
                        SCAM
                      </h2>
                      <p className="mt-3 text-base font-bold text-red-900">
                        Có báo cáo lừa đảo đã được duyệt
                      </p>
                      <p className="mt-3 text-sm leading-6 text-red-800">
                        Hệ thống ghi nhận {result.reports} báo cáo đã được kiểm duyệt liên quan đến thông tin này.
                      </p>
                      <p className="mt-4 text-xs leading-5 text-red-700">
                        Đây là cảnh báo từ dữ liệu báo cáo, không phải kết luận pháp lý về cá nhân hoặc tổ chức.
                      </p>
                    </section>

                    <SearchSummary
                      query={query}
                      result={result}
                    />
                  </motion.div>

                  {/* NOSCAM_SEARCH_EVIDENCE_GALLERY_V1 */}
                  {result.publicImages?.length > 0 && (
                    <motion.section
                      variants={itemVariants}
                      className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:mt-6 sm:p-6"
                    >
                      <h2 className="text-lg font-bold text-slate-950">
                        Ảnh bằng chứng
                      </h2>
                      <p className="mt-1 mb-5 text-sm text-slate-500">
                        Hình ảnh từ báo cáo đã duyệt và được công khai trên NoScam.vn.
                      </p>
                      <div className="flex justify-start">
                        <AlertEvidenceGallery
                          images={result.publicImages}
                        />
                      </div>
                    </motion.section>
                  )}

                  <motion.div
                    variants={
                      itemVariants
                    }
                    className="mt-4 sm:mt-6"
                  >
                    <RiskFactors
                      factors={
                        result.riskFactors
                      }
                    />
                  </motion.div>

                  <motion.div
                    variants={
                      itemVariants
                    }
                    className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-2"
                  >
                    <RelatedInformation
                      items={
                        result.relatedInformation
                      }
                    />

                    <DataSources
                      sources={
                        result.sources
                      }
                    />
                  </motion.div>

                  <motion.div
                    variants={
                      itemVariants
                    }
                    className="mt-4 overflow-hidden rounded-3xl border border-amber-200 bg-amber-50/60 p-5 sm:mt-6 sm:p-6"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        !
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          Lưu ý về kết quả
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {
                            result.disclaimer
                          }
                        </p>

                        <p className="mt-3 text-xs leading-5 text-slate-500">
                          Hãy đối chiếu nội dung báo cáo,
                          thông tin người nhận và các nguồn
                          đáng tin cậy khác trước khi giao dịch.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
          </div>
        </Container>
      </section>
    </>
  )
}

// NOSCAM_SEARCH_RADAR_V1
function DetectedSearch({ query, meta, hasApprovedReports = false, reportCount = 0 }) {
  const isAlert = hasApprovedReports
  const count = Number(reportCount) || 0
  const displayQuery = meta?.normalizedQuery || query || '—'

  return (
    <section
      aria-label={isAlert ? 'Radar cảnh báo báo cáo' : 'Radar kiểm tra thông tin'}
      className={`noscam-radar ${isAlert ? 'noscam-radar--alert' : 'noscam-radar--clear'}`}
    >
      <div className="noscam-radar__visual" aria-hidden="true">
        <div className="noscam-radar__screen">
          <div className="noscam-radar__ring noscam-radar__ring--one" />
          <div className="noscam-radar__ring noscam-radar__ring--two" />
          <div className="noscam-radar__ring noscam-radar__ring--three" />
          <div className="noscam-radar__crosshair noscam-radar__crosshair--horizontal" />
          <div className="noscam-radar__crosshair noscam-radar__crosshair--vertical" />
          <div className="noscam-radar__sweep" />
          <div className="noscam-radar__pulse" />
          <div className="noscam-radar__target" />
        </div>
      </div>

      <div className="noscam-radar__content">
        <div className="noscam-radar__eyebrow">
          <span className="noscam-radar__indicator" />
          {isAlert ? 'HỆ THỐNG PHÁT HIỆN CẢNH BÁO' : 'HỆ THỐNG ĐANG GIÁM SÁT'}
        </div>

        <h2 className="noscam-radar__title">
          {isAlert ? 'Phát hiện báo cáo lừa đảo' : 'Chưa ghi nhận cảnh báo'}
        </h2>

        <p className="noscam-radar__description">
          {isAlert
            ? `Hệ thống ghi nhận ${count} báo cáo đã được duyệt liên quan đến thông tin đang tra cứu.`
            : 'Hiện chưa tìm thấy báo cáo đã duyệt liên quan đến thông tin này. Điều này không đồng nghĩa thông tin chắc chắn an toàn.'}
        </p>

        <div className="noscam-radar__query">
          <span>Đang tra cứu</span>
          <strong>{displayQuery}</strong>
        </div>
      </div>

      <div className="noscam-radar__status">
        <span className="noscam-radar__status-dot" />
        {isAlert ? 'CẢNH BÁO' : 'CHƯA CÓ BÁO CÁO'}
      </div>
    </section>
  )
}


function DataSources({
  sources = [],
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: 0.25,
      }}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
          <motion.div
            className="h-2.5 w-2.5 rounded-full bg-slate-600"
            animate={{
              scale: [
                1,
                1.4,
                1,
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Nguồn dữ liệu
          </h2>

          <p className="text-xs text-slate-400">
            Dữ liệu dùng để đánh giá
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-500">
        Các nhóm dữ liệu được sử
        dụng để tổng hợp kết quả
        cảnh báo.
      </p>

      {sources.length > 0 ? (
        <div className="mt-5 space-y-2.5">
          {sources.map(
            (source, index) => (
              <motion.div
                key={source}
                initial={{
                  opacity: 0,
                  x: 12,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  delay:
                    0.35 +
                    index * 0.08,
                }}
                whileHover={{
                  x: 4,
                }}
                className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />

                {source}
              </motion.div>
            ),
          )}
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-400">
          Chưa có thông tin nguồn
          dữ liệu.
        </p>
      )}

      <div className="mt-6 border-t border-slate-200 pt-5">
        <p className="text-sm font-semibold text-slate-950">
          Bạn có thêm thông tin?
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Nếu bạn từng giao dịch
          hoặc có bằng chứng liên
          quan, bạn có thể gửi báo
          cáo để bổ sung dữ liệu.
        </p>

        <motion.div
          whileHover={{
            x: 4,
          }}
          className="mt-4 inline-flex"
        >
          <Link
            to="/report"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Gửi báo cáo →
          </Link>
        </motion.div>
      </div>
    </motion.div>
  )
}


// NOSCAM_SEARCH_DYNAMIC_V1
const SEARCH_HISTORY_KEY = 'noscam_search_history_v1'

function readSearchHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]')
    return Array.isArray(data) ? data.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function SearchDiscovery() {
  const [history, setHistory] = useState(readSearchHistory)
  // NOSCAM_HISTORY_CONFIRM_V1
  const [confirmClearHistory, setConfirmClearHistory] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const response = await getAlerts({
          page: 1,
          perPage: 6,
        })

        if (active) {
          setAlerts(Array.isArray(response?.alerts) ? response.alerts : [])
        }
      } catch {
        if (active) {
          setError('Chưa thể tải cảnh báo mới nhất.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [])

  const types = [
    ['Số điện thoại', 'Tra cứu số điện thoại có dấu hiệu đáng ngờ.'],
    ['Tài khoản ngân hàng', 'Kiểm tra thông tin tài khoản trước khi chuyển tiền.'],
    ['Website', 'Tra cứu tên miền và website cần xác minh.'],
    ['Mạng xã hội', 'Kiểm tra thông tin Facebook, TikTok và các tài khoản liên quan.'],
  ]

  return (
    <div className="noscam-search-premium mx-auto mt-12 max-w-6xl space-y-10 pb-6">
      <section>
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
            TRA CỨU THÔNG MINH
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Bạn muốn kiểm tra thông tin gì?
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Chọn loại thông tin phù hợp và nhập dữ liệu vào ô tìm kiếm phía trên.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {types.map(([title, description], index) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-600">
                {String(index + 1).padStart(2, '0')}
              </div>
              <h3 className="font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {history.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-950">
              Tra cứu gần đây
            </h2>
            <button
              type="button"
              onClick={() => setConfirmClearHistory(true)}
              className="text-sm font-semibold text-slate-500 hover:text-red-600"
            >
              Xóa lịch sử
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {history.map((item) => (
              <Link
                key={item}
                to={`/search?q=${encodeURIComponent(item)}`}
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="inline-flex max-w-full cursor-pointer items-center break-all rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {item} ↗
              </Link>
            ))}
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Lịch sử chỉ được lưu trên trình duyệt này.
          </p>
        </section>
      )}


      {confirmClearHistory && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setConfirmClearHistory(false)
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="noscam-clear-history-title"
            aria-describedby="noscam-clear-history-description"
            className="w-full max-w-md rounded-[26px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <span className="text-2xl" aria-hidden="true">×</span>
            </div>
            <h2
              id="noscam-clear-history-title"
              className="text-xl font-extrabold text-slate-950"
            >
              Xóa lịch sử tra cứu?
            </h2>
            <p
              id="noscam-clear-history-description"
              className="mt-3 text-sm leading-6 text-slate-600"
            >
              Bạn có chắc chắn muốn xóa toàn bộ lịch sử tra cứu
              đã lưu trên trình duyệt này? Thao tác không thể hoàn tác.
            </p>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmClearHistory(false)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(SEARCH_HISTORY_KEY)
                    setHistory([])
                    setConfirmClearHistory(false)
                  } catch (error) {
                    console.error('Không thể xóa lịch sử:', error)
                  }
                }}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Xóa lịch sử
              </button>
            </div>
          </div>
        </div>
      )}

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              DỮ LIỆU CẢNH BÁO
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Cảnh báo lừa đảo mới nhất
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Thông tin được lấy từ hệ thống cảnh báo NoScam.vn.
            </p>
          </div>
          <Link to="/alerts" className="text-sm font-bold text-blue-600 hover:text-blue-700">
            Xem tất cả →
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            {error}
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Hiện chưa có cảnh báo để hiển thị.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {alerts.map((alert, index) => {
              const value = String(alert.value || '').trim()
              const type = String(
                alert.type ||
                alert.entity_type ||
                'Thông tin cảnh báo'
              )

              const reports = Number(alert.reports || 0)
              const images = Array.isArray(alert.public_images)
                ? alert.public_images
                : []

              const searchUrl = value
                ? `/search?q=${encodeURIComponent(value)}`
                : '/alerts'

              const date = alert.last_report_at
                ? new Date(alert.last_report_at)
                : null

              const formattedDate =
                date && !Number.isNaN(date.getTime())
                  ? date.toLocaleDateString('vi-VN')
                  : alert.time || 'Chưa cập nhật'

              return (
                <Link
                  key={alert.id ?? index}
                  to={searchUrl}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl relative block cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                      Cảnh báo đã duyệt
                    </span>

                    <span className="text-xs text-slate-400">
                      {formattedDate}
                    </span>
                  </div>

                  <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {type}
                  </p>

                  <span className="mt-2 break-all text-lg font-extrabold text-slate-950 transition-colors hover:text-blue-600">
                    {value || 'Xem thông tin cảnh báo'}
                  </span>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                      {reports} báo cáo đã duyệt
                    </span>

                    {images.length > 0 && (
                      <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                        {images.length} ảnh bằng chứng
                      </span>
                    )}
                  </div>

                  {images.length > 0 && (
                    <div className="mt-4 flex gap-2">
                      {images.slice(0, 3).map((image, imageIndex) => (
                        <img
                          key={`${alert.id}-${imageIndex}`}
                          src={image}
                          alt={`Bằng chứng ${imageIndex + 1} của ${value}`}
                          loading="lazy"
                          className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
                        />
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-5">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 transition-colors hover:text-blue-800">
                      Xem chi tiết cảnh báo
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-slate-950 p-7 text-white sm:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Phát hiện dấu hiệu lừa đảo?
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
              Gửi thông tin và bằng chứng để đội ngũ NoScam.vn xem xét.
              Báo cáo cần được kiểm duyệt trước khi trở thành dữ liệu cảnh báo công khai.
            </p>
          </div>
          <Link
            to="/report"
            className="shrink-0 rounded-xl bg-blue-600 px-6 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-700"
          >
            Gửi báo cáo →
          </Link>
        </div>
      </section>
    </div>
  )
}

export default SearchPage