import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const STEPS = [
  {
    tab: 'available',
    target: 'tab',
    title: 'Đi tương tác',
    description: 'Nhấn vào Đi tương tác để xem các nhiệm vụ miễn phí.',
  },
  {
    tab: 'available',
    target: 'task',
    title: 'Xem nhiệm vụ',
    description: 'Đây là nhiệm vụ đang có. Xem nền tảng, loại tương tác và số lượt còn lại.',
  },
  {
    tab: 'available',
    target: 'external',
    title: 'Mở trang cần tương tác',
    description: 'Nhấn đường dẫn để xem nơi cần thực hiện Follow, Like hoặc View. Trong hướng dẫn, thao tác mở liên kết được mô phỏng.',
  },
  {
    tab: 'available',
    target: 'account',
    title: 'Chọn tài khoản đi tương tác',
    description: 'Sau khi tương tác thật, tích chọn tài khoản đã sử dụng. Trong hướng dẫn, bạn chỉ thực hành thao tác.',
  },
  {
    tab: 'available',
    target: 'confirm',
    title: 'Xác nhận đã tương tác',
    description: 'Bình thường, nút này dùng để gửi xác nhận. Trong hướng dẫn, nhấn thử sẽ không gửi dữ liệu thật.',
  },
  {
    tab: 'returns',
    target: 'tab',
    title: 'Cần tương tác lại',
    description: 'Nhấn mục Cần tương tác lại để xem những nhiệm vụ cần xử lý.',
  },
  {
    tab: 'returns',
    target: 'return',
    title: 'Xử lý tương tác lại',
    description: 'Mở tài khoản được yêu cầu, thực hiện tương tác thật rồi đánh dấu Tôi đã tương tác lại. Hướng dẫn không gửi xác nhận thật.',
  },
  {
    tab: 'create',
    target: 'tab',
    title: 'Tạo chiến dịch',
    description: 'Nhấn Tạo chiến dịch để xem biểu mẫu tạo chiến dịch miễn phí.',
  },
  {
    tab: 'create',
    target: 'platform',
    title: 'Chọn nền tảng',
    description: 'Chọn Facebook, Instagram hoặc nền tảng bạn muốn nhận tương tác.',
  },
  {
    tab: 'create',
    target: 'type',
    title: 'Chọn loại tương tác',
    description: 'Chọn loại tương tác phù hợp, ví dụ Follow hoặc Like.',
  },
  {
    tab: 'create',
    target: 'receiver',
    title: 'Chọn tài khoản nhận',
    description: 'Chọn tài khoản liên kết đã bật Nhận tương tác.',
  },
  {
    tab: 'create',
    target: 'quantity',
    title: 'Nhập số lượt',
    description: 'Nhập số lượt muốn nhận. Đây là tương tác chéo miễn phí.',
  },
  {
    tab: 'create',
    target: 'url',
    title: 'Nhập liên kết',
    description: 'Dán liên kết tài khoản hoặc bài viết cần nhận tương tác.',
  },
  {
    tab: 'create',
    target: 'agreement',
    title: 'Đọc quy định',
    description: 'Đọc quy định và tích đồng ý trước khi tạo chiến dịch thật.',
  },
  {
    tab: 'create',
    target: 'create',
    title: 'Hoàn thành phần tạo chiến dịch',
    description: 'Nhấn thử Tạo chiến dịch miễn phí để tiếp tục bài học. Không có chiến dịch thật nào được tạo.',
  },
  {
    tab: 'campaigns',
    target: 'tab',
    title: 'Chiến dịch của tôi',
    description: 'Nhấn để xem các chiến dịch đã tạo.',
  },
  {
    tab: 'campaigns',
    target: 'campaign',
    title: 'Theo dõi tiến độ',
    description: 'Kiểm tra số lượt đã ghi nhận so với số lượt mong muốn.',
  },
  {
    tab: 'accounts',
    target: 'tab',
    title: 'Tài khoản liên kết',
    description: 'Nhấn để xem danh sách tài khoản mạng xã hội đã liên kết.',
  },
  {
    tab: 'accounts',
    target: 'accounts',
    title: 'Quản lý tài khoản',
    description: 'Tại đây bạn quản lý tài khoản đi tương tác và tài khoản nhận tương tác. Hướng dẫn không thêm, xóa hoặc thay đổi tài khoản thật.',
  },
]

const TAB_LABELS = {
  available: 'Đi tương tác',
  returns: 'Cần tương tác lại',
  create: 'Tạo chiến dịch',
  campaigns: 'Chiến dịch của tôi',
  accounts: 'Tài khoản liên kết',
}

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function findText(root, selector, label, exact = false) {
  const wanted = normalize(label)
  return [...root.querySelectorAll(selector)].find(el => {
    const value = normalize(el.textContent)
    return exact ? value === wanted : value.includes(wanted)
  }) || null
}

function getTarget(step, root) {
  if (!root) return null

  if (step.target === 'tab') {
    return [...root.querySelectorAll('button')].find(el => {
      const label = normalize(TAB_LABELS[step.tab])
      const text = normalize(el.textContent)
      return text === label || text.startsWith(label + ' (')
    }) || null
  }

  const section = [...root.querySelectorAll('section')].find(el => {
    const heading = el.querySelector('h2')
    if (!heading) return false

    const title = normalize(heading.textContent)
    const headings = {
      available: 'đi tương tác',
      returns: 'tài khoản cần tương tác lại',
      create: 'tạo chiến dịch miễn phí',
      campaigns: 'chiến dịch của tôi',
    }
    return title === headings[step.tab]
  }) || root

  switch (step.target) {
    case 'task':
      return section.querySelector('article') || section
    case 'external':
      return section.querySelector('article a[target="_blank"]') ||
        section.querySelector('article a') || null
    case 'account':
      return section.querySelector('article input[type="checkbox"]') ||
        section.querySelector('article label') || null
    case 'confirm':
      return findText(section, 'button', 'Xác nhận') || null
    case 'return':
      return findText(section, 'label', 'Tôi đã tương tác lại') ||
        section.querySelector('article') || null
    case 'platform':
      return section.querySelectorAll('select')[0] || null
    case 'type':
      return section.querySelectorAll('select')[1] || null
    case 'receiver':
      return section.querySelectorAll('select')[2] || null
    case 'quantity':
      return section.querySelector('input[type="number"]')
    case 'url':
      return section.querySelector('input[type="url"]')
    case 'agreement':
      return section.querySelector('input[type="checkbox"]')
    case 'create':
      return findText(section, 'button', 'Tạo chiến dịch miễn phí')
    case 'campaign':
      return section.querySelector('article') || section
    case 'accounts':
      return root.querySelector('section') || null
    default:
      return null
  }
}

