import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  motion,
  useInView,
} from 'motion/react'

import Container
  from '../layout/Container'

import {
  getPublicStats,
} from '../../services/statsService'

function AnimatedValue({
  value,
}) {
  const ref = useRef(null)

  const isInView = useInView(
    ref,
    {
      once: true,
      margin: '-60px',
    },
  )

  const [
    display,
    setDisplay,
  ] = useState('0')

  useEffect(() => {
    if (!isInView) {
      return
    }

    const target =
      Number(value)

    if (
      !Number.isFinite(target)
    ) {
      setDisplay('0')
      return
    }

    const duration = 1100
    const start =
      performance.now()

    let frame

    const tick = (now) => {
      const progress =
        Math.min(
          (now - start) /
            duration,
          1,
        )

      const eased =
        1 -
        Math.pow(
          1 - progress,
          3,
        )

      const current =
        Math.round(
          target * eased,
        )

      setDisplay(
        current.toLocaleString(
          'vi-VN',
        ),
      )

      if (progress < 1) {
        frame =
          requestAnimationFrame(
            tick,
          )
      }
    }

    frame =
      requestAnimationFrame(
        tick,
      )

    return () => {
      cancelAnimationFrame(
        frame,
      )
    }
  }, [
    isInView,
    value,
  ])

  return (
    <span ref={ref}>
      {display}
    </span>
  )
}

function SystemStats() {
  const [
    stats,
    setStats,
  ] = useState(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  useEffect(() => {
    const controller =
      new AbortController()

    let active = true

    async function loadStats() {
      try {
        const result =
          await getPublicStats({
            signal:
              controller.signal,
          })

        if (active) {
          setStats(result)
        }
      } catch (error) {
        if (
          active &&
          error.name !==
            'AbortError'
        ) {
          setStats(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadStats()

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  const items = [
    {
      id: 'searches',
      value:
        stats?.searches ?? 0,
      label: 'Lượt tra cứu',
    },
    {
      id: 'reports',
      value:
        stats?.reports ?? 0,
      label:
        'Báo cáo cộng đồng',
    },
    {
      id: 'alerts',
      value:
        stats?.alerts ?? 0,
      label:
        'Cảnh báo đang ghi nhận',
    },
    {
      id: 'feedbacks',
      value:
        stats?.communityFeedbacks ??
        0,
      label:
        'Lượt đóng góp cộng đồng',
    },
  ]

  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50/70">
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-px w-1/3 -translate-x-1/2 bg-blue-500/50"
        animate={{
          opacity: [
            0.2,
            1,
            0.2,
          ],
          scaleX: [
            0.5,
            1,
            0.5,
          ],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
        }}
      />

      <Container>
        <div className="grid grid-cols-2 md:grid-cols-4">
          {items.map(
            (
              stat,
              index,
            ) => (
              <motion.div
                key={stat.id}
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
                transition={{
                  duration: 0.5,
                  delay:
                    index *
                    0.08,
                }}
                whileHover={{
                  y: -4,
                }}
                className={`group relative px-2 py-8 text-center sm:px-4 sm:py-11 ${
                  index % 2 ===
                  0
                    ? 'border-r border-slate-200'
                    : ''
                } ${
                  index < 2
                    ? 'border-b border-slate-200 md:border-b-0'
                    : ''
                } ${
                  index !==
                  items.length -
                    1
                    ? 'md:border-r md:border-slate-200'
                    : 'md:border-r-0'
                }`}
              >
                <motion.div
                  aria-hidden="true"
                  className="absolute inset-x-4 bottom-0 h-px origin-center bg-blue-500"
                  initial={{
                    scaleX: 0,
                  }}
                  whileHover={{
                    scaleX: 1,
                  }}
                />

                <p className="text-2xl font-bold tracking-[-0.04em] text-slate-950 sm:text-3xl">
                  {loading ? (
                    <motion.span
                      animate={{
                        opacity: [
                          0.3,
                          1,
                          0.3,
                        ],
                      }}
                      transition={{
                        duration: 1,
                        repeat:
                          Infinity,
                      }}
                    >
                      —
                    </motion.span>
                  ) : (
                    <AnimatedValue
                      value={
                        stat.value
                      }
                    />
                  )}
                </p>

                <p className="mt-1.5 text-xs text-slate-500 sm:mt-2 sm:text-sm">
                  {stat.label}
                </p>
              </motion.div>
            ),
          )}
        </div>
      </Container>
    </section>
  )
}

export default SystemStats
