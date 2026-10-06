import { useEffect } from 'react'
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

import RiskScore
  from '../../components/risk/RiskScore'

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
                <DetectedSearch
                  query={query}
                  meta={meta}
                />

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
                  <DetectedSearch
                    query={query}
                    meta={meta}
                  />

                  <MediatorLookup
                    query={query}
                  />

                  <motion.div
                    variants={
                      itemVariants
                    }
                    className="grid gap-4 sm:gap-6 lg:grid-cols-[0.8fr_1.2fr]"
                  >
                    <RiskScore
                      score={
                        result.riskScore
                      }
                      label={
                        result.riskLabel
                      }
                      level={
                        result.riskLevel
                      }
                    />

                    <SearchSummary
                      query={query}
                      result={result}
                    />
                  </motion.div>

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
                          Không nên sử dụng
                          Risk Score như căn
                          cứ duy nhất để đưa
                          ra quyết định giao
                          dịch. Hãy đối chiếu
                          thêm thông tin người
                          nhận, nội dung giao
                          dịch và các nguồn
                          đáng tin cậy khác.
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

function DetectedSearch({
  query,
  meta,
}) {
  const label =
    meta?.detectedTypeLabel ||
    'Thông tin'

  const normalized =
    meta?.normalizedQuery ||
    query

  return (
    <motion.div
      variants={itemVariants}
      className="mb-4 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/90 via-white to-cyan-50/70 p-4 sm:mb-6 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{
              scale: 0.75,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20"
          >
            <motion.span
              className="absolute h-3 w-3 rounded-full border border-white/80"
              animate={{
                scale: [
                  1,
                  1.7,
                  1,
                ],
                opacity: [
                  1,
                  0.25,
                  1,
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />

            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </motion.div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
              Hệ thống nhận diện
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-950 sm:text-base">
              {label}
            </p>
          </div>
        </div>

        <div className="min-w-0 sm:text-right">
          <p className="text-xs font-medium text-slate-400">
            Dữ liệu đã chuẩn hóa
          </p>

          <p className="mt-1 break-all text-sm font-semibold text-slate-700">
            {normalized}
          </p>
        </div>
      </div>
    </motion.div>
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

export default SearchPage