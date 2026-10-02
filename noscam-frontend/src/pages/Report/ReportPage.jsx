import { motion } from 'motion/react'

import Container from '../../components/layout/Container'
import ReportForm from '../../components/report/ReportForm'

const tips = [
  {
    number: '01',
    title: 'Thông tin nhận diện',
    description:
      'Số điện thoại, tài khoản ngân hàng, website hoặc mạng xã hội liên quan.',
  },
  {
    number: '02',
    title: 'Diễn biến sự việc',
    description:
      'Mô tả cách liên hệ, nội dung trao đổi và những dấu hiệu khiến bạn nghi ngờ.',
  },
  {
    number: '03',
    title: 'Bằng chứng',
    description:
      'Ảnh tin nhắn, giao dịch, hóa đơn hoặc tài liệu có liên quan.',
  },
]

function ReportPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50/70 py-10 sm:py-16">
        <div
          aria-hidden="true"
          className="noscam-grid absolute inset-0 opacity-40"
        />

        <motion.div
          aria-hidden="true"
          className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-100/60 blur-3xl"
          animate={{
            scale: [1, 1.18, 1],
            x: [0, -30, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
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
            transition={{
              duration: 0.55,
            }}
            className="relative mx-auto max-w-4xl"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <motion.span
                  className="absolute inline-flex h-full w-full rounded-full bg-blue-500"
                  animate={{
                    scale: [1, 2, 1],
                    opacity: [0.8, 0, 0.8],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                />

                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-600" />
              </span>

              <p className="text-sm font-semibold text-blue-600">
                Báo cáo cộng đồng
              </p>
            </div>

            <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Báo cáo trường hợp đáng ngờ
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
              Chia sẻ thông tin về giao
              dịch hoặc trường hợp đáng
              ngờ để hệ thống có thêm dữ
              liệu đối chiếu và hỗ trợ
              cộng đồng.
            </p>
          </motion.div>
        </Container>
      </section>

      <section className="relative bg-white py-8 sm:py-16">
        <Container>
          <div className="mx-auto grid min-w-0 max-w-5xl gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <ReportForm />

            <motion.aside
              initial={{
                opacity: 0,
                x: 25,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay: 0.2,
                duration: 0.5,
              }}
              className="space-y-4 sm:space-y-5 lg:sticky lg:top-24 lg:self-start"
            >
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2">
                  <motion.span
                    className="h-2 w-2 rounded-full bg-blue-600"
                    animate={{
                      opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                    }}
                  />

                  <h2 className="text-sm font-semibold text-slate-950">
                    Nên cung cấp gì?
                  </h2>
                </div>

                <div className="relative mt-5">
                  <div className="absolute bottom-4 left-[15px] top-4 w-px bg-slate-200" />

                  <div className="space-y-5">
                    {tips.map(
                      (tip, index) => (
                        <motion.div
                          key={tip.number}
                          initial={{
                            opacity: 0,
                            x: 15,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            delay:
                              0.35 +
                              index * 0.1,
                          }}
                          className="relative flex gap-3"
                        >
                          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white text-[10px] font-bold text-blue-600">
                            {tip.number}
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {tip.title}
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {
                                tip.description
                              }
                            </p>
                          </div>
                        </motion.div>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <motion.div
                whileHover={{
                  y: -3,
                }}
                className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5"
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                  Lưu ý
                </p>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Việc một thông tin được
                  gửi báo cáo không đồng
                  nghĩa cá nhân hoặc tổ
                  chức liên quan đã được
                  xác định là lừa đảo.
                </p>
              </motion.div>

              <motion.div
                whileHover={{
                  y: -3,
                }}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4 text-emerald-600"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3 5 6v5c0 4.5 2.9 8.3 7 10 4.1-1.7 7-5.5 7-10V6l-7-3Z"
                      />
                    </svg>
                  </div>

                  <h2 className="text-sm font-semibold text-slate-950">
                    Bảo vệ thông tin
                  </h2>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Không gửi mật khẩu, mã
                  OTP, mã PIN hoặc thông
                  tin đăng nhập tài khoản
                  trong nội dung báo cáo.
                </p>
              </motion.div>
            </motion.aside>
          </div>
        </Container>
      </section>
    </>
  )
}

export default ReportPage