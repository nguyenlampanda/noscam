import { Link } from 'react-router-dom'
import { motion } from 'motion/react'

import Container from '../../components/layout/Container'

const warningSigns = [
  {
    number: '01',
    title: 'Thúc giục chuyển tiền',
    description:
      'Liên tục tạo cảm giác khẩn cấp, yêu cầu chuyển tiền ngay hoặc cho rằng bạn sẽ mất cơ hội nếu chậm trễ.',
  },
  {
    number: '02',
    title:
      'Yêu cầu OTP hoặc thông tin đăng nhập',
    description:
      'Yêu cầu cung cấp mã OTP, mật khẩu, mã PIN hoặc thông tin đăng nhập tài khoản ngân hàng.',
  },
  {
    number: '03',
    title:
      'Thông tin không nhất quán',
    description:
      'Tên người nhận, số tài khoản, số điện thoại hoặc thông tin người bán không khớp với nội dung được giới thiệu.',
  },
  {
    number: '04',
    title: 'Ưu đãi bất thường',
    description:
      'Giá bán, lợi nhuận, phần thưởng hoặc quyền lợi hấp dẫn bất thường so với thông tin phổ biến trên thị trường.',
  },
  {
    number: '05',
    title:
      'Yêu cầu đóng phí trước',
    description:
      'Yêu cầu nộp phí, đặt cọc, phí xác minh, phí mở khóa hoặc chuyển thêm tiền trước khi nhận được quyền lợi.',
  },
  {
    number: '06',
    title: 'Đường link đáng ngờ',
    description:
      'Đường dẫn có tên miền lạ, gần giống website chính thức hoặc yêu cầu đăng nhập và nhập thông tin nhạy cảm.',
  },
]

const safetySteps = [
  {
    number: '01',
    title: 'Kiểm tra thông tin',
    description:
      'Tra cứu số điện thoại, số tài khoản, website hoặc tài khoản mạng xã hội trước khi giao dịch.',
  },
  {
    number: '02',
    title:
      'Đối chiếu nhiều nguồn',
    description:
      'Không chỉ dựa vào một bài đăng, ảnh chụp hoặc lời giới thiệu từ người đang giao dịch với bạn.',
  },
  {
    number: '03',
    title: 'Xác minh người nhận',
    description:
      'Kiểm tra tên chủ tài khoản, thông tin người bán và mục đích chuyển tiền trước khi xác nhận.',
  },
  {
    number: '04',
    title:
      'Không chia sẻ thông tin bảo mật',
    description:
      'Không cung cấp OTP, mật khẩu, mã PIN hoặc quyền truy cập tài khoản cho người khác.',
  },
  {
    number: '05',
    title:
      'Dừng lại khi có dấu hiệu bất thường',
    description:
      'Nếu thông tin chưa rõ ràng hoặc bị thúc giục, hãy tạm dừng giao dịch và kiểm tra thêm.',
  },
]

function GuidePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50/70 py-12 sm:py-20">
        <div
          aria-hidden="true"
          className="noscam-grid absolute inset-0 opacity-40"
        />

        <motion.div
          aria-hidden="true"
          className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-blue-100/60 blur-3xl"
          animate={{
            scale: [1, 1.25, 1],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
          }}
        />

        <Container>
          <motion.div
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="relative max-w-3xl"
          >
            <p className="text-sm font-semibold text-blue-600">
              Kiến thức an toàn
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Nhận biết dấu hiệu đáng
              ngờ trước khi chuyển tiền
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
              Một vài bước kiểm tra đơn
              giản có thể giúp bạn phát
              hiện những tín hiệu cần
              chú ý trước khi thực hiện
              giao dịch.
            </p>
          </motion.div>
        </Container>
      </section>

      <section className="bg-white py-14 sm:py-24">
        <Container>
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
            className="max-w-2xl"
          >
            <p className="text-sm font-semibold text-blue-600">
              Dấu hiệu cần chú ý
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">
              6 dấu hiệu thường gặp
            </h2>

            <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
              Một dấu hiệu riêng lẻ chưa
              đủ để kết luận có lừa đảo,
              nhưng nhiều dấu hiệu xuất
              hiện cùng lúc là lý do để
              bạn kiểm tra kỹ hơn.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{
              once: true,
              amount: 0.1,
            }}
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.08,
                },
              },
            }}
            className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
          >
            {warningSigns.map(
              (item) => (
                <motion.div
                  key={item.number}
                  variants={{
                    hidden: {
                      opacity: 0,
                      y: 30,
                      scale: 0.97,
                    },
                    visible: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    },
                  }}
                  whileHover={{
                    y: -7,
                    scale: 1.015,
                  }}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-xl hover:shadow-slate-200/60 sm:p-6"
                >
                  <motion.div
                    aria-hidden="true"
                    className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-50"
                    whileHover={{
                      scale: 1.7,
                    }}
                  />

                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-600">
                        {item.number}
                      </span>

                      <motion.span
                        className="h-2 w-2 rounded-full bg-amber-400"
                        animate={{
                          opacity: [
                            0.3,
                            1,
                            0.3,
                          ],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                        }}
                      />
                    </div>

                    <h3 className="mt-5 text-base font-semibold text-slate-950 transition-colors group-hover:text-blue-700 sm:text-lg">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {item.description}
                    </p>
                  </div>

                  <motion.div
                    className="absolute bottom-0 left-0 h-1 bg-blue-500"
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
          </motion.div>
        </Container>
      </section>

      <section className="relative overflow-hidden border-y border-slate-200 bg-slate-50/70 py-14 sm:py-24">
        <div
          aria-hidden="true"
          className="noscam-grid absolute inset-0 opacity-25"
        />

        <Container>
          <div className="relative grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <motion.div
              initial={{
                opacity: 0,
                x: -30,
              }}
              whileInView={{
                opacity: 1,
                x: 0,
              }}
              viewport={{
                once: true,
              }}
              className="lg:sticky lg:top-28 lg:self-start"
            >
              <p className="text-sm font-semibold text-blue-600">
                Trước khi giao dịch
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">
                5 bước nên thực hiện
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
                Đừng chỉ kiểm tra xem
                thông tin có báo cáo hay
                không. Hãy kết hợp nhiều
                bước xác minh trước khi
                quyết định chuyển tiền.
              </p>
            </motion.div>

            <div className="relative">
              <div className="absolute bottom-8 left-5 top-8 w-px bg-slate-200 sm:left-7" />

              <motion.div
                className="absolute left-5 top-8 w-px bg-blue-500 sm:left-7"
                initial={{
                  height: 0,
                }}
                whileInView={{
                  height:
                    'calc(100% - 4rem)',
                }}
                viewport={{
                  once: true,
                  amount: 0.25,
                }}
                transition={{
                  duration: 1.5,
                }}
              />

              <div className="space-y-4">
                {safetySteps.map(
                  (step, index) => (
                    <motion.div
                      key={
                        step.number
                      }
                      initial={{
                        opacity: 0,
                        x: 30,
                      }}
                      whileInView={{
                        opacity: 1,
                        x: 0,
                      }}
                      viewport={{
                        once: true,
                        amount: 0.4,
                      }}
                      transition={{
                        delay:
                          index * 0.08,
                      }}
                      whileHover={{
                        x: 5,
                      }}
                      className="relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:gap-5 sm:p-6"
                    >
                      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white sm:h-14 sm:w-14">
                        {step.number}

                        <motion.span
                          className="absolute inset-0 rounded-full border border-blue-400"
                          animate={{
                            scale: [
                              1,
                              1.35,
                              1,
                            ],
                            opacity: [
                              0.6,
                              0,
                              0.6,
                            ],
                          }}
                          transition={{
                            duration: 2.5,
                            repeat:
                              Infinity,
                            delay:
                              index *
                              0.3,
                          }}
                        />
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold leading-6 text-slate-950 sm:text-base">
                          {step.title}
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {
                            step.description
                          }
                        </p>
                      </div>
                    </motion.div>
                  ),
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-white py-14 sm:py-24">
        <Container>
          <motion.div
            initial={{
              opacity: 0,
              y: 30,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            className="relative overflow-hidden rounded-3xl bg-slate-950 px-5 py-10 sm:px-10 sm:py-14 lg:px-14"
          >
            <div
              aria-hidden="true"
              className="noscam-grid absolute inset-0 opacity-10"
            />

            <motion.div
              aria-hidden="true"
              className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl"
              animate={{
                scale: [1, 1.3, 1],
                x: [0, -40, 0],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
              }}
            />

            <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold text-blue-400">
                  Kiểm tra trước khi
                  chuyển tiền
                </p>

                <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Có thông tin khiến
                  bạn chưa yên tâm?
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                  Tra cứu thông tin trên
                  NoScam để xem các dữ
                  liệu cảnh báo, báo cáo
                  và tín hiệu liên quan
                  mà hệ thống đang ghi
                  nhận.
                </p>
              </div>

              <motion.div
                whileHover={{
                  scale: 1.05,
                  y: -3,
                }}
                whileTap={{
                  scale: 0.96,
                }}
              >
                <Link
                  to="/"
                  className="flex h-12 w-full shrink-0 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-slate-950 hover:bg-blue-50 sm:w-auto"
                >
                  Kiểm tra ngay →
                </Link>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
            }}
            whileInView={{
              opacity: 1,
            }}
            viewport={{
              once: true,
            }}
            className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:mt-8 sm:p-6"
          >
            <p className="text-sm font-semibold text-slate-950">
              Không có cảnh báo không
              đồng nghĩa với an toàn
              tuyệt đối.
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
              Dữ liệu có thể chưa đầy
              đủ hoặc chưa được hệ thống
              ghi nhận. Kết quả tra cứu
              và Risk Score chỉ hỗ trợ
              đánh giá rủi ro, không
              phải kết luận một cá nhân
              hoặc tổ chức là lừa đảo.
            </p>
          </motion.div>
        </Container>
      </section>
    </>
  )
}

export default GuidePage