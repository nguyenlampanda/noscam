import {
  useEffect,
  useState,
} from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

import Container from '../../components/layout/Container'
import mediatorService from '../../services/mediatorService'

function money(value) {
  return `${Number(
    value || 0,
  ).toLocaleString('vi-VN')}đ`
}

function MediatorsPage() {
  const [items, setItems] =
    useState([])

  const [search, setSearch] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  useEffect(() => {
    const timer = setTimeout(
      async () => {
        setLoading(true)

        try {
          const response =
            await mediatorService
              .list(search)

          setItems(
            response?.data?.data ||
            [],
          )
        } finally {
          setLoading(false)
        }
      },
      250,
    )

    return () =>
      clearTimeout(timer)
  }, [search])

  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50 py-14 sm:py-20">
        <div className="noscam-grid absolute inset-0 opacity-40" />

        <Container>
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="relative mx-auto max-w-4xl text-center"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
              NOSCAM TRUNG GIAN
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Hồ sơ trung gian
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
              Tra cứu hồ sơ, thông tin đối chiếu và số tiền cọc NoScam đang ghi nhận trước khi giao dịch.
            </p>

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Tên, mã NS-TG, SĐT, STK, Facebook..."
              className="mx-auto mt-8 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm shadow-lg shadow-slate-950/5 outline-none focus:border-blue-500"
            />
          </motion.div>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container>
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              Đang tải hồ sơ...
            </div>
          ) : items.length === 0 ? (
            <div className="mx-auto max-w-2xl rounded-3xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
              Chưa tìm thấy hồ sơ phù hợp.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {items.map(
                (item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{
                      opacity: 0,
                      y: 20,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      delay:
                        index * 0.05,
                    }}
                    whileHover={{
                      y: -4,
                    }}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          {item.status ===
                          'active'
                            ? 'Đang hoạt động'
                            : 'Tạm ngưng'}
                        </span>

                        <h2 className="mt-4 text-xl font-black text-slate-950">
                          {item.name}
                        </h2>

                        <p className="mt-1 text-xs font-black text-blue-600">
                          {item.code}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-bold text-slate-400">
                        Tiền cọc đang ghi nhận
                      </p>

                      <p className="mt-1 text-2xl font-black text-emerald-600">
                        {money(
                          item
                            .deposit_balance,
                        )}
                      </p>
                    </div>

                    <Link
                      to={`/mediators/${item.code}`}
                      className="mt-6 inline-flex text-sm font-black text-blue-600"
                    >
                      Xem hồ sơ →
                    </Link>
                  </motion.div>
                ),
              )}
            </div>
          )}

          <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-5 text-slate-400">
            Số tiền cọc là số tiền NoScam đang ghi nhận tại thời điểm hiển thị. Thông tin này không phải cam kết rằng mọi giao dịch với trung gian đều không có rủi ro.
          </p>
        </Container>
      </section>
    </>
  )
}

export default MediatorsPage
