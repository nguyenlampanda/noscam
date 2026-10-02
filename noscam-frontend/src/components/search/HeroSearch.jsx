import { motion } from 'motion/react'

import SearchBar from './SearchBar'

const searchableTypes = [
  'Số điện thoại',
  'Tài khoản ngân hàng',
  'Website',
  'Facebook',
  'TikTok',
  'Telegram',
  'Zalo',
  'Shop / người bán',
]

const signals = [
  {
    label: 'SĐT',
    value: '09•• ••• •••',
    position:
      'left-[5%] top-[22%] hidden lg:block',
    delay: 0,
  },
  {
    label: 'STK',
    value: '•••• 8291',
    position:
      'right-[5%] top-[27%] hidden lg:block',
    delay: 0.7,
  },
  {
    label: 'DOMAIN',
    value: 'shop-check.vn',
    position:
      'bottom-[22%] left-[8%] hidden xl:block',
    delay: 1.3,
  },
  {
    label: 'SOCIAL',
    value: '@seller•••',
    position:
      'bottom-[18%] right-[8%] hidden xl:block',
    delay: 1.8,
  },
]

function HeroSearch() {
  return (
    <section className="relative isolate overflow-hidden border-b border-slate-200 bg-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <motion.div
          className="absolute left-1/2 top-[-18rem] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-blue-100/60 blur-3xl"
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.45, 0.8, 0.45],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-cyan-100/40 blur-3xl"
          animate={{
            x: [0, 80, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute -right-40 bottom-0 h-80 w-80 rounded-full bg-indigo-100/50 blur-3xl"
          animate={{
            x: [0, -70, 0],
            y: [0, 35, 0],
          }}
          transition={{
            duration: 13,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <div className="noscam-grid absolute inset-0 opacity-50" />

        <motion.div
          className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"
          animate={{
            y: ['0vh', '85vh'],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {signals.map((signal) => (
        <motion.div
          key={signal.label}
          aria-hidden="true"
          className={`pointer-events-none absolute z-0 ${signal.position}`}
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: [0.35, 0.75, 0.35],
            y: [0, -9, 0],
          }}
          transition={{
            opacity: {
              duration: 4,
              repeat: Infinity,
              delay: signal.delay,
            },
            y: {
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: signal.delay,
            },
          }}
        >
          <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
            <p className="text-[9px] font-bold tracking-[0.18em] text-blue-600">
              {signal.label}
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-700">
              {signal.value}
            </p>
          </div>
        </motion.div>
      ))}

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-24 lg:px-8 lg:pb-32 lg:pt-28">
        <motion.div
          initial={{
            opacity: 0,
            y: 16,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.55,
          }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-3.5 py-2 shadow-sm backdrop-blur-xl"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
          </span>

          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600 sm:text-xs">
            Hệ thống kiểm tra rủi ro
          </span>
        </motion.div>

        <motion.h1
          initial={{
            opacity: 0,
            y: 24,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.65,
            delay: 0.08,
          }}
          className="mx-auto max-w-4xl text-[40px] font-bold leading-[1.03] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[68px]"
        >
          Kiểm tra trước khi
          <motion.span
            className="relative mx-auto mt-1 block w-fit text-blue-600"
            initial={{
              backgroundSize: '0% 100%',
            }}
            animate={{
              backgroundSize: '100% 100%',
            }}
            transition={{
              duration: 0.8,
              delay: 0.45,
            }}
          >
            chuyển tiền

            <motion.span
              aria-hidden="true"
              className="absolute -bottom-2 left-0 h-[3px] w-full origin-left rounded-full bg-blue-500/30"
              initial={{
                scaleX: 0,
              }}
              animate={{
                scaleX: 1,
              }}
              transition={{
                duration: 0.8,
                delay: 0.6,
              }}
            />
          </motion.span>
        </motion.h1>

        <motion.p
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
            delay: 0.18,
          }}
          className="mx-auto mt-7 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-lg sm:leading-8"
        >
          Tra cứu các tín hiệu cảnh báo và báo cáo
          cộng đồng để hỗ trợ đánh giá rủi ro trước
          khi bạn thực hiện giao dịch.
        </motion.p>

        <motion.div
          initial={{
            opacity: 0,
            y: 24,
            scale: 0.98,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            duration: 0.65,
            delay: 0.28,
          }}
          className="mx-auto mt-9 max-w-3xl sm:mt-11"
        >
          <SearchBar />
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            duration: 0.7,
            delay: 0.55,
          }}
          className="mx-auto mt-7 flex max-w-3xl flex-wrap justify-center gap-2"
        >
          {searchableTypes.map((type, index) => (
            <motion.span
              key={type}
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.6 + index * 0.05,
              }}
              whileHover={{
                y: -2,
              }}
              className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-[11px] font-medium text-slate-500 shadow-sm backdrop-blur-sm sm:text-xs"
            >
              {type}
            </motion.span>
          ))}
        </motion.div>

        <motion.p
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.9,
          }}
          className="mx-auto mt-8 max-w-2xl text-[11px] leading-5 text-slate-400 sm:text-xs"
        >
          Kết quả chỉ mang tính cảnh báo và hỗ trợ
          đánh giá rủi ro, không phải kết luận một
          cá nhân hoặc tổ chức là lừa đảo.
        </motion.p>
      </div>
    </section>
  )
}

export default HeroSearch