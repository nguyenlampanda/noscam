import { useEffect } from 'react'
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

import { useSearch }
  from '../../hooks/useSearch'

function SearchPage() {
  const [searchParams] =
    useSearchParams()

  const query =
    searchParams
      .get('q')
      ?.trim() || ''

  const {
    data: result,
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
      <section className="py-12 sm:py-20">
        <Container>
          <div className="mx-auto max-w-3xl">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Kiểm tra thông tin
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
              Nhập số điện thoại,
              số tài khoản, website
              hoặc tài khoản mạng xã
              hội bạn muốn kiểm tra.
            </p>

            <div className="mt-7 sm:mt-8">
              <SearchBar />
            </div>
          </div>
        </Container>
      </section>
    )
  }

  return (
    <>
      <section className="border-b border-slate-200 bg-slate-50/60 py-8 sm:py-10">
        <Container>
          <div className="mx-auto max-w-5xl">
            <p className="text-sm font-semibold text-blue-600">
              Kết quả tra cứu
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Đánh giá thông tin
              trước khi giao dịch
            </h1>

            <div className="mt-6 sm:mt-7">
              <SearchBar
                initialValue={
                  query
                }
              />
            </div>
          </div>
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
            )}

            {status ===
              'empty' && (
              <EmptyState
                query={query}
              />
            )}

            {status ===
              'success' &&
              result && (
                <>
                  <div className="grid gap-4 sm:gap-6 lg:grid-cols-[0.8fr_1.2fr]">
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
                  </div>

                  <div className="mt-4 sm:mt-6">
                    <RiskFactors
                      factors={
                        result.riskFactors
                      }
                    />
                  </div>

                  <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-2">
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
                  </div>

                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:mt-6 sm:p-6">
                    <p className="text-sm font-semibold text-slate-950">
                      Lưu ý về kết quả
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {result.disclaimer}
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
                </>
              )}
          </div>
        </Container>
      </section>
    </>
  )
}

function DataSources({
  sources = [],
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-950">
        Nguồn dữ liệu
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Các nhóm dữ liệu được sử
        dụng để tổng hợp kết quả
        cảnh báo.
      </p>

      {sources.length > 0 ? (
        <div className="mt-5 space-y-3">
          {sources.map(
            (source) => (
              <div
                key={source}
                className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600"
              >
                {source}
              </div>
            ),
          )}
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-400">
          Chưa có thông tin nguồn
          dữ liệu.
        </p>
      )}

      <div className="mt-6 border-t border-slate-200 pt-5 sm:mt-7 sm:pt-6">
        <p className="text-sm font-semibold text-slate-950">
          Bạn có thêm thông tin?
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Nếu bạn từng giao dịch
          hoặc có bằng chứng liên
          quan, bạn có thể gửi báo
          cáo để bổ sung dữ liệu.
        </p>

        <Link
          to="/report"
          className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          Gửi báo cáo →
        </Link>
      </div>
    </div>
  )
}

export default SearchPage