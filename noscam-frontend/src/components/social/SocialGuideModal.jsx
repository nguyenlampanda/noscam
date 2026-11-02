import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// NOSCAM_COMMENT_AUTONEXT_V2

const BASE_STEPS = [
  {
    id: 'platform',
    title: 'Chọn nền tảng',
    description: 'Nhấn vào nền tảng bạn muốn sử dụng.',
  },
  {
    id: 'category',
    title: 'Chọn loại dịch vụ',
    description: 'Mở danh sách và nhấn chọn Follow, Like, View, Comment hoặc loại phù hợp.',
  },
  {
    id: 'service',
    title: 'Chọn dịch vụ cụ thể',
    description: 'Các dịch vụ được hiển thị sẵn. Nhấn trực tiếp vào gói dịch vụ bạn muốn đặt.',
  },
  {
    id: 'target',
    title: 'Nhập liên kết',
    description: 'Nhập link, username hoặc ID theo yêu cầu của dịch vụ.',
  },
  {
    id: 'comments',
    title: 'Nhập nội dung bình luận',
    description: 'Mỗi dòng là một bình luận. Hãy nhập thử ít nhất một dòng vào ô đang được làm sáng.',
  },
  {
    id: 'quantity',
    title: 'Nhập số lượng',
    description: 'Kiểm tra số lượng tối thiểu, tối đa và số lượng bạn muốn đặt.',
  },
  {
    id: 'review',
    title: 'Kiểm tra đơn hàng',
    description: 'Kiểm tra thông tin và tổng tiền. Hướng dẫn không tự đặt hàng hoặc thanh toán.',
  },
]

function findLabel(form, prefix) {
  return [...form.querySelectorAll('label')].find(
    element => element.textContent?.trim().startsWith(prefix)
  )
}

function findTarget(id, categoryOpen, serviceOpen) {
  const form = document.getElementById('tao-don')
  if (!form) return null

  if (id === 'platform') {
    const label = findLabel(form, '1. Chọn nền tảng')
    return label?.nextElementSibling || label?.parentElement
  }

  if (id === 'category' || id === 'service') {
    const prefix = id === 'category'
      ? '2. Loại dịch vụ'
      : '3. Dịch vụ'

    const label = findLabel(form, prefix)
    const wrapper = label?.parentElement
    if (!wrapper) return null

    const opened = id === 'category'
      ? categoryOpen
      : false

    if (opened) {
      const dropdown = [...wrapper.querySelectorAll('div')]
        .find(element => {
          const cls = typeof element.className === 'string'
            ? element.className
            : ''

          return cls.includes('absolute') &&
            cls.includes('shadow-2xl')
        })

      if (dropdown) return dropdown
    }

    return wrapper.querySelector('button') || wrapper
  }

  if (id === 'target') {
    return form.querySelector(
      'input[placeholder="Nhập link, username hoặc ID..."]'
    )
  }

  if (id === 'comments') {
    return form.querySelector(
      'textarea[placeholder^="Mỗi dòng là một bình luận"]'
    )
  }

  if (id === 'quantity') {
    const label = findLabel(form, '5. Số lượng')
    return label?.parentElement?.querySelector('input') ||
      label?.parentElement?.parentElement?.querySelector('input')
  }

  return form.querySelector('button[type="submit"]')
}

export default function SocialGuideModal({
  open,
  onClose,
  platform,
  category,
  selectedId,
  target,
  quantity,
  categoryOpen,
  serviceOpen,
  requiresComments,
  comments,
}) {
  const [stepId, setStepId] = useState('platform')
  const [rect, setRect] = useState(null)
  const previous = useRef(null)
  const initialized = useRef(false)

  const steps = requiresComments
    ? BASE_STEPS
    : BASE_STEPS.filter(item => item.id !== 'comments')

  const index = Math.max(
    0,
    steps.findIndex(item => item.id === stepId)
  )

  const current = steps[index]

  useEffect(() => {
    if (!open) {
      initialized.current = false
      previous.current = null
      setRect(null)
      return
    }

    setStepId('platform')
    previous.current = {
      platform,
      category,
      selectedId,
      target,
      comments,
    }
    initialized.current = true
  }, [open])

  useEffect(() => {
    if (!open || !initialized.current || !previous.current) return

    const before = previous.current

    let advance = false

    if (stepId === 'platform') {
      advance = Boolean(platform && platform !== before.platform)
    }

    if (stepId === 'category') {
      advance = Boolean(category && category !== before.category)
    }

    if (stepId === 'service') {
      advance = Boolean(
        selectedId &&
        String(selectedId) !== String(before.selectedId)
      )
    }

    if (stepId === 'target') {
      advance = Boolean(
        String(target || '').trim() &&
        target !== before.target
      )
    }

    if (stepId === 'comments') {
      const lines = String(comments || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)

      const previousLines = String(before.comments || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)

      advance = lines.length > 0 &&
        (comments !== before.comments || previousLines.length === 0)
    }

    previous.current = {
      platform,
      category,
      selectedId,
      target,
      comments,
    }

    if (advance) {
      const next = steps[index + 1]
      if (next) setStepId(next.id)
    }
  }, [
    open,
    stepId,
    platform,
    category,
    selectedId,
    target,
    comments,
    requiresComments,
  ])

  useEffect(() => {
    if (!open) return

    const onKey = event => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return

    let lastElement = null
    let lastId = null

    const update = () => {
      const element = findTarget(
        current.id,
        categoryOpen,
        serviceOpen
      )

      if (!element) {
        setRect(null)
        return
      }

      if (element !== lastElement || current.id !== lastId) {
        lastElement = element
        lastId = current.id

        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }

      const box = element.getBoundingClientRect()
      const padding = 7

      const next = {
        top: Math.max(0, box.top - padding),
        left: Math.max(0, box.left - padding),
        width: Math.min(
          window.innerWidth - Math.max(0, box.left - padding),
          box.width + padding * 2
        ),
        height: box.height + padding * 2,
      }

      setRect(old => {
        if (
          old &&
          Object.keys(next).every(
            key => Math.abs(old[key] - next[key]) < 1
          )
        ) return old

        return next
      })
    }

    update()

    const interval = window.setInterval(update, 200)

    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [
    open,
    current.id,
    categoryOpen,
    serviceOpen,
    platform,
    category,
    selectedId,
  ])

  // NOSCAM_QUANTITY_CLICK_NEXT_V1
  useEffect(() => {
    if (!open || stepId !== 'quantity') return

    const input = findTarget('quantity', categoryOpen, serviceOpen)

    if (!input) return

    const advance = () => {
      const value = Number(input.value)

      if (!Number.isFinite(value) || value <= 0) return

      setStepId('review')
    }

    input.addEventListener('click', advance)

    return () => {
      input.removeEventListener('click', advance)
    }
  }, [open, stepId, categoryOpen, serviceOpen])

  // NOSCAM_GUIDE_SAFE_FINISH_V1
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (!open) {
      setCompleted(false)
      return
    }

    if (stepId !== 'review' || completed) return

    const form = document.getElementById('tao-don')
    if (!form) return

    const handleSubmit = (event) => {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation?.()
      setCompleted(true)
    }

    form.addEventListener('submit', handleSubmit, true)

    return () => {
      form.removeEventListener('submit', handleSubmit, true)
    }
  }, [open, stepId, completed])

  if (!open) return null

  const canContinue =
    current.id === 'quantity'
      ? Number(quantity) > 0
      : current.id === 'review'

  return createPortal(
    <>
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[999990] rounded-2xl border-[3px] border-blue-500 transition-all duration-150"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow:
              '0 0 0 9999px rgba(15,23,42,0.58), ' +
              '0 0 0 5px rgba(59,130,246,0.25), ' +
              '0 0 30px rgba(59,130,246,0.65)',
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[999990] bg-slate-950/40"
        />
      )}

      <aside
        role="status"
        aria-live="polite"
        className="fixed bottom-3 left-1/2 z-[999999] w-[calc(100%-24px)] max-w-[470px] -translate-x-1/2 rounded-2xl border border-blue-100 bg-white p-4 shadow-2xl sm:bottom-6 sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">
              Hướng dẫn tương tác · Bước {index + 1}/{steps.length}
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-950">
              {current.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Thoát hướng dẫn"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600 hover:bg-slate-200"
          >
            ×
          </button>
        </div>

        <div className="mt-3 flex gap-1.5">
          {steps.map((item, i) => (
            <div
              key={item.id}
              className={`h-1.5 flex-1 rounded-full ${
                i <= index ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {completed ? (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-lg font-black text-green-700">
              ✓ Hoàn thành hướng dẫn!
            </p>
            <p className="mt-2 text-sm leading-6 text-green-800">
              Bạn đã biết cách tạo đơn hàng trên NoScam.vn.
              Đây chỉ là hướng dẫn thực hành.
              Không có đơn hàng nào được tạo và không có tiền nào bị trừ.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white"
            >
              Kết thúc hướng dẫn
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-slate-700">
            {current.id === 'review'
              ? 'Hãy nhấn nút Đặt hàng đang được làm sáng để hoàn thành hướng dẫn. Đây là thao tác thử, không tạo đơn thật.'
              : current.description}
          </p>
        )}

        {current.id === 'comments' && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3">
            <p className="mb-2 text-xs font-bold text-slate-500">
              Ví dụ:
            </p>
            <pre className="font-mono text-sm leading-6 text-slate-800">
              {'abc\ndef\nghi'}
            </pre>
            <p className="mt-2 text-xs text-blue-600">
              Chỉ cần nhập thử một dòng để tiếp tục hướng dẫn.
            </p>
          </div>
        )}

        {!completed && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
          >
            Thoát hướng dẫn
          </button>

          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setStepId(steps[index - 1].id)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
              >
                Quay lại
              </button>
            )}

            {canContinue && (
              <button
                type="button"
                onClick={() => {
                  if (current.id === 'review') onClose()
                  else setStepId(steps[index + 1].id)
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                {current.id === 'review' ? 'Hoàn tất' : 'Tiếp tục'}
              </button>
            )}
          </div>
        </div>
        )}
      </aside>
    </>,
    document.body
  )
}
