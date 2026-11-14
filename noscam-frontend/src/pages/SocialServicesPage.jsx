import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Link,
  useNavigate,
} from 'react-router-dom'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'motion/react'
import PlatformIcon from '../components/social/PlatformIcon'
import TinyPlatformPet from '../components/social/TinyPlatformPet'
import SocialGuideModal from '../components/social/SocialGuideModal'
import customerService, {
  getCustomerToken,
} from '../services/customerService'

function readWalletBalance(response) {
  const value = response?.data?.balance
  if (value === null || value === undefined || value === '') {
    return null
  }
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? amount : null
}

function money(value) {
  return `${Math.round(
    Number(value || 0),
  ).toLocaleString('vi-VN')}đ`
}

function moneyUnit(value) {
  const amount = Number(value || 0)

  if (!Number.isFinite(amount)) return '0đ'

  return `${amount.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })}đ`
}

function createKey() {
  if (
    typeof crypto !== 'undefined' &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`
}

function isFacebookLikeService(service) {
  if (!service) return false

  const platform = String(service.platform || '').toLowerCase()
  const category = String(service.category || '').toLowerCase()
  const code = String(service.code || '').toUpperCase()
  const name = String(service.name || '').toUpperCase()

  return (
    platform === 'facebook' &&
    (
      category === 'like' ||
      category === 'reaction' ||
      code.includes('BUFF_LIKE') ||
      name.includes('BUFF LIKE')
    )
  )
}

function getOrderKey(serviceId, target, quantity, options = {}) {
  const fingerprint = JSON.stringify([
    String(serviceId),
    String(target).trim(),
    Number(quantity),
    options.reaction || '',
    options.comments || '',
  ])

  const storageKey = 'noscam-social-pending-order'

  try {
    const previous = JSON.parse(
      sessionStorage.getItem(storageKey) || 'null',
    )

    if (
      previous?.fingerprint === fingerprint &&
      previous?.key
    ) {
      return previous.key
    }

    const key = createKey()

    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ fingerprint, key }),
    )

    return key
  } catch {
    return createKey()
  }
}

const platformLabels = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  threads: 'Threads',
  youtube: 'YouTube',
  telegram: 'Telegram',
  twitter: 'X (Twitter)',
  discord: 'Discord',
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  pinterest: 'Pinterest',
  linkedin: 'LinkedIn',
  twitch: 'Twitch',
  reddit: 'Reddit',
  snapchat: 'Snapchat',
  whatsapp: 'WhatsApp',
  zalo: 'Zalo',
  other: 'Khác',
}

const platformOptions = Object.entries(platformLabels).map(
  ([value, label]) => ({ value, label })
)

const categoryLabels = {
  follow: 'Follow / Followers',
  like: 'Like',
  view: 'View',
  comment: 'Comment',
  share: 'Share',
  repost: 'Repost',
  reaction: 'Reaction',
  member: 'Member',
  save: 'Save',
  other: 'Khác',
}


// NOSCAM_SOCIAL_ANIMATIONS_V1
// NOSCAM_INTERACTION_UI_V2
function AnimatedCategoryIcon({ category, className = '' }) {
  const type = String(category || '').toLowerCase()

  const paths = {
    follow: (
      <>
        <circle cx="10" cy="8" r="3" />
        <path d="M4 20v-2a6 6 0 0 1 12 0v2" />
        <path d="M19 8v6M16 11h6" />
      </>
    ),
    like: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
    ),
    repost: (
      <>
        <path d="M4 7h14l-3-3m3 3-3 3" />
        <path d="M20 17H6l3-3m-3 3 3 3" />
      </>
    ),
    share: (
      <>
        <path d="M12 16V3m0 0L7 8m5-5 5 5" />
        <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
      </>
    ),
    comment: (
      <>
        <path d="M20 11.5a8 8 0 0 1-8 8 8.5 8.5 0 0 1-3.5-.8L4 20l1.3-4.5A8 8 0 1 1 20 11.5Z" />
        <path d="M8 12h.01M12 12h.01M16 12h.01" strokeWidth="3" strokeLinecap="round" />
      </>
    ),
    view: (
      <>
        <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    reaction: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 14c1 3 7 3 8 0M8.5 9h.01M15.5 9h.01" />
      </>
    ),
    member: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5" />
      </>
    ),
    save: (
      <path d="M6 3h12v18l-6-4-6 4V3Z" />
    ),
  }

  return (
    <motion.span
      className={`inline-flex items-center justify-center ${className}`}
      initial={false}
      whileHover={{ scale: 1.12, rotate: type === 'share' ? 8 : 0 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      aria-hidden="true"
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths[type] || <circle cx="12" cy="12" r="8" />}
      </svg>
    </motion.span>
  )
}


// NOSCAM_CHANNEL_REACTION_V3
function supportsChannelReaction(service) {
  if (!service) return false

  const code = String(service.code || '').toUpperCase()
  const name = String(service.name || '').toUpperCase()
  const platform = String(service.platform || '').toLowerCase()

  if (platform !== 'facebook') return false

  // Kênh 4 chỉ hỗ trợ LIKE.
  if (
    code === 'FACEBOOK_LIKE_BUFF_LIKE_VIET_KENH_4' ||
    (name.includes('BUFF LIKE') && /KÊNH\s*4\b/.test(name))
  ) {
    return false
  }

  // Kênh 1 hỗ trợ 7 cảm xúc.
  if (
    code === 'FACEBOOK_LIKE_BUFF_LIKE_KENH_1' ||
    (name.includes('BUFF LIKE') && /KÊNH\s*1\b/.test(name))
  ) {
    return true
  }

  return isFacebookLikeService(service)
}

export default function SocialServicesPage() {
  // NOSCAM_SOCIAL_GUIDE_V2
  const [guideOpen, setGuideOpen] = useState(false)
  const navigate = useNavigate()
  // NOSCAM_SOCIAL_MOTION_V3
  const reduceMotion = useReducedMotion()
  const rise = (delay = 0) => reduceMotion
    ? { initial: false, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] },
      }
  const hoverLift = reduceMotion
    ? {}
    : { whileHover: { y: -3 }, whileTap: { scale: 0.985 } }

  const [services, setServices] =
    useState([])

  const [platform, setPlatform] =
    useState('')

  const [category, setCategory] =
    useState('')

  const [categoryOpen, setCategoryOpen] =
    useState(false)

  const [selectedId, setSelectedId] =
    useState('')

  const [serviceOpen, setServiceOpen] =
    useState(false)

  const [target, setTarget] =
    useState('')

  const [comments, setComments] = useState('')
  const [reaction, setReaction] = useState('LIKE')

  const [quantity, setQuantity] =
    useState('')

  const [balance, setBalance] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [submitting, setSubmitting] =
    useState(false)

  const [error, setError] =
    useState('')

  const [confirmOpen, setConfirmOpen] =
    useState(false)

  const [invalidFields, setInvalidFields] = useState([])

  useEffect(() => {
    if (!invalidFields.length) return
    const timer = setTimeout(() => setInvalidFields([]), 3000)
    return () => clearTimeout(timer)
  }, [invalidFields])

  function highlightInvalid(fields) {
    setInvalidFields([...fields])
    requestAnimationFrame(() => {
      const first = fields[0]
      const element = document.querySelector(
        '[data-order-field="' + first + '"]'
      )
      element?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    })
  }

  const isLoggedIn =
    Boolean(getCustomerToken())

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')

      try {
        const response =
          await customerService.services({})

        if (!active) return

        setServices(
          response?.data || [],
        )
      } catch (err) {
        if (active) {
          setError(
            err?.message ||
              'Không tải được dịch vụ.',
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    if (!isLoggedIn) {
      setBalance(null)
      return undefined
    }

    customerService
      .wallet()
      .then((response) => {
        if (!active) return

        setBalance(readWalletBalance(response))
      })
      .catch(() => {
        if (active) {
          setBalance(null)
        }
      })

    return () => {
      active = false
    }
  }, [isLoggedIn])

  const availablePlatforms =
    useMemo(() => {
      const values = [
        ...new Set(
          services
            .map((item) =>
              String(item.platform || '').trim().toLowerCase()
            )
            .filter(Boolean)
        ),
      ]

      return values.map((value) => ({
        value,
        label: platformLabels[value] ||
          value.charAt(0).toUpperCase() + value.slice(1),
      }))
    }, [services])

  const platformServices =
    useMemo(() => {
      if (!platform) return []

      return services.filter(
        (item) =>
          item.platform === platform,
      )
    }, [services, platform])

  const availableCategories =
    useMemo(() => {
      return [
        ...new Set(
          platformServices
            .map(
              (item) =>
                String(
                  item.category ||
                    'other',
                ).toLowerCase(),
            )
            .filter(Boolean),
        ),
      ]
    }, [platformServices])

  const categoryServices =
    useMemo(() => {
      if (
        !platform ||
        !category
      ) {
        return []
      }

      return platformServices.filter(
        (item) =>
          String(
            item.category ||
              'other',
          ).toLowerCase() ===
          category,
      )
    }, [
      platformServices,
      platform,
      category,
    ])

  const selected = useMemo(
    () =>
      services.find(
        (item) =>
          String(item.id) ===
          String(selectedId),
      ),
    [services, selectedId],
  )

  const requiresComments =
    String(selected?.category || '')
      .trim()
      .toLowerCase() === 'comment'

  const commentLines = comments
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const numericQuantity = requiresComments
    ? commentLines.length
    : Number(quantity) || 0

  const total = useMemo(() => {
    if (
      !selected ||
      numericQuantity <= 0
    ) {
      return 0
    }

    return (
      Number(
        selected.sell_price_per_1000,
      ) *
      numericQuantity /
      1000
    )
  }, [
    selected,
    numericQuantity,
  ])

  const insufficient =
    isLoggedIn &&
    balance !== null &&
    total > balance

  const missingAmount =
    insufficient
      ? total - balance
      : 0

  const categoryMeta = {
    follow: {
      label: 'Follow / Followers',
      icon: '♟',
      color: 'blue',
      description:
        'Tăng người theo dõi cho tài khoản, trang hoặc kênh.',
    },
    like: {
      label: 'Like',
      icon: '♥',
      color: 'pink',
      description:
        'Tăng lượt thích cho bài viết, ảnh hoặc video.',
    },
    view: {
      label: 'View',
      icon: '▶',
      color: 'purple',
      description:
        'Tăng lượt xem cho video, reel hoặc story.',
    },
    comment: {
      label: 'Comment',
      icon: '●',
      color: 'cyan',
      description:
        'Tăng bình luận cho bài viết hoặc video.',
    },
    repost: {
      label: 'Repost',
      icon: '↻',
      color: 'cyan',
      description:
        'Tăng lượt đăng lại bài viết hoặc video.',
    },
    share: {
      label: 'Share',
      icon: '↗',
      color: 'orange',
      description:
        'Tăng lượt chia sẻ.',
    },
    reaction: {
      label: 'Reaction',
      icon: '♥',
      color: 'amber',
      description:
        'Tăng lượt cảm xúc.',
    },
    member: {
      label: 'Member',
      icon: '♙',
      color: 'emerald',
      description:
        'Tăng thành viên cho nhóm hoặc cộng đồng.',
    },
    save: {
      label: 'Save',
      icon: '★',
      color: 'violet',
      description:
        'Tăng lượt lưu nội dung.',
    },
    other: {
      label: 'Khác',
      icon: '＋',
      color: 'slate',
      description:
        'Các dịch vụ tương tác khác.',
    },
  }

  function categoryColors(value) {
    const color =
      getCategoryMeta(value).color

    const colors = {
      blue: {
        icon: 'bg-blue-100 text-blue-600',
        active: 'bg-blue-50',
        text: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-600',
        check: 'bg-blue-600',
      },
      pink: {
        icon: 'bg-pink-100 text-pink-600',
        active: 'bg-pink-50',
        text: 'text-pink-600',
        badge: 'bg-pink-100 text-pink-600',
        check: 'bg-pink-500',
      },
      purple: {
        icon: 'bg-purple-100 text-purple-600',
        active: 'bg-purple-50',
        text: 'text-purple-600',
        badge: 'bg-purple-100 text-purple-600',
        check: 'bg-purple-600',
      },
      cyan: {
        icon: 'bg-cyan-100 text-cyan-600',
        active: 'bg-cyan-50',
        text: 'text-cyan-600',
        badge: 'bg-cyan-100 text-cyan-600',
        check: 'bg-cyan-600',
      },
      orange: {
        icon: 'bg-orange-100 text-orange-600',
        active: 'bg-orange-50',
        text: 'text-orange-600',
        badge: 'bg-orange-100 text-orange-600',
        check: 'bg-orange-500',
      },
      amber: {
        icon: 'bg-amber-100 text-amber-600',
        active: 'bg-amber-50',
        text: 'text-amber-600',
        badge: 'bg-amber-100 text-amber-600',
        check: 'bg-amber-500',
      },
      emerald: {
        icon: 'bg-emerald-100 text-emerald-600',
        active: 'bg-emerald-50',
        text: 'text-emerald-600',
        badge: 'bg-emerald-100 text-emerald-600',
        check: 'bg-emerald-600',
      },
      violet: {
        icon: 'bg-violet-100 text-violet-600',
        active: 'bg-violet-50',
        text: 'text-violet-600',
        badge: 'bg-violet-100 text-violet-600',
        check: 'bg-violet-600',
      },
      slate: {
        icon: 'bg-slate-100 text-slate-600',
        active: 'bg-slate-50',
        text: 'text-slate-700',
        badge: 'bg-slate-100 text-slate-600',
        check: 'bg-slate-600',
      },
    }

    return colors[color] || colors.slate
  }

  function getCategoryMeta(value) {
    return (
      categoryMeta[value] || {
        label:
          categoryLabels[value] ||
          value,
        icon: '＋',
        description:
          'Dịch vụ tương tác.',
      }
    )
  }

  function categoryCount(value) {
    return platformServices.filter(
      (item) =>
        String(
          item.category ||
            'other',
        ).toLowerCase() ===
        value,
    ).length
  }

  function changePlatform(value) {
    setPlatform(value)
    setCategory('')
    setCategoryOpen(false)
    setServiceOpen(false)
    setSelectedId('')
    setTarget('')
    setComments('')
    setReaction('LIKE')
    setQuantity('')
    setError('')
  }

  function changeCategory(value) {
    setCategory(value)
    setCategoryOpen(false)
    setServiceOpen(false)
    setSelectedId('')
    setTarget('')
    setComments('')
    setReaction('LIKE')
    setQuantity('')
    setError('')
  }

  function changeService(value) {
    setSelectedId(value)
    setServiceOpen(false)
    setTarget('')
    setComments('')
    setReaction('LIKE')
    setError('')

    const service =
      services.find(
        (item) =>
          String(item.id) ===
          String(value),
      )

    setQuantity(
      service
        ? String(
            service.min_quantity ||
              1,
          )
        : '',
    )
  }

  function getServiceUnit(service) {
    const name = String(
      service?.name || service?.title || ''
    ).toLowerCase()

    if (/follow|follower|theo dõi/.test(name)) return 'follow'
    if (/like|thích/.test(name)) return 'like'
    if (/view|xem/.test(name)) return 'view'
    if (/comment|bình luận/.test(name)) return 'comment'
    if (/repost|đăng lại/.test(name)) return 'repost'
    if (/share|chia sẻ/.test(name)) return 'share'
    if (/save|lưu bài/.test(name)) return 'save'
    if (/subscribe|subscriber|đăng ký/.test(name)) return 'subscribe'
    if (/reaction|cảm xúc/.test(name)) return 'reaction'
    if (/member|thành viên/.test(name)) return 'member'
    if (/vote|bình chọn/.test(name)) return 'vote'
    if (/click|nhấp/.test(name)) return 'click'

    return 'lượt'
  }

  function prepareOrder(event) {
    event.preventDefault()
    setError('')

    if (!isLoggedIn) {
      navigate('/login')
      return
    }

    const invalid = []

    if (!selected) invalid.push('service')
    if (
      !target.trim() ||
      !/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(target.trim())
    ) invalid.push('target')
    if (requiresComments && commentLines.length === 0) {
      invalid.push('comments')
    }

    if (selected && (
      !Number.isFinite(numericQuantity) ||
      numericQuantity < Number(selected.min_quantity) ||
      numericQuantity > Number(selected.max_quantity)
    )) {
      invalid.push('quantity')
    }

    if (invalid.length) {
      highlightInvalid(invalid)
    }

    if (!selected) {
      setError(
        'Vui lòng chọn dịch vụ.',
      )
      return
    }

    if (!target.trim()) {
      setError(
        'Vui lòng nhập link, username hoặc ID.',
      )
      return
    }

    if (requiresComments && commentLines.length === 0) {
      setError('Vui lòng nhập nội dung bình luận.')
      return
    }

    if (
      numericQuantity <
        Number(
          selected.min_quantity,
        ) ||
      numericQuantity >
        Number(
          selected.max_quantity,
        )
    ) {
      setError(
        `Số lượng phải từ ${Number(
          selected.min_quantity,
        ).toLocaleString(
          'vi-VN',
        )} đến ${Number(
          selected.max_quantity,
        ).toLocaleString(
          'vi-VN',
        )}.`,
      )
      return
    }

    if (balance === null) {
      setError(
        'Không kiểm tra được số dư.',
      )
      return
    }

    if (insufficient) {
      return
    }

    if (
      !/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(target.trim())
    ) {
      highlightInvalid(['target'])
      setError('Link không hợp lệ. Vui lòng nhập đường dẫn đầy đủ.')
      return
    }

    setConfirmOpen(true)
  }

  const [adminNotice, setAdminNotice] =
    useState(false)
  const [orderResult, setOrderResult] = useState(null)
  const orderSubmittingRef = useRef(false)

  async function confirmOrder() {
    if (
      orderSubmittingRef.current ||
      submitting ||
      !selected
    ) {
      return
    }

    orderSubmittingRef.current = true
    setOrderResult(null)
    setSubmitting(true)
    setError('')

    try {
      const isFacebookReaction =
        supportsChannelReaction(selected)

      const orderOptions = {
        ...(requiresComments
          ? { comments: commentLines.join('\n') }
          : {}),
        ...(isFacebookReaction
          ? { reaction }
          : {}),
      }

      await customerService.createOrder({
        service_id: selected.id,
        ...orderOptions,
        target: target.trim(),
        quantity:
          numericQuantity,
        idempotency_key:
          getOrderKey(
            selected.id,
            target,
            numericQuantity,
            orderOptions,
          ),
      })

      try {
        sessionStorage.removeItem(
          'noscam-social-pending-order',
        )
      } catch {
        // Storage không khả dụng.
      }

      window.dispatchEvent(
        new Event(
          'noscam-customer-updated',
        ),
      )

      setConfirmOpen(false)

      let updatedBalance = null
      try {
        const walletResponse = await customerService.wallet()
        const walletValue = readWalletBalance(walletResponse)
        if (walletValue !== null) {
          updatedBalance = walletValue
          setBalance(walletValue)
        }
      } catch {
        // Không suy đoán số dư nếu API ví lỗi.
      }

      setOrderResult({
        type: 'success',
        balance: updatedBalance,
      })
    } catch (err) {
      setConfirmOpen(false)

      const message =
        err?.message ||
        'Không tạo được đơn.'

      if (
        message.includes(
          'Vui lòng liên hệ Admin',
        )
      ) {
        setError('')
        setAdminNotice(true)
      } else {
        setError(message)
        const uncertain = !err?.status || Number(err.status) >= 500
        setOrderResult({
          type: 'error',
          message: uncertain
            ? 'Chưa xác định được kết quả tạo đơn. Vui lòng kiểm tra lịch sử đơn hàng hoặc liên hệ hỗ trợ trước khi thử lại, để tránh đặt trùng.'
            : message,
        })
      }

      try {
        const response =
          await customerService.wallet()

        setBalance(readWalletBalance(response))
      } catch {
        // Giữ lỗi đặt đơn.
      }
    } finally {
      orderSubmittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <>
      <main className="bg-white min-h-screen px-3 py-4 sm:px-5 sm:py-8 md:py-12">
        <div className="mx-auto max-w-6xl">

  {/* NOSCAM SOCIAL HOMEPAGE REDESIGN */}
          <motion.section
            {...rise(0)}
            className="relative isolate overflow-hidden rounded-[20px] sm:rounded-[26px] bg-gradient-to-br from-slate-950 via-[#10265c] to-blue-700 px-3 py-4 text-white shadow-2xl shadow-blue-950/15 sm:px-10 sm:py-10 md:py-12"
          >
            <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative z-10 grid items-center gap-3 sm:gap-8 lg:grid-cols-[1.3fr_0.7fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-white/10 px-3 py-1 text-[10px] sm:px-4 sm:py-2 sm:text-xs font-bold tracking-widest text-blue-100">
                  <span className="h-2 w-2 rounded-full bg-cyan-300" />
                  NOSCAM SOCIAL
                </div>

                <h1 className="mt-2 max-w-2xl text-[22px] font-black leading-[1.2] sm:mt-6 sm:text-5xl tracking-tight sm:text-5xl">
                  Tăng tương tác
                  <span className="mt-1 block bg-gradient-to-r from-blue-200 to-cyan-300 bg-clip-text text-transparent">
                    mạng xã hội dễ dàng hơn
                  </span>
                </h1>

                <p className="mt-2 max-w-xl text-[12px] leading-5 text-blue-100/85 sm:mt-5 sm:text-base sm:leading-8">
                  Tăng người theo dõi, lượt thích và lượt xem
                  trên nhiều nền tảng mạng xã hội.
                  Chọn dịch vụ, nhập liên kết và đặt hàng
                  chỉ với vài bước đơn giản.
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3">
                  <a
                    href="#tao-don"
                    className="inline-flex min-w-0 min-h-11 items-center justify-center rounded-xl sm:min-h-12 sm:rounded-2xl bg-white px-2 py-2.5 text-[11px] leading-tight whitespace-nowrap sm:px-6 sm:py-3 sm:text-sm sm:px-6 sm:py-3 sm:text-sm font-black text-blue-700 shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <span className="sm:hidden">Tạo đơn</span><span className="hidden sm:inline">Tạo đơn ngay ↓</span>
                  </a>

                  <Link
                    to="/my-orders"
                    className="inline-flex min-w-0 min-h-11 items-center justify-center rounded-xl sm:min-h-12 sm:rounded-2xl border border-white/30 bg-white/10 px-2 py-2.5 text-[11px] leading-tight whitespace-nowrap sm:px-6 sm:py-3 sm:text-sm sm:px-6 sm:py-3 sm:text-sm font-bold text-white transition hover:bg-white/20"
                  >
                    <span className="sm:hidden">Lịch sử</span><span className="hidden sm:inline">Xem đơn hàng</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isLoggedIn) {
                        navigate('/login')
                        return
                      }
                      setGuideOpen(true)
                    }}
                    className="inline-flex min-w-0 min-h-11 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-2 py-2.5 text-[11px] leading-tight whitespace-nowrap sm:px-6 sm:py-3 sm:text-sm sm:px-6 sm:py-3 sm:text-sm font-bold text-white transition hover:bg-white/20 sm:min-h-12 sm:rounded-2xl"
                  >
                    
                    <span className="sm:hidden">Hướng dẫn</span><span className="hidden sm:inline">Hướng dẫn sử dụng</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-4">
                <motion.div
                  {...hoverLift}
                  className="rounded-2xl border border-white/20 bg-white/10 p-3 sm:rounded-3xl sm:p-6 shadow-xl backdrop-blur-md"
                >
                  <div className="text-xs font-bold uppercase tracking-widest text-blue-200">
                    {isLoggedIn ? 'Số dư ví của bạn' : 'Bắt đầu sử dụng'}
                  </div>

                  {isLoggedIn ? (
                    <>
                      <div className="mt-1 break-all text-xl font-black sm:mt-3 sm:text-3xl">
                        {balance === null ? '...' : money(balance)}
                      </div>
                      <p className="mt-2 hidden text-sm text-blue-100/80 sm:block">
                        Dùng số dư để thanh toán đơn hàng.
                      </p>
                      <Link
                        to="/wallet"
                        className="mt-2 inline-flex rounded-lg bg-blue-500 px-3 py-1.5 text-xs sm:mt-5 sm:rounded-xl sm:px-5 sm:py-3 sm:text-sm sm:mt-5 sm:px-5 sm:py-3 text-sm font-bold text-white transition hover:bg-blue-400"
                      >
                        Nạp tiền vào ví →
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="mt-3 text-lg font-bold">
                        Đăng nhập để quản lý đơn hàng
                      </p>
                      <Link
                        to="/login"
                        className="mt-2 inline-flex rounded-lg bg-blue-500 px-3 py-1.5 text-xs sm:mt-5 sm:rounded-xl sm:px-5 sm:py-3 sm:text-sm sm:mt-5 sm:px-5 sm:py-3 text-sm font-bold text-white transition hover:bg-blue-400"
                      >
                        Đăng nhập →
                      </Link>
                    </>
                  )}
                </motion.div>

                <div className="grid grid-cols-6 gap-1 sm:grid-cols-4 lg:grid-cols-6 sm:gap-3">
                  {availablePlatforms.map((item) => (
                    <div
                      key={item.value}
                      className="flex flex-col items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-1 py-2 sm:rounded-2xl sm:px-2 sm:py-4 backdrop-blur-sm"
                    >
                      <PlatformIcon
                        platform={item.value}
                        className="h-6 w-6 sm:h-8 sm:w-8"
                      />
                      <span className="text-[9px] sm:text-xs font-bold">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>



          {error && (
            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 font-semibold text-red-600">
              {error}
            </div>
          )}

          <motion.form
            noValidate
                    id="tao-don"
            {...rise(0.09)}
            onSubmit={(event) => {
              if (guideOpen) {
                event.preventDefault()
                event.stopPropagation()
                return
              }
              prepareOrder(event)
            }}
            className="relative isolate mt-3 rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm sm:mt-5 sm:rounded-[24px] sm:p-6 md:p-8"
          >
            {/* NOSCAM_ORDER_LOGIN_GATE_V1 */}
            <fieldset
              disabled={!isLoggedIn}
              className={
                !isLoggedIn
                  ? 'min-w-0 pointer-events-none select-none opacity-35 blur-[1.5px]'
                  : 'min-w-0'
              }
            >



            {loading ? (
              <div className="rounded-2xl bg-slate-50 p-10 text-center text-slate-400">
                Đang tải dịch vụ...
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="mb-3 block text-sm font-black text-slate-700">
                    1. Chọn nền tảng
                  </label>

                  <TinyPlatformPet selected={platform} />
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-3">
                    {availablePlatforms.map(
                      (item) => {
                        const active =
                          platform ===
                          item.value

                        const count =
                          services.filter(
                            (service) =>
                              service.platform ===
                              item.value,
                          ).length

                        return (
                          <motion.button
                            type="button"
                            key={item.value}
                            {...rise(0.13 + platformOptions.findIndex((p) => p.value === item.value) * 0.055)}
                            {...(reduceMotion ? {} : {
                              whileHover: { y: -4, scale: 1.015, boxShadow: '0 12px 28px rgba(15,23,42,0.10)' },
                              whileTap: { scale: 0.98 },
                            })}
                            onClick={() => {
                              changePlatform(item.value)
                              window.setTimeout(() => {
                                const target = document.getElementById('chon-loai-dich-vu')
                                if (target) {
                                  const top = target.getBoundingClientRect().top
                                    + window.scrollY - 360
                                  window.scrollTo({
                                    top: Math.max(0, top),
                                    behavior: 'smooth',
                                  })
                                }
                              }, 180)
                            }}
                            className={`relative flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border p-2 text-center transition sm:flex-row sm:justify-start sm:gap-3 sm:rounded-2xl sm:p-4 sm:text-left ${
                              active
                                ? item.value === 'facebook'
                                  ? 'border-[#1877F2] bg-blue-50 shadow-md'
                                  : item.value === 'instagram'
                                    ? 'border-pink-500 bg-pink-50 shadow-md'
                                    : 'border-slate-950 bg-slate-100 shadow-md'
                                : 'border-slate-200 bg-white hover:border-blue-200'
                            }`}
                          >
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${
                                active
                                  ? 'bg-white'
                                  : 'bg-slate-50'
                              }`}
                            >
                              <motion.span
                                className="inline-flex"
                                animate={reduceMotion ? { scale: 1 } : active ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                                transition={{ duration: 0.4 }}
                              >
                                <PlatformIcon
                                  platform={item.value}
                                  className="h-7 w-7"
                                />
                              </motion.span>
                            </span>

                            <div className="min-w-0">
                              <div
                                className={`font-black ${
                                  active
                                    ? 'text-blue-600'
                                    : 'text-slate-950'
                                }`}
                              >
                                {item.label}
                              </div>

                              <div className="mt-0.5 text-xs font-semibold text-slate-400">
                                {count}{' '}
                                dịch vụ
                              </div>
                            </div>

                            {active && (
                              <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">
                                ✓
                              </span>
                            )}
                          </motion.button>
                        )
                      },
                    )}
                  </div>
                </div>

                <div className="relative z-30">
                  <label id="chon-loai-dich-vu" className="mb-2 block text-sm font-black text-slate-700">
                    2. Loại dịch vụ
                  </label>

                  <button
                    type="button"
                    disabled={!platform}
                    onClick={() => {
                      if (platform) {
                        setCategoryOpen(
                          (value) => !value,
                        )
                      }
                    }}
                    className={`flex w-full items-center justify-between rounded-2xl border bg-white p-4 text-left transition ${
                      categoryOpen
                        ? 'border-blue-500 ring-4 ring-blue-50'
                        : 'border-slate-200 hover:border-blue-300'
                    } ${
                      !platform
                        ? 'cursor-not-allowed bg-slate-50 opacity-60'
                        : ''
                    }`}
                  >
                    {category ? (
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-black ${categoryColors(category).icon}`}>
                          <AnimatedCategoryIcon category={category} />
                        </span>

                        <div className="min-w-0">
                          <div className="font-black text-slate-950">
                            {
                              getCategoryMeta(
                                category,
                              ).label
                            }
                          </div>

                          <div className="mt-0.5 truncate text-xs font-medium text-slate-400">
                            {
                              getCategoryMeta(
                                category,
                              ).description
                            }
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-lg text-slate-400">
                          ◫
                        </span>

                        <div>
                          <div className="font-bold text-slate-500">
                            {platform
                              ? 'Chọn loại dịch vụ'
                              : 'Chọn nền tảng trước'}
                          </div>

                          {platform && (
                            <div className="mt-0.5 text-xs text-slate-400">
                              Follow, Like, View, Comment...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <motion.span
                      animate={{
                        rotate:
                          categoryOpen
                            ? 180
                            : 0,
                      }}
                      className="ml-4 shrink-0 text-sm font-black text-slate-400"
                    >
                      ▼
                    </motion.span>
                  </button>

                  <AnimatePresence>
                    {categoryOpen &&
                      platform && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            y: -8,
                            scale: 0.99,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                          }}
                          exit={{
                            opacity: 0,
                            y: -8,
                            scale: 0.99,
                          }}
                          transition={{
                            duration: 0.16,
                          }}
                          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
                        >
                          <div className="max-h-80 overflow-y-auto">
                            {availableCategories.map(
                              (value) => {
                                const meta =
                                  getCategoryMeta(
                                    value,
                                  )

                                const active =
                                  category ===
                                  value

                                const colors =
                                  categoryColors(
                                    value,
                                  )

                                return (
                                  <motion.button
                                    type="button"
                                    key={value}
                                    {...(reduceMotion ? {} : {
                                      initial: { opacity: 0, x: -8 },
                                      animate: { opacity: 1, x: 0 },
                                      transition: { duration: 0.2, delay: Math.min(availableCategories.indexOf(value), 8) * 0.025 },
                                      whileHover: { x: 3 },
                                      whileTap: { scale: 0.99 },
                                    })}
                                    onClick={() =>
                                      changeCategory(
                                        value,
                                      )
                                    }
                                    className={`group mb-2 flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                                      active
                                         ? `${colors.active} border-blue-200 shadow-sm`
                                         : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span
                                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl transition-transform duration-200 group-hover:scale-105 ${
                                        active
                                          ? `${colors.icon} shadow-sm`
                                          : colors.icon
                                      }`}
                                    >
                                      <AnimatedCategoryIcon category={value} />
                                    </span>

                                    <div className="min-w-0 flex-1 basis-[calc(100%-3.25rem)]">
                                      <div
                                        className={`text-sm font-extrabold tracking-tight ${
                                          active
                                            ? colors.text
                                            : 'text-slate-900'
                                        }`}
                                      >
                                        {
                                          meta.label
                                        }
                                      </div>

                                      <div className="mt-1 truncate text-xs leading-5 text-slate-500">
                                        {
                                          meta.description
                                        }
                                      </div>
                                    </div>

                                    <div className="ml-3 flex shrink-0 items-center gap-3">
                                      <span
                                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${colors.badge}`}
                                      >
                                        {categoryCount(
                                          value,
                                        )}{' '}
                                        dịch vụ
                                      </span>

                                      {active && (
                                        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white ${colors.check}`}>
                                          ✓
                                        </span>
                                      )}
                                    </div>
                                  </motion.button>
                                )
                              },
                            )}
                          </div>
                        </motion.div>
                      )}
                  </AnimatePresence>
                </div>

                
                <div className="relative z-20">
                  {/* NOSCAM_VISIBLE_SERVICE_CARDS_V2 */}
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <label className="text-sm font-black text-slate-700">
                      3. Dịch vụ
                    </label>

                    {category && (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {categoryServices.length} dịch vụ khả dụng
                      </span>
                    )}
                  </div>

                  {!category ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                      Vui lòng chọn loại dịch vụ ở bước 2.
                    </div>
                  ) : categoryServices.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                      Chưa có dịch vụ khả dụng.
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                      <p className="px-1 pb-1 text-xs font-medium text-slate-500">
                        Chọn một dịch vụ để tiếp tục đặt hàng.
                      </p>
{categoryServices.map(
                              (item) => {
                                const active =
                                  String(
                                    selectedId,
                                  ) ===
                                  String(
                                    item.id,
                                  )

                                const colors =
                                  categoryColors(
                                    category,
                                  )

                                return (
                                  <motion.button
                                    type="button"
                                    key={item.id}
                                    {...(reduceMotion ? {} : {
                                      initial: { opacity: 0, y: 6 },
                                      animate: { opacity: 1, y: 0 },
                                      transition: { duration: 0.18 },
                                      whileHover: { x: 3 },
                                      whileTap: { scale: 0.99 },
                                    })}
                                    onClick={() =>
                                      changeService(
                                        String(
                                          item.id,
                                        ),
                                      )
                                    }
                                    className={`group flex w-full min-w-0 flex-wrap items-start gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-white p-3 text-left transition-all duration-200 hover:border-blue-100 hover:bg-blue-50/50 ${
                                      active
                                        ? colors.active
                                        : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    <span
                                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                        active
                                          ? colors.icon
                                          : 'bg-slate-50'
                                      }`}
                                    >
                                      <PlatformIcon
                                        platform={
                                          item.platform
                                        }
                                        className="h-5 w-5"
                                      />
                                    </span>

                                    <div className="min-w-0 flex-1 basis-[calc(100%-3.25rem)] sm:basis-auto">
                                      <div
                                        className={`text-sm font-black leading-5 ${
                                          active
                                            ? colors.text
                                            : 'text-slate-900'
                                        }`}
                                      >
                                        {
                                          item.name
                                        }
                                      </div>

                                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
                                        <span className="rounded-md bg-slate-100 px-2 py-1">
                                          Min{' '}
                                          {Number(
                                            item.min_quantity,
                                          ).toLocaleString(
                                            'vi-VN',
                                          )}
                                        </span>

                                        <span className="rounded-md bg-slate-100 px-2 py-1">
                                          Max{' '}
                                          {Number(
                                            item.max_quantity,
                                          ).toLocaleString(
                                            'vi-VN',
                                          )}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="ml-auto flex w-full items-center justify-end gap-2 border-t border-slate-100 pt-2 text-right sm:ml-3 sm:block sm:w-auto sm:border-0 sm:pt-0">
                                      <div
                                        className={`text-sm font-black ${
                                          active
                                            ? colors.text
                                            : 'text-blue-600'
                                        }`}
                                      >
                                        {Number(item.sell_price_per_1000) > 0
                                          ? moneyUnit(Number(item.sell_price_per_1000) / 1000)
                                          : 'Liên hệ Admin'}
                                      </div>

                                      <div className="text-[10px] font-bold text-slate-400">
                                        / {getServiceUnit(selected)}
                                      </div>

                                      {active && (
                                        <span
                                          className={`mt-2 ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white ${colors.check}`}
                                        >
                                          ✓
                                        </span>
                                      )}
                                    </div>
                                  </motion.button>
                                )
                              },
                            )}
                    </div>
                  )}
                </div>

                <AnimatePresence mode="wait">
                {selected && (
                  <motion.div
                    key={String(selected.id)}
                    {...rise(0)}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                    className="space-y-6"
                  >
                    <div>
                      <label className="mb-2 block text-sm font-black text-slate-700">
                        4. Link
                      </label>

                      <input data-order-field="target"
                        required
                        value={target}
                        onChange={(e) =>
                          setTarget(
                            e.target.value,
                          )
                        }
                        placeholder="Nhập đường dẫn https://..."
                        className={`w-full rounded-2xl border px-4 py-4 outline-none transition ${invalidFields.includes("target") ? 'border-red-500 bg-red-50 ring-2 ring-red-200' : 'border-slate-200 focus:border-blue-500'}`}
                      />
                        {invalidFields.includes('target') && (
                          <p className="mt-2 text-sm font-semibold text-red-600">
                            {!target.trim()
                              ? 'Vui lòng nhập link.'
                              : 'Link không hợp lệ. Vui lòng nhập đường dẫn đầy đủ.'}
                          </p>
                        )}
                    </div>
                    {supportsChannelReaction(selected) && (
                        <div>
                          <label className="mb-2 block text-sm font-black text-slate-700">
                            5. Chọn cảm xúc Facebook
                          </label>
                          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                            {[
                              ['LIKE', '👍', 'Thích'],
                              ['LOVE', '❤️', 'Yêu thích'],
                              ['CARE', '🥰', 'Thương thương'],
                              ['HAHA', '😆', 'Haha'],
                              ['WOW', '😮', 'Wow'],
                              ['SAD', '😢', 'Buồn'],
                              ['ANGRY', '😡', 'Giận'],
                            ].map(([value, emoji, label]) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setReaction(value)}
                                aria-pressed={reaction === value}
                                className={`rounded-xl border p-2 text-center transition ${
                                  reaction === value
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                    : 'border-slate-200 bg-white'
                                }`}
                              >
                                <span className="block text-2xl">{emoji}</span>
                                <span className="block text-xs font-semibold">{label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    {requiresComments && (
                      <div>
                        <label className="mb-2 block text-sm font-black text-slate-700">
                          5. Nội dung bình luận
                        </label>

                        <textarea data-order-field="comments"
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          rows={6}
                          placeholder={"Mỗi dòng là một bình luận..."}
                          className={`w-full rounded-2xl border px-4 py-4 outline-none transition ${invalidFields.includes("comments") ? 'border-red-500 bg-red-50 ring-2 ring-red-200' : 'border-slate-200 focus:border-blue-500'}`}
                        />

                        <p className="mt-2 text-sm font-semibold text-blue-600">
                          Đã nhập: {commentLines.length} bình luận
                        </p>
                      </div>
                    )}



                    {selected?.description?.trim() && (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                        <div className="mb-2 text-sm font-black text-blue-800">
                          Ghi chú dịch vụ
                        </div>

                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                          {selected.description}
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="mb-2 block text-sm font-black text-slate-700">
                        5. Số lượng
                      </label>

                      <input data-order-field="quantity"
                        required
                        type="number"
                        min={
                          selected.min_quantity
                        }
                        max={
                          selected.max_quantity
                        }
                        value={
                            requiresComments
                              ? numericQuantity
                              : quantity
                          }
                          readOnly={requiresComments}
                        onChange={(e) =>
                          setQuantity(
                            e.target.value,
                          )
                        }
                        className={`w-full rounded-2xl border px-4 py-4 outline-none transition ${invalidFields.includes("quantity") ? 'border-red-500 bg-red-50 ring-2 ring-red-200' : 'border-slate-200 focus:border-blue-500'}`}
                      />
                        {invalidFields.includes('quantity') && (
                          <p className="mt-2 text-sm font-semibold text-red-600">
                            {numericQuantity < Number(selected.min_quantity)
                              ? `Số lượng tối thiểu là ${Number(selected.min_quantity).toLocaleString('vi-VN')} lượt.`
                              : `Số lượng tối đa là ${Number(selected.max_quantity).toLocaleString('vi-VN')} lượt.`}
                          </p>
                        )}

                      <div className="mt-2 flex justify-between text-xs font-semibold text-slate-400">
                        <span>
                          Min:{' '}
                          {Number(
                            selected.min_quantity,
                          ).toLocaleString(
                            'vi-VN',
                          )}
                        </span>

                        <span>
                          Max:{' '}
                          {Number(
                            selected.max_quantity,
                          ).toLocaleString(
                            'vi-VN',
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-slate-500">
                          Đơn giá / 1 {getServiceUnit(selected)}
                        </span>

                        <span className="font-black">
                          {Number(selected.sell_price_per_1000) > 0
                            ? moneyUnit(Number(selected.sell_price_per_1000) / 1000)
                            : 'Liên hệ Admin'}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-4">
                        <span className="font-bold text-slate-500">
                          Số lượng
                        </span>

                        <span className="font-black">
                          {numericQuantity.toLocaleString(
                            'vi-VN',
                          )}
                        </span>
                      </div>

                      <div className="mt-4 border-t border-slate-200 pt-4">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-lg font-black">
                            Tổng tiền
                          </span>

                          <motion.span
                            key={money(total)}
                            initial={reduceMotion ? false : { opacity: 0.5, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-3xl font-black text-blue-600"
                            aria-live="polite"
                          >
                            {money(total)}
                          </motion.span>
                        </div>
                      </div>

                      {isLoggedIn &&
                        balance !==
                          null && (
                          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                            <span className="text-sm font-semibold text-slate-500">
                              Số dư hiện tại
                            </span>

                            <span className="font-black">
                              {money(
                                balance,
                              )}
                            </span>
                          </div>
                        )}
                    </div>

                    {insufficient && (
                      <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                        <div className="font-black text-red-600">
                          Số dư không đủ
                        </div>

                        <div className="mt-1 text-sm text-red-500">
                          Bạn còn thiếu{' '}
                          <strong>
                            {money(
                              missingAmount,
                            )}
                          </strong>
                          .
                        </div>

                        <Link
                          to="/wallet"
                          className="mt-3 inline-flex rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white"
                        >
                          Nạp tiền
                        </Link>
                      </div>
                    )}

                    {!isLoggedIn ? (
                      <button
                        type="submit"
                        className="w-full rounded-2xl bg-blue-600 px-5 py-4 font-black text-white transition hover:bg-blue-700"
                      >
                        Đăng nhập để đặt đơn
                      </button>
                    ) : insufficient ? (
                      <Link
                        to="/wallet"
                        className="flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 font-black text-white"
                      >
                        Nạp thêm{' '}
                        {money(
                          missingAmount,
                        )}
                      </Link>
                    ) : (
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-base font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Tiếp tục đặt đơn
                      </button>
                    )}
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            )}
          
            </fieldset>

            {!isLoggedIn && (
              <div
                className="absolute inset-0 z-30 flex items-center justify-center rounded-[24px] bg-white/30 p-4 sm:p-6"
                aria-label="Yêu cầu đăng nhập để tạo đơn hàng"
              >
                <div className="w-full max-w-md rounded-3xl border border-blue-100 bg-white p-6 text-center shadow-[0_20px_70px_rgba(15,23,42,0.15)] sm:p-8">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-7 w-7"
                    >
                      <rect x="4" y="10" width="16" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                  </div>

                  <h3 className="mt-4 text-xl font-black text-slate-950">
                    Đăng nhập để tạo đơn hàng
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Vui lòng đăng nhập hoặc đăng ký tài khoản NoScam.vn
                    để chọn dịch vụ và đặt hàng.
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <Link
                      to="/login"
                      className="flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                    >
                      Đăng nhập
                    </Link>

                    <Link
                      to="/register"
                      className="flex min-h-12 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                    >
                      Đăng ký
                    </Link>
                  </div>

                  <p className="mt-4 text-xs text-slate-400">
                    Đăng nhập để mở khóa toàn bộ chức năng tạo đơn.
                  </p>
                </div>
              </div>
            )}
</motion.form>
        </div>
      {adminNotice && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl font-black text-amber-600">
              !
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-950">
              Không thể đặt hàng
            </h2>

            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
              Dịch vụ hiện chưa thể xử lý.
              Vui lòng liên hệ Admin để được hỗ trợ.
            </p>

            <button
              type="button"
              onClick={() =>
                setAdminNotice(false)
              }
              className="mt-6 w-full rounded-2xl bg-slate-950 px-4 py-3 font-black text-white transition hover:bg-slate-800"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      </main>

      <AnimatePresence>
        {confirmOpen &&
          selected && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-5 backdrop-blur-sm"
              onClick={() => {
                if (!submitting) {
                  setConfirmOpen(
                    false,
                  )
                }
              }}
            >
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 15 }}
                onClick={(e) =>
                  e.stopPropagation()
                }
                className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                    <PlatformIcon
                      platform={
                        selected.platform
                      }
                      className="h-7 w-7"
                    />
                  </span>

                  <div>
                    <div className="text-xs font-black uppercase text-blue-600">
                      Xác nhận đơn hàng
                    </div>

                    <div className="mt-1 text-xl font-black">
                      Kiểm tra thông tin
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-bold text-slate-400">
                      DỊCH VỤ
                    </div>

                    <div className="mt-1 font-black">
                      {selected.name}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-bold text-slate-400">
                      LINK / USERNAME / ID
                    </div>

                    {/^https?:\/\/[^\s]+$/i.test(target.trim()) ? (
                      <a
                        href={target.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block break-all font-bold text-blue-600 underline underline-offset-2 hover:text-blue-800"
                      >
                        {target}
                      </a>
                    ) : (
                      <div className="mt-1 break-all font-bold">
                        {target}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-bold text-slate-400">
                        SỐ LƯỢNG
                      </div>

                      <div className="mt-1 text-lg font-black">
                        {numericQuantity.toLocaleString(
                          'vi-VN',
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-blue-50 p-4">
                      <div className="text-xs font-bold text-blue-400">
                        THANH TOÁN
                      </div>

                      <div className="mt-1 text-lg font-black text-blue-600">
                        {money(total)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-slate-600">Số dư hiện tại</span>
                    <strong>
                      {balance === null ? 'Chưa xác định' : money(balance)}
                    </strong>
                  </div>
                  <div className="mt-2 flex justify-between gap-3 text-sm">
                    <span className="text-slate-600">Dự kiến sau thanh toán</span>
                    <strong className="text-blue-600">
                      {balance === null ? 'Chưa xác định' : money(balance - total)}
                    </strong>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={
                      submitting
                    }
                    onClick={() =>
                      setConfirmOpen(
                        false,
                      )
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-3.5 font-black"
                  >
                    Quay lại
                  </button>

                  <button
                    type="button"
                    disabled={
                      submitting
                    }
                    onClick={
                      confirmOrder
                    }
                    className="rounded-2xl bg-blue-600 px-4 py-3.5 font-black text-white disabled:opacity-50"
                  >
                    {submitting
                      ? 'Đang đặt...'
                      : 'Xác nhận đặt'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
      </AnimatePresence>

      {submitting && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0b1736a8] p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Đang xử lý đơn hàng"
        >
          <div className="w-full max-w-[400px] rounded-[22px] bg-white px-7 py-9 text-center shadow-2xl">
            <div className="mb-5 flex items-center justify-center gap-2.5 text-[23px] font-extrabold">
              <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-gradient-to-br from-[#175cff] to-cyan-500 text-2xl text-white">
                N
              </span>
              <span>NoScam<span className="text-[#175cff]">.vn</span></span>
            </div>
            <div className="mx-auto h-[42px] w-[42px] animate-spin rounded-full border-4 border-[#dce8ff] border-t-[#175cff]" />
            <div className="mt-5 text-[19px] font-extrabold">
              Đang xử lý đơn hàng
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Hệ thống đang gửi và kiểm tra đơn hàng.
              Vui lòng không gửi yêu cầu nhiều lần.
            </p>
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[#e9eef7]">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-[#175cff] to-cyan-500" />
            </div>
          </div>
        </div>
      )}

      {orderResult && !submitting && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/60 p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Kết quả đặt hàng"
        >
          <div className="w-full max-w-md rounded-[24px] bg-white p-7 text-center shadow-2xl">
            <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl font-black ${
              orderResult.type === 'success'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-700'
            }`}>
              {orderResult.type === 'success' ? '✓' : '!'}
            </div>
            <h2 className="mt-4 text-xl font-black">
              {orderResult.type === 'success'
                ? 'Đặt hàng thành công'
                : 'Chưa xác nhận được đơn hàng'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {orderResult.type === 'success'
                ? 'Đơn hàng đã được ghi nhận. Bạn có thể tiếp tục đặt hàng tại đây.'
                : orderResult.message}
            </p>
            {orderResult.type === 'success' && (
              <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm">
                Số dư ví sau mua:
                <strong className="ml-2 text-blue-600">
                  {orderResult.balance === null
                    ? 'Chưa cập nhật được'
                    : money(orderResult.balance)}
                </strong>
              </div>
            )}
            <button
              type="button"
              onClick={() => setOrderResult(null)}
              className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
            >
              {orderResult.type === 'success' ? 'Tiếp tục đặt hàng' : 'Đóng'}
            </button>
          </div>
        </div>
      )}

      <SocialGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        platform={platform}
        category={category}
        selectedId={selectedId}
        target={target}
        quantity={quantity}
        categoryOpen={categoryOpen}
        serviceOpen={serviceOpen}
        requiresComments={requiresComments}
        comments={comments}
      />
    </>
  )
}