export default function ExchangeInteractiveGuide({ activeTab, onChangeTab }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState(null)
  const [completed, setCompleted] = useState(false)
  const targetRef = useRef(null)
  const rootRef = useRef(null)
  const activeRef = useRef(false)
  const indexRef = useRef(0)
  const tabRef = useRef(null)

  const step = STEPS[index]

  function finish() {
    setCompleted(true)
    setRect(null)
  }

  function next() {
    setIndex(current => {
      if (current >= STEPS.length - 1) {
        setCompleted(true)
        return current
      }
      return current + 1
    })
  }

  function close() {
    activeRef.current = false
    setOpen(false)
    setCompleted(false)
    setIndex(0)
    setRect(null)
  }

  useEffect(() => {
    activeRef.current = open && !completed
    indexRef.current = index
  }, [open, completed, index])

  // NOSCAM_EXCHANGE_REACT_TAB_SYNC_V2
  // Chuyển tab trực tiếp qua React state, không click DOM.
  useEffect(() => {
    if (!open || completed) return

    const expectedTab = STEPS[index]?.tab

    if (!expectedTab) return

    if (activeTab !== expectedTab) {
      onChangeTab(expectedTab)
    }
  }, [open, completed, index, activeTab, onChangeTab])



  useLayoutEffect(() => {
    if (!open || completed) return

    const root = document.getElementById('noscam-exchange-guide-root')
    rootRef.current = root
    if (!root) return

    let frame = null
    let lastElement = null

    const update = () => {
      const element = getTarget(STEPS[indexRef.current], root)
      targetRef.current = element

      if (!element) {
        setRect(null)
        return
      }

      if (lastElement !== element) {
        lastElement = element
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        })
      }

      const r = element.getBoundingClientRect()
      setRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      })
    }

    const schedule = () => {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    schedule()
    const observer = new MutationObserver(schedule)
    observer.observe(root, { childList: true, subtree: true })

    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)

    return () => {
      observer.disconnect()
      if (frame !== null) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
    }
  }, [open, completed, index])

  // NOSCAM_EXCHANGE_NAVIGATION_V4
  useEffect(() => {
    if (!open || completed) return

    const handleClick = event => {
      if (!activeRef.current) return

      // Các nút trong popup do React tự xử lý.
      if (event.target.closest('[data-exchange-guide-controls]')) {
        return
      }

      const root = document.getElementById(
        'noscam-exchange-guide-root'
      )

      if (!root || !root.contains(event.target)) return

      const current = STEPS[indexRef.current]

      // Không cho các thao tác trên trang kích hoạt hành động thật.
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation?.()

      // Chuyển bước khi người dùng nhấn trên trang.
      if (current.target === 'tab') {
        // Tab cần được đổi thật để hiển thị nội dung tương ứng.
        const tab = getTarget(current, root)
        if (tab && tab.contains(event.target)) {
          // Chỉ mô phỏng thao tác, không thay đổi dữ liệu.
        }
      }

      setIndex(value => Math.min(STEPS.length - 1, value + 1))
    }

    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [open, completed])

  // Chặn thao tác gửi dữ liệu trong lúc hướng dẫn.
  useEffect(() => {
    if (!open) return

    const stopSubmit = event => {
      const root = document.getElementById('noscam-exchange-guide-root')
      if (root?.contains(event.target)) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation?.()
      }
    }

    document.addEventListener('submit', stopSubmit, true)
    return () => document.removeEventListener('submit', stopSubmit, true)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIndex(0)
          setCompleted(false)
          setOpen(true)
        }}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl sm:w-auto border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
      >
        
        Hướng dẫn sử dụng Tương tác chéo
      </button>

      {open && (
        <>
          {/* NOSCAM_EXCHANGE_SPOTLIGHT_V2 */}
          {!completed && rect ? (
            <div
              aria-hidden="true"
              className="pointer-events-none fixed z-[991] rounded-xl border-[3px] border-blue-500 transition-all duration-150"
              style={{
                top: Math.max(0, rect.top - 7),
                left: Math.max(0, rect.left - 7),
                width: rect.width + 14,
                height: rect.height + 14,
                boxShadow:
                  '0 0 0 9999px rgba(15,23,42,0.58), ' +
                  '0 0 0 5px rgba(59,130,246,0.28), ' +
                  '0 0 35px rgba(59,130,246,0.70)',
              }}
            />
          ) : (
            <div
              aria-hidden="true"
              className="pointer-events-none fixed inset-0 z-[990] bg-slate-950/55"
            />
          )}

          <aside
            data-exchange-guide-controls
            role="dialog"
            aria-modal="true"
            aria-label="Hướng dẫn Tương tác chéo"
            className="fixed bottom-4 left-1/2 z-[1000] w-[calc(100%-24px)] max-w-lg -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:bottom-6"
          >
            {completed ? (
              <div>
                <h3 className="text-xl font-black text-emerald-700">
                  Hoàn thành hướng dẫn!
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  Bạn đã tìm hiểu cách sử dụng 5 mục của Tương tác chéo.
                  Không có xác nhận hay chiến dịch nào được gửi trong
                  các bước mô phỏng.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white"
                >
                  Kết thúc hướng dẫn
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                      Tương tác chéo · Bước {index + 1}/{STEPS.length}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">
                      {step.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Đóng hướng dẫn"
                    className="rounded-full bg-slate-100 px-3 py-2 text-slate-600"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-4 flex gap-1">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={
                        'h-1.5 flex-1 rounded-full ' +
                        (i <= index ? 'bg-blue-600' : 'bg-slate-200')
                      }
                    />
                  ))}
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-700">
                  {step.description}
                </p>

                {!targetRef.current && (
                  <p className="mt-2 text-xs text-amber-700">
                    Nếu chưa có dữ liệu phù hợp để thực hành,
                    bạn có thể nhấn Tiếp tục để xem bước kế tiếp.
                  </p>
                )}

                <div className="mt-5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="text-sm font-semibold text-slate-500"
                  >
                    Thoát hướng dẫn
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => setIndex(i => Math.max(0, i - 1))}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40"
                    >
                      Quay lại
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (index >= STEPS.length - 1) {
                          finish()
                        } else {
                          setIndex(i => Math.min(STEPS.length - 1, i + 1))
                        }
                      }}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
                    >
                      {index === STEPS.length - 1 ? 'Hoàn thành' : 'Tiếp tục'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </aside>
        </>
      )}
    </>
  )
}
