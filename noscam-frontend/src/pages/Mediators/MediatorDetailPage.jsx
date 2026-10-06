import {
  useEffect,
  useState,
} from 'react'
import { motion } from 'motion/react'
import {
  Link,
  useParams,
} from 'react-router-dom'

import Container from '../../components/layout/Container'
import mediatorService from '../../services/mediatorService'

const labels = {
  phone: 'Số điện thoại',
  bank_account:
    'Tài khoản ngân hàng',
  facebook: 'Facebook',
  zalo: 'Zalo',
  telegram: 'Telegram',
  other: 'Thông tin khác',
}

function money(value) {
  return `${Number(
    value || 0,
  ).toLocaleString('vi-VN')}đ`
}

function MediatorDetailPage() {
  const { code } = useParams()

  const [data, setData] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const response =
          await mediatorService
            .show(code)

        if (active) {
          setData(
            response?.data ||
            null,
          )
        }
      } catch (err) {
        if (active) {
          setError(
            err?.message ||
            'Không tìm thấy hồ sơ.',
          )
        }
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
  }, [code])

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        Đang tải hồ sơ...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-24 text-center text-red-600">
        {error}
      </div>
    )
  }

  return (
    <section className="bg-slate-50 py-10 sm:py-16">
      <Container>
        <div className="mx-auto max-w-5xl">
          <Link
            to="/mediators"
            className="text-sm font-bold text-blue-600"
          >
            ← Danh sách trung gian
          </Link>

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="h-1.5 bg-emerald-500" />

            <div className="p-6 sm:p-9">
              <div className="flex flex-col gap-6 md:flex-row md:justify-between">
                <div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    Hồ sơ trung gian được ghi nhận
                  </span>

                  <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">
                    {data.name}
                  </h1>

                  <p className="mt-2 font-black text-blue-600">
                    {data.code}
                  </p>

                  {data.description && (
                    <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">
                      {
                        data.description
                      }
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-slate-50 p-5 md:min-w-60">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Tiền cọc hiện ghi nhận
                  </p>

                  <p className="mt-2 text-3xl font-black text-emerald-600">
                    {money(
                      data
                        .deposit_balance,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-9 border-t border-slate-100 pt-7">
                <h2 className="text-lg font-black text-slate-950">
                  Thông tin chính thức để đối chiếu
                </h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {data.identifiers?.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <p className="text-xs font-bold text-slate-400">
                          {labels[
                            item.type
                          ] ||
                            item.type}
                        </p>

                        <p className="mt-2 break-all font-black text-slate-900">
                          {item.value}
                        </p>

                        {(item.bank_name ||
                          item.label) && (
                          <p className="mt-1 text-xs text-slate-500">
                            {item.bank_name ||
                              item.label}
                          </p>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>

              {data.deposit_history
                ?.length > 0 && (
                <div className="mt-9 border-t border-slate-100 pt-7">
                  <h2 className="text-lg font-black text-slate-950">
                    Lịch sử tiền cọc
                  </h2>

                  <div className="mt-4 space-y-2">
                    {data
                      .deposit_history
                      .map((log) => (
                        <div
                          key={log.id}
                          className="flex flex-col gap-2 rounded-xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-700">
                              {log.note ||
                                'Điều chỉnh tiền cọc'}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {
                                log.recorded_at
                              }
                            </p>
                          </div>

                          <strong
                            className={
                              Number(
                                log.amount,
                              ) >= 0
                                ? 'text-emerald-600'
                                : 'text-red-600'
                            }
                          >
                            {Number(
                              log.amount,
                            ) > 0
                              ? '+'
                              : ''}
                            {money(
                              log.amount,
                            )}
                          </strong>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="mt-9 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
                Số tiền cọc và hồ sơ trên là dữ liệu NoScam đang ghi nhận tại thời điểm hiển thị. Đây không phải bảo đảm tuyệt đối rằng mọi giao dịch đều không có rủi ro. Hãy đối chiếu chính xác SĐT, STK và tài khoản trước khi chuyển tiền.
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  )
}

export default MediatorDetailPage
