import { Link } from 'react-router-dom'
import { motion } from 'motion/react'

import Container from '../../components/layout/Container'

const principles = [
  {
    number: '01',
    title:
      'Dữ liệu hỗ trợ quyết định',
    description:
      'NoScam tổng hợp các tín hiệu, báo cáo và dữ liệu liên quan để người dùng có thêm thông tin trước khi giao dịch.',
  },
  {
    number: '02',
    title:
      'Không kết luận thay người dùng',
    description:
      'Risk Score và dữ liệu cảnh báo chỉ hỗ trợ đánh giá rủi ro, không tự động kết luận một cá nhân hoặc tổ chức là lừa đảo.',
  },
  {
    number: '03',
    title:
      'Kết nối thông tin liên quan',
    description:
      'Một kết quả có thể liên quan đến số điện thoại, tài khoản ngân hàng, website, mạng xã hội hoặc người bán khác.',
  },
]

const sampleData = [
  ['Số điện thoại', '0909123456'],
  [
    'Tài khoản ngân hàng',
    '1234567821',
  ],
  [
    'Mạng xã hội',
    'facebook.com/abcshop',
  ],
]

const dataSources = [
  ['Báo cáo', 'Cộng đồng'],
  ['Tín hiệu', 'Rủi ro'],
  ['Dữ liệu', 'Liên quan'],
]

