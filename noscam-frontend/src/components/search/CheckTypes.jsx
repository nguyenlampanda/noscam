import { motion } from 'motion/react'

import Container from '../layout/Container'
import { checkTypes } from '../../data/checkTypes'

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.97,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
    },
  },
}

function CheckTypes() {
  return (
    <section className="relative overflow-hidden border-y border-slate-200 bg-slate-50/60 py-14 sm:py-24">
      <div
        aria-hidden="true"
        className="noscam-grid absolute inset-0 opacity-30"
      />

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
            amount: 0.3,
          }}
          className="relative max-w-2xl"
        >
          <p className="text-sm font-semibold text-blue-600">
            Một nơi để kiểm tra
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">
            NoScam kiểm tra được những gì?
          </h2>

          <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
            Bạn không cần chọn công cụ
            riêng cho từng loại thông tin.
            Chỉ cần nhập dữ liệu vào ô tìm
            kiếm, hệ thống sẽ xác định loại
            thông tin và tìm các dữ liệu
            liên quan.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{
            once: true,
            amount: 0.1,
          }}
          className="relative mt-8 grid gap-3 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4"
        >
          {checkTypes.map(
            (item, index) => (
              <motion.div
                key={item.id}
                variants={cardVariants}
                whileHover={{
                  y: -8,
                  scale: 1.02,
                }}
                className="group relative min-h-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-xl hover:shadow-slate-200/60 sm:p-6"
              >
                <motion.div
                  aria-hidden="true"
                  className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-50"
                  whileHover={{
                    scale: 1.7,
                  }}
                  transition={{
                    duration: 0.4,
                  }}
                />

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-[0.15em] text-blue-600">
                      {item.id}
                    </span>

                    <motion.span
                      className="h-2 w-2 rounded-full bg-blue-500"
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
                        delay:
                          index * 0.2,
                      }}
                    />
                  </div>

                  <h3 className="mt-7 text-base font-semibold text-slate-950 transition-colors group-hover:text-blue-700 sm:text-lg">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
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

        <motion.div
          initial={{
            opacity: 0,
            x: -20,
          }}
          whileInView={{
            opacity: 1,
            x: 0,
          }}
          viewport={{
            once: true,
          }}
          className="relative mt-7 border-l-2 border-blue-600 pl-4 sm:mt-8 sm:pl-5"
        >
          <p className="text-sm font-semibold text-slate-900">
            Một ô tìm kiếm cho tất cả
          </p>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Ví dụ: bạn có thể nhập trực
            tiếp số điện thoại, số tài
            khoản, tên miền hoặc đường dẫn
            Facebook. NoScam sẽ xử lý loại
            dữ liệu ở phía hệ thống thay
            vì bắt bạn chọn trước.
          </p>
        </motion.div>
      </Container>
    </section>
  )
}

export default CheckTypes