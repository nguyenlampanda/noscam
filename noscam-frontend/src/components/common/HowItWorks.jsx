import { motion } from 'motion/react'

import Container from '../layout/Container'

const steps = [
  {
    number: '01',
    title: 'Nhập thông tin',
    description:
      'Nhập số điện thoại, số tài khoản, website, mạng xã hội hoặc thông tin bạn muốn kiểm tra.',
  },
  {
    number: '02',
    title: 'Đối chiếu dữ liệu',
    description:
      'NoScam đối chiếu thông tin với dữ liệu cảnh báo, báo cáo cộng đồng và các dữ liệu liên quan.',
  },
  {
    number: '03',
    title: 'Đánh giá rủi ro',
    description:
      'Xem Risk Score, số báo cáo, dữ liệu liên quan và các yếu tố cần lưu ý trước khi giao dịch.',
  },
]

function HowItWorks() {
  return (
    <section className="relative overflow-hidden bg-white py-14 sm:py-24">
      <Container>
        <motion.div
          initial={{
            opacity: 0,
            y: 25,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          className="max-w-2xl"
        >
          <p className="text-sm font-semibold text-blue-600">
            Đơn giản và nhanh chóng
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">
            Cách NoScam hoạt động
          </h2>

          <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
            Một lần tìm kiếm giúp bạn
            tổng hợp các tín hiệu cần chú
            ý trước khi quyết định giao
            dịch.
          </p>
        </motion.div>

        <div className="relative mt-9 sm:mt-14">
          <div className="absolute left-5 top-5 hidden h-px w-[calc(100%-2.5rem)] bg-slate-200 lg:block" />

          <motion.div
            aria-hidden="true"
            className="absolute left-5 top-5 hidden h-px bg-blue-500 lg:block"
            initial={{
              width: 0,
            }}
            whileInView={{
              width:
                'calc(100% - 2.5rem)',
            }}
            viewport={{
              once: true,
              amount: 0.5,
            }}
            transition={{
              duration: 1.4,
              ease: 'easeInOut',
            }}
          />

          <div className="relative grid gap-4 sm:gap-6 lg:grid-cols-3">
            {steps.map(
              (step, index) => (
                <motion.div
                  key={step.number}
                  initial={{
                    opacity: 0,
                    y: 35,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  viewport={{
                    once: true,
                    amount: 0.3,
                  }}
                  transition={{
                    duration: 0.5,
                    delay:
                      index * 0.18,
                  }}
                  whileHover={{
                    y: -6,
                  }}
                  className="group relative rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-xl hover:shadow-slate-200/60 sm:p-7"
                >
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white shadow-lg shadow-slate-950/20">
                    {step.number}

                    <motion.span
                      className="absolute inset-0 rounded-full border border-blue-400"
                      animate={{
                        scale: [
                          1,
                          1.5,
                          1,
                        ],
                        opacity: [
                          0.7,
                          0,
                          0.7,
                        ],
                      }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        delay:
                          index * 0.4,
                      }}
                    />
                  </div>

                  <h3 className="mt-6 text-lg font-semibold text-slate-950 transition-colors group-hover:text-blue-700 sm:text-xl">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {step.description}
                  </p>

                  <motion.div
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 h-1 rounded-b-3xl bg-blue-500"
                    initial={{
                      width: 0,
                    }}
                    whileHover={{
                      width: '100%',
                    }}
                  />
                </motion.div>
              ),
            )}
          </div>
        </div>

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          className="mt-7 overflow-hidden rounded-2xl bg-slate-50 p-5 sm:mt-10 sm:p-6"
        >
          <div className="flex gap-4">
            <motion.div
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600"
              animate={{
                scale: [
                  1,
                  1.5,
                  1,
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />

            <div>
              <p className="text-sm font-semibold leading-6 text-slate-950">
                Không tìm thấy báo cáo
                không đồng nghĩa với an
                toàn tuyệt đối.
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                NoScam cung cấp thêm dữ
                liệu để hỗ trợ quyết định
                của bạn. Hãy tiếp tục kiểm
                tra thông tin người nhận,
                nội dung giao dịch và các
                dấu hiệu bất thường trước
                khi chuyển tiền.
              </p>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  )
}

export default HowItWorks