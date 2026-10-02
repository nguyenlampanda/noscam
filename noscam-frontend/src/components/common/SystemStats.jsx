import {
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  motion,
  useInView,
} from 'motion/react'

import Container from '../layout/Container'
import { homeStats } from '../../data/homeStats'

function AnimatedValue({ value }) {
  const ref = useRef(null)

  const isInView = useInView(
    ref,
    {
      once: true,
      margin: '-60px',
    },
  )

  const [display, setDisplay] =
    useState(value)

  useEffect(() => {
    if (!isInView) {
      return
    }

    const raw = String(value)

    const match = raw.match(
      /([\d,.]+)/,
    )

    if (!match) {
      return
    }

    const numericString =
      match[1].replace(/[,.]/g, '')

    const target =
      Number(numericString)

    if (!Number.isFinite(target)) {
      return
    }

    const prefix =
      raw.slice(
        0,
        match.index,
      )

    const suffix =
      raw.slice(
        match.index +
          match[1].length,
      )

    const duration = 1100
    const start = performance.now()

    let frame

    const tick = (now) => {
      const progress = Math.min(
        (now - start) / duration,
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
        `${prefix}${current.toLocaleString(
          'vi-VN',
        )}${suffix}`,
      )

      if (progress < 1) {
        frame =
          requestAnimationFrame(
            tick,
          )
      }
    }

    frame =
      requestAnimationFrame(tick)

    return () =>
      cancelAnimationFrame(frame)
  }, [isInView, value])

  return (
    <span ref={ref}>
      {display}
    </span>
  )
}

function SystemStats() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50/70">
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-px w-1/3 -translate-x-1/2 bg-blue-500/50"
        animate={{
          opacity: [0.2, 1, 0.2],
          scaleX: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
        }}
      />

      <Container>
        <div className="grid grid-cols-2 md:grid-cols-4">
          {homeStats.map(
            (stat, index) => (
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
                    index * 0.08,
                }}
                whileHover={{
                  y: -4,
                }}
                className={`group relative px-2 py-8 text-center sm:px-4 sm:py-11 ${
                  index % 2 === 0
                    ? 'border-r border-slate-200'
                    : ''
                } ${
                  index < 2
                    ? 'border-b border-slate-200 md:border-b-0'
                    : ''
                } ${
                  index !==
                  homeStats.length - 1
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
                  <AnimatedValue
                    value={
                      stat.value
                    }
                  />
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