import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

import Container from '../layout/Container'

function ReportCTA() {
  return (
    <section className="bg-white pb-14 sm:pb-24">
      <Container>
        <motion.div
          initial={{
            opacity: 0,
            y: 35,
            scale: 0.98,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          viewport={{
            once: true,
            amount: 0.25,
          }}
          transition={{
            duration: 0.6,
          }}
          className="relative overflow-hidden rounded-3xl bg-slate-950 px-5 py-10 shadow-2xl shadow-slate-950/10 sm:px-10 sm:py-14 lg:px-14"
        >
          <div
            aria-hidden="true"
            className="noscam-grid absolute inset-0 opacity-10"
          />

          <motion.div
            aria-hidden="true"
            className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl"
            animate={{
              x: [0, -40, 0],
              y: [0, 35, 0],
              scale: [
                1,
                1.2,
                1,
              ],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          <motion.div
            aria-hidden="true"
            className="absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl"
            animate={{
              x: [0, 60, 0],
              scale: [
                1,
                1.25,
                1,
              ],
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
            }}
          />

          <motion.div
            aria-hidden="true"
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent"
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

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <motion.span
                  className="h-2 w-2 rounded-full bg-blue-400"
                  animate={{
                    scale: [
                      1,
                      1.6,
                      1,
                    ],
                    opacity: [
                      0.5,
                      1,
                      0.5,
                    ],
                  }}
                  transition={{
                    duration: 1.7,
                    repeat: Infinity,
                  }}
                />

                <p className="text-sm font-semibold text-blue-400">
                  Đóng góp dữ liệu cộng đồng
                </p>
              </div>

              <h2 className="mt-3 text-2xl font-bold tracking-[-0.035em] text-white sm:text-4xl">
                Bạn gặp một trường hợp
                đáng ngờ?
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                Báo cáo trường hợp này để NoScam ghi
                nhận thông tin và hỗ trợ
                cộng đồng có thêm dữ liệu
                tham khảo trước khi giao
                dịch.
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
              className="shrink-0"
            >
              <Link
                to="/report"
                className="group flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white px-6 text-sm font-semibold text-slate-950 shadow-xl shadow-black/20 transition-colors hover:bg-blue-50 sm:w-auto"
              >
                Báo cáo trường hợp này

                <motion.span
                  animate={{
                    x: [
                      0,
                      4,
                      0,
                    ],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                >
                  →
                </motion.span>
              </Link>
            </motion.div>
          </div>

          <div className="relative mt-8 border-t border-slate-800 pt-5 sm:mt-10 sm:pt-6">
            <p className="max-w-3xl text-xs leading-5 text-slate-400">
              Vui lòng cung cấp thông tin
              chính xác và bằng chứng liên
              quan. Báo cáo của người dùng
              là một nguồn dữ liệu tham
              khảo và sẽ không tự động
              được xem là kết luận về hành
              vi lừa đảo.
            </p>
          </div>
        </motion.div>
      </Container>
    </section>
  )
}

export default ReportCTA