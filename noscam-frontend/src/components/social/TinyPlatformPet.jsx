import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

const PETS = ['nung']

const WORDS = {
  facebook: 'Anh/chị ơi, Follow Facebook bên em không tụt đâu nè! 💙',
  instagram: 'Bật mí nè! Follow Instagram Việt là hàng độc quyền bên em đó ạ! 💖',
  tiktok: 'Follow và View TikTok bên em siêu ít tụt luôn, anh/chị tham khảo nha! ✨',
}

const DEFAULT_WORD = 'Anh/chị khám phá dịch vụ ở đây nha! ✨'

const spring = { type: 'spring', stiffness: 240, damping: 18 }

function Mascot({ kind, phase, facing }) {
  const running = phase === 'run'
  const pointing = phase === 'point'
  const happy = phase === 'happy'

  const panda = kind === 'panda'
  const stitch = kind === 'stitch'

  const main = panda ? '#fffdf8' : stitch ? '#6bb5f5' : '#ffffff'
  const shade = panda ? '#f0eee9' : stitch ? '#3e91de' : '#f2f2f5'
  const dark = panda ? '#292b39' : stitch ? '#265f9e' : '#383744'

  const legA = running ? [-24, 26, -24] : [0, 0]
  const legB = running ? [26, -24, 26] : [0, 0]
  const armA = running ? [22, -22, 22] : [0, 0]
  const armB = pointing ? [-65, -50, -65] :
    running ? [-22, 22, -22] : [0, 0]

  const limb = {
    duration: running ? 0.32 : pointing ? 0.7 : 0.3,
    repeat: running || pointing ? Infinity : 0,
    ease: 'easeInOut',
  }

  return (
    <motion.svg
      width="64"
      height="78"
      viewBox="0 0 100 118"
      overflow="visible"
      aria-hidden="true"
      style={{ filter: 'drop-shadow(0 3px 2px rgba(15,23,42,.13))' }}
      animate={{
        scaleX: facing,
        y: running ? [0, -5, 0] : happy ? [0, -12, 0] : [0, -1, 0],
        rotate: running ? [-3, 3, -3] : [0, -3, 0, 3, 0],
      }}
      transition={{
        scaleX: { duration: 0.18 },
        y: {
          duration: running ? 0.32 : happy ? 0.6 : 2.8,
          repeat: Infinity,
        },
        rotate: {
          duration: running ? 0.32 : 3.2,
          repeat: Infinity,
        },
      }}
    >
      {/* Bóng dưới chân */}
      <ellipse cx="50" cy="114" rx="27" ry="3"
        fill="#64748b" opacity=".14" />

      {/* Chân trái */}
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: 'top center' }}
        animate={{ rotate: legA }}
        transition={limb}
      >
        <ellipse cx="37" cy="94" rx="12" ry="17"
          fill={panda ? '#30313b' : shade}
          stroke={dark} strokeWidth="2.4" />
        <ellipse cx="37" cy="102" rx="9" ry="5"
          fill={panda ? '#50515e' : main} opacity=".7" />
      </motion.g>

      {/* Chân phải */}
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: 'top center' }}
        animate={{ rotate: legB }}
        transition={limb}
      >
        <ellipse cx="63" cy="94" rx="12" ry="17"
          fill={panda ? '#30313b' : shade}
          stroke={dark} strokeWidth="2.4" />
        <ellipse cx="63" cy="102" rx="9" ry="5"
          fill={panda ? '#50515e' : main} opacity=".7" />
      </motion.g>

      {/* Thân tròn */}
      <ellipse cx="50" cy="77" rx="28" ry="30"
        fill={main} stroke={dark} strokeWidth="2.4" />

      <ellipse cx="50" cy="83" rx="19" ry="19"
        fill={panda ? '#fff' : stitch ? '#b8e4ff' : '#faf9fc'} />

      {/* Tay trái */}
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: 'top center' }}
        animate={{ rotate: armA }}
        transition={limb}
      >
        <ellipse cx="23" cy="77" rx="11" ry="18"
          transform="rotate(25 23 77)"
          fill={panda ? '#30313b' : main}
          stroke={dark} strokeWidth="2.4" />
        <circle cx="15" cy="86" r="7"
          fill={panda ? '#30313b' : main} />
      </motion.g>

      {/* Tay phải */}
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: 'top center' }}
        animate={{ rotate: armB }}
        transition={limb}
      >
        <ellipse cx="77" cy="77" rx="11" ry="18"
          transform="rotate(-25 77 77)"
          fill={panda ? '#30313b' : main}
          stroke={dark} strokeWidth="2.4" />
        <circle cx="85" cy="86" r="7"
          fill={panda ? '#30313b' : main} />
      </motion.g>

      {/* Tai và đặc điểm riêng */}
      {panda && (
        <>
          <circle cx="25" cy="25" r="16"
            fill="#30313b" stroke="#30313b" strokeWidth="2" />
          <circle cx="75" cy="25" r="16"
            fill="#30313b" stroke="#30313b" strokeWidth="2" />
          <circle cx="25" cy="25" r="7" fill="#555765" />
          <circle cx="75" cy="25" r="7" fill="#555765" />
        </>
      )}

      {stitch && (
        <>
          <motion.g
            style={{ transformOrigin: '29px 38px' }}
            animate={{ rotate: [-9, 12, -9] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <path d="M31 38 Q5 32 0 5 Q24 4 39 32 Z"
              fill="#4d9ee8" stroke={dark} strokeWidth="2.5" />
            <path d="M30 33 Q12 25 8 12 Q24 14 33 32 Z"
              fill="#f6a5c7" />
          </motion.g>

          <motion.g
            style={{ transformOrigin: '71px 38px' }}
            animate={{ rotate: [9, -12, 9] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <path d="M69 38 Q95 32 100 5 Q76 4 61 32 Z"
              fill="#4d9ee8" stroke={dark} strokeWidth="2.5" />
            <path d="M70 33 Q88 25 92 12 Q76 14 67 32 Z"
              fill="#f6a5c7" />
          </motion.g>
        </>
      )}

      {kind === 'nung' && (
        <>
          <ellipse cx="26" cy="32" rx="12" ry="16"
            fill="#fff" stroke={dark} strokeWidth="2.3" />
          <ellipse cx="74" cy="32" rx="12" ry="16"
            fill="#fff" stroke={dark} strokeWidth="2.3" />
          <ellipse cx="26" cy="32" rx="6" ry="9" fill="#f5dce6" />
          <ellipse cx="74" cy="32" rx="6" ry="9" fill="#f5dce6" />
        </>
      )}

      {/* Đầu mềm, to hơn thân */}
      <ellipse cx="50" cy="46"
        rx={stitch ? 37 : 36}
        ry={kind === 'nung' ? 34 : 32}
        fill={main}
        stroke={dark}
        strokeWidth="2.5"
      />

      {/* Phần mặt sáng */}
      <ellipse cx="50" cy="53" rx="29" ry="22"
        fill={panda ? '#fffefa' : stitch ? '#82c5fa' : '#fff'}
        opacity=".65"
      />

      {/* Mảng mắt Panda */}
      {panda && (
        <>
          <ellipse cx="35" cy="46" rx="12" ry="16"
            fill="#30313b" transform="rotate(13 35 46)" />
          <ellipse cx="65" cy="46" rx="12" ry="16"
            fill="#30313b" transform="rotate(-13 65 46)" />
        </>
      )}

      {/* Mắt to có ánh sáng */}
      <ellipse cx="36" cy="46"
        rx={stitch ? 10 : panda ? 6 : 8}
        ry={stitch ? 14 : panda ? 8 : 12}
        fill="#202433"
      />
      <ellipse cx="64" cy="46"
        rx={stitch ? 10 : panda ? 6 : 8}
        ry={stitch ? 14 : panda ? 8 : 12}
        fill="#202433"
      />

      <ellipse cx="33" cy="41" rx="4" ry="5" fill="white" />
      <ellipse cx="61" cy="41" rx="4" ry="5" fill="white" />
      <circle cx="40" cy="52" r="1.8" fill="#b9e7ff" />
      <circle cx="68" cy="52" r="1.8" fill="#b9e7ff" />

      {/* Má hồng */}
      <ellipse cx="21" cy="61" rx="9" ry="5"
        fill="#ffb4c9" opacity=".78" />
      <ellipse cx="79" cy="61" rx="9" ry="5"
        fill="#ffb4c9" opacity=".78" />

      {/* Mũi và miệng */}
      <ellipse cx="50" cy="59"
        rx={stitch ? 11 : 5}
        ry={stitch ? 7 : 4}
        fill={stitch ? '#233b65' : '#41404a'}
      />

      <path d="M42 67 Q50 74 58 67"
        fill="none" stroke={dark}
        strokeWidth="2.2" strokeLinecap="round" />

      {/* Nơ đỏ Stitch */}
      {stitch && (
        <g transform="translate(50 82)">
          <path d="M0 0 Q-16 -15 -21 -7 Q-23 5 0 5 Z"
            fill="#a51c40" />
          <path d="M0 0 Q16 -15 21 -7 Q23 5 0 5 Z"
            fill="#a51c40" />
          <ellipse cx="0" cy="0" rx="5" ry="6"
            fill="#dc4162" />
        </g>
      )}

      {/* Má phúng phính của Nũng Nịu */}
      {kind === 'nung' && (
        <>
          <ellipse cx="28" cy="68" rx="13" ry="7"
            fill="#fff" stroke="#dedee4" strokeWidth="1.2" />
          <ellipse cx="72" cy="68" rx="13" ry="7"
            fill="#fff" stroke="#dedee4" strokeWidth="1.2" />
        </>
      )}
    </motion.svg>
  )
}

export default function TinyPlatformPet() {
  const reduceMotion = useReducedMotion()
  const areaRef = useRef(null)
  const [peek, setPeek] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (reduceMotion) return undefined

    let active = true
    let timer
    let hideTimer

    const cycle = (delay = 1800) => {
      timer = window.setTimeout(() => {
        if (!active) return

        const area = areaRef.current
        const grid = area?.nextElementSibling
        const cards = Array.from(grid?.children || [])

        if (!area || !cards.length || document.hidden) {
          cycle(2500)
          return
        }

        const card = cards[Math.floor(Math.random() * cards.length)]
        const rect = card.getBoundingClientRect()
        const parent = area.getBoundingClientRect()

        // Chỉ đặt đầu bé ở phía TRÊN ô, không che nội dung.
        const x = rect.left - parent.left + rect.width / 2 - 25
        const y = rect.top - parent.top - 49

        const platform =
          card.getAttribute('data-platform')?.toLowerCase()
          || card.textContent?.toLowerCase().match(
            /facebook|instagram|tiktok/
          )?.[0]

        setPeek({
          x,
          y,
          message: WORDS[platform] || DEFAULT_WORD,
        })
        setVisible(true)

        hideTimer = window.setTimeout(() => {
          if (!active) return
          setVisible(false)
          cycle(8000 + Math.random() * 7000)
        }, 4200)
      }, delay)
    }

    cycle()

    return () => {
      active = false
      window.clearTimeout(timer)
      window.clearTimeout(hideTimer)
    }
  }, [reduceMotion])

  if (reduceMotion) return null

  return (
    <div
      ref={areaRef}
      data-noscam-platform-mascot="true"
      aria-hidden="true"
      className="pointer-events-none relative h-0 w-full overflow-visible"
    >
      {peek && (
        <motion.div
          className="pointer-events-none absolute left-0 top-0 z-20"
          style={{ x: peek.x, y: peek.y }}
          initial={false}
          animate={{
            opacity: visible ? 1 : 0,
            translateY: visible ? 0 : 34,
          }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          {/* Chỉ hiển thị phần đầu của Nũng Nĩnh */}
          <div className="relative h-[49px] w-[50px] overflow-hidden">
            <motion.div
              animate={visible ? { y: [0, -2, 0] } : { y: 0 }}
              transition={{
                duration: 1.8,
                repeat: visible ? Infinity : 0,
              }}
              style={{
                position: 'absolute',
                left: -7,
                top: -5,
                width: 64,
                height: 78,
              }}
            >
              <Mascot kind="nung" phase="rest" facing={1} />
            </motion.div>
          </div>

          {/* Bong bóng nằm trên đầu, không đè lên ô */}
          <motion.div
            className="absolute bottom-[55px] left-1/2 w-[min(205px,calc(100vw-36px))] -translate-x-1/2 rounded-2xl border border-blue-100 bg-white px-3 py-2 text-center text-[11px] font-semibold leading-snug text-blue-700 shadow-md sm:text-xs"
            initial={false}
            animate={{
              opacity: visible ? 1 : 0,
              scale: visible ? 1 : 0.92,
            }}
            transition={{ duration: 0.3 }}
          >
            {peek.message}
            <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-blue-100 bg-white" />
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

export function ChatMascotPeek({ open }) {
  const reduceMotion = useReducedMotion()
  const [visible, setVisible] = useState(false)
  const [platformVisible, setPlatformVisible] = useState(true)

  useEffect(() => {
    const target = document.querySelector(
      '[data-noscam-platform-mascot="true"]'
    )

    if (!target) {
      setPlatformVisible(false)
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => setPlatformVisible(entry.isIntersecting),
      { threshold: 0.01 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (open || platformVisible || reduceMotion) {
      setVisible(false)
      return undefined
    }

    let timer
    let hideTimer
    let active = true

    const schedule = () => {
      timer = window.setTimeout(() => {
        if (!active) return

        if (document.hidden) {
          schedule()
          return
        }

        setVisible(true)

        hideTimer = window.setTimeout(() => {
          if (!active) return
          setVisible(false)
          schedule()
        }, 4200)
      }, 30000 + Math.random() * 15000)
    }

    schedule()

    return () => {
      active = false
      window.clearTimeout(timer)
      window.clearTimeout(hideTimer)
      setVisible(false)
    }
  }, [open, platformVisible, reduceMotion])

  if (open || platformVisible || reduceMotion) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-[58px] right-0 z-10 w-[min(230px,calc(100vw-28px))]"
    >
      <motion.div
        initial={false}
        animate={{
          opacity: visible ? 1 : 0,
          y: visible ? 0 : 85,
          scale: visible ? 1 : 0.85,
        }}
        transition={{ duration: 0.55, ease: 'easeInOut' }}
        className="flex flex-col items-end gap-1"
      >
        <div className="relative w-full rounded-2xl border border-blue-100 bg-white px-3 py-2 text-center text-[11px] font-semibold leading-relaxed text-blue-700 shadow-lg sm:text-xs">
          Anh/chị cần tư vấn thì nhắn tụi em ngay đây nha! 💌
          <span className="absolute -bottom-1.5 right-7 h-3 w-3 rotate-45 border-b border-r border-blue-100 bg-white" />
        </div>

        <div className="mr-1">
          <Mascot kind="nung" phase="happy" facing={1} />
        </div>
      </motion.div>
    </div>
  )
}