function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50/70 py-14 sm:py-24">
        <div
          aria-hidden="true"
          className="noscam-grid absolute inset-0 opacity-40"
        />

        <motion.div
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-100/60 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [
              0.5,
              0.9,
              0.5,
            ],
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
            className="relative mx-auto max-w-4xl text-center"
          >
            <p className="text-sm font-semibold text-blue-600">
              Về NoScam.vn
            </p>

            <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-[-0.04em] text-slate-950 sm:text-5xl sm:leading-tight">
              Kiểm tra trước khi
              <motion.span
                className="block text-blue-600"
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.2,
                }}
              >
                chuyển tiền
              </motion.span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-sm leading-6 text-slate-500 sm:text-lg sm:leading-8">
              NoScam.vn được xây dựng
              với mục tiêu giúp người
              dùng có thêm dữ liệu để
              kiểm tra thông tin và nhận
              biết các tín hiệu rủi ro
              trước khi thực hiện giao
              dịch.
            </p>
          </motion.div>
        </Container>
      </section>

      <section className="bg-white py-14 sm:py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
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
            >
              <p className="text-sm font-semibold text-blue-600">
                Vấn đề
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">
                Thông tin thường bị
                phân tán
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
                Trước một giao dịch,
                người dùng có thể phải
                tự tìm số điện thoại ở
                một nơi, số tài khoản ở
                nơi khác, sau đó tiếp
                tục kiểm tra website
                hoặc mạng xã hội.
              </p>

              <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
                Việc dữ liệu nằm ở
                nhiều nguồn khác nhau
                khiến quá trình kiểm
                tra mất thời gian và dễ
                bỏ sót những thông tin
                có liên quan.
              </p>
            </motion.div>

            <motion.div
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
              }}
              className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-8"
            >
              <motion.div
                className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                animate={{
                  top: [
                    '0%',
                    '100%',
                    '0%',
                  ],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Ví dụ một lần kiểm tra
              </p>

              <div className="mt-5 space-y-3">
                {sampleData.map(
                  (
                    [label, value],
                    index,
                  ) => (
                    <motion.div
                      key={label}
                      initial={{
                        opacity: 0,
                        x: 20,
                      }}
                      whileInView={{
                        opacity: 1,
                        x: 0,
                      }}
                      viewport={{
                        once: true,
                      }}
                      transition={{
                        delay:
                          index * 0.1,
                      }}
                      whileHover={{
                        x: 5,
                      }}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <p className="text-xs text-slate-400">
                        {label}
                      </p>

                      <p className="mt-1 break-all text-sm font-semibold text-slate-950">
                        {value}
                      </p>
                    </motion.div>
                  ),
                )}
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden border-y border-slate-200 bg-slate-50/70 py-14 sm:py-24">
        <div
          aria-hidden="true"
          className="noscam-grid absolute inset-0 opacity-25"
        />

        <Container>
          <div className="relative grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
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
            >
              <p className="text-sm font-semibold text-blue-600">
                Cách tiếp cận
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">
                Một ô tìm kiếm, nhiều
                nguồn dữ liệu
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
                Thay vì yêu cầu người
                dùng chọn từng công cụ
                riêng, NoScam hướng tới
                việc nhận diện loại dữ
                liệu từ nội dung được
                nhập và tổng hợp các
                thông tin liên quan vào
                cùng một kết quả.
              </p>
            </motion.div>

            <motion.div
              initial={{
                opacity: 0,
                scale: 0.96,
              }}
              whileInView={{
                opacity: 1,
                scale: 1,
              }}
              viewport={{
                once: true,
              }}
              className="relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-2xl sm:p-8"
            >
              <div
                aria-hidden="true"
                className="noscam-grid absolute inset-0 opacity-10"
              />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    NoScam
                  </p>

                  <motion.span
                    className="h-2 w-2 rounded-full bg-emerald-400"
                    animate={{
                      opacity: [
                        0.3,
                        1,
                        0.3,
                      ],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                    }}
                  />
                </div>

                <motion.div
                  whileHover={{
                    scale: 1.015,
                  }}
                  className="mt-5 rounded-xl bg-white px-4 py-4 text-sm text-slate-500"
                >
                  Nhập SĐT, STK,
                  website, Facebook...
                </motion.div>

                <div className="relative my-6 flex h-12 justify-center">
                  <motion.div
                    className="absolute top-0 h-10 w-px bg-gradient-to-b from-blue-400 to-transparent"
                    animate={{
                      scaleY: [
                        0.3,
                        1,
                        0.3,
                      ],
                    }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                    }}
                  />

                  <motion.span
                    className="absolute bottom-0 text-blue-400"
                    animate={{
                      y: [0, 4, 0],
                    }}
                    transition={{
                      duration: 1.3,
                      repeat: Infinity,
                    }}
                  >
                    ↓
                  </motion.span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {dataSources.map(
                    (
                      [label, value],
                      index,
                    ) => (
                      <motion.div
                        key={label}
                        initial={{
                          opacity: 0,
                          y: 15,
                        }}
                        whileInView={{
                          opacity: 1,
                          y: 0,
                        }}
                        viewport={{
                          once: true,
                        }}
                        transition={{
                          delay:
                            index *
                            0.12,
                        }}
                        whileHover={{
                          y: -4,
                          borderColor:
                            'rgb(59 130 246)',
                        }}
                        className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                      >
                        <p className="text-xs text-slate-400">
                          {label}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-white">
                          {value}
                        </p>
                      </motion.div>
                    ),
                  )}
                </div>
              </div>
            </motion.div>
          </div>
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
              Nguyên tắc
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">
              Cách NoScam trình bày dữ
              liệu
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{
              once: true,
              amount: 0.15,
            }}
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
            className="mt-8 grid gap-4 sm:mt-12 lg:grid-cols-3 lg:gap-6"
          >
            {principles.map(
              (principle) => (
                <motion.div
                  key={
                    principle.number
                  }
                  variants={{
                    hidden: {
                      opacity: 0,
                      y: 30,
                    },
                    visible: {
                      opacity: 1,
                      y: 0,
                    },
                  }}
                  whileHover={{
                    y: -7,
                  }}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-xl sm:p-7"
                >
                  <span className="text-xs font-bold text-blue-600">
                    {
                      principle.number
                    }
                  </span>

                  <h3 className="mt-5 text-lg font-semibold text-slate-950 transition-colors group-hover:text-blue-700 sm:mt-6 sm:text-xl">
                    {principle.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {
                      principle.description
                    }
                  </p>

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

      <section className="bg-white pb-14 sm:pb-24">
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
              className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl"
              animate={{
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
              }}
            />

            <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold text-blue-400">
                  NoScam.vn
                </p>

                <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Kiểm tra thông tin
                  trước khi giao dịch
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                  Tra cứu thông tin hoặc
                  đóng góp báo cáo để
                  cộng đồng có thêm dữ
                  liệu tham khảo.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <MotionLink to="/">
                  Kiểm tra ngay
                </MotionLink>

                <motion.div
                  whileHover={{
                    scale: 1.04,
                    y: -2,
                  }}
                  whileTap={{
                    scale: 0.97,
                  }}
                >
                  <Link
                    to="/report"
                    className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-700 px-6 text-sm font-semibold text-white transition-colors hover:border-slate-500 hover:bg-slate-900 sm:w-auto"
                  >
                    Gửi báo cáo
                  </Link>
                </motion.div>
              </div>
            </div>

            <div className="relative mt-8 border-t border-slate-800 pt-5 sm:mt-10 sm:pt-6">
              <p className="max-w-3xl text-xs leading-5 text-slate-400">
                Risk Score chỉ mang tính
                cảnh báo dựa trên dữ liệu
                hệ thống, không phải kết
                luận một cá nhân hoặc tổ
                chức là lừa đảo.
              </p>
            </div>
          </motion.div>
        </Container>
      </section>
    </>
  )
}

function MotionLink({
  to,
  children,
}) {
  return (
    <motion.div
      whileHover={{
        scale: 1.04,
        y: -2,
      }}
      whileTap={{
        scale: 0.97,
      }}
    >
      <Link
        to={to}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-slate-950 transition-colors hover:bg-blue-50 sm:w-auto"
      >
        {children}
      </Link>
    </motion.div>
  )
}

export default AboutPage