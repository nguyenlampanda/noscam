import {
  useEffect,
  useState,
} from 'react'

import {
  AnimatePresence,
  motion,
} from 'motion/react'

import {
  getCommunityFeedback,
  submitCommunityFeedback,
} from '../../services/communityFeedbackService'

const options = [
  {
    id: 'positive',
    icon: '✓',
    title: 'Trải nghiệm tốt',
    text:
      'Đã từng tương tác và chưa gặp vấn đề.',
    box:
      'border-emerald-200 bg-emerald-50/60',
    active:
      'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-100',
    iconBox:
      'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'caution',
    icon: '!',
    title: 'Nên cẩn thận',
    text:
      'Có một số dấu hiệu khiến bạn chưa yên tâm.',
    box:
      'border-amber-200 bg-amber-50/60',
    active:
      'border-amber-500 bg-amber-50 ring-4 ring-amber-100',
    iconBox:
      'bg-amber-100 text-amber-700',
  },
  {
    id: 'unclear',
    icon: '?',
    title: 'Không rõ',
    text:
      'Chưa có đủ thông tin để đánh giá.',
    box:
      'border-slate-200 bg-slate-50',
    active:
      'border-slate-500 bg-slate-50 ring-4 ring-slate-100',
    iconBox:
      'bg-slate-200 text-slate-700',
  },
  {
    id: 'consider',
    icon: '⌕',
    title: 'Nên cân nhắc kỹ',
    text:
      'Nên kiểm tra thêm trước khi giao dịch.',
    box:
      'border-blue-200 bg-blue-50/60',
    active:
      'border-blue-500 bg-blue-50 ring-4 ring-blue-100',
    iconBox:
      'bg-blue-100 text-blue-700',
  },
]

const initialSummary = {
  total: 0,
  counts: {
    positive: 0,
    caution: 0,
    unclear: 0,
    consider: 0,
  },
}

function CommunityFeedback({
  type,
  value,
}) {
  const [
    summary,
    setSummary,
  ] = useState(initialSummary)

  const [
    selected,
    setSelected,
  ] = useState(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    submitting,
    setSubmitting,
  ] = useState(null)

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    error,
    setError,
  ] = useState('')

  useEffect(() => {
    if (!type || !value) {
      setLoading(false)
      return
    }

    const controller =
      new AbortController()

    let active = true

    async function load() {
      setLoading(true)
      setError('')

      try {
        const result =
          await getCommunityFeedback(
            type,
            value,
            {
              signal:
                controller.signal,
            },
          )

        if (active) {
          setSummary(result)
        }
      } catch (requestError) {
        if (
          active &&
          requestError.name !==
            'AbortError'
        ) {
          setError(
            requestError.message,
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
      controller.abort()
    }
  }, [type, value])

  async function handleVote(id) {
    if (submitting) return

    setSubmitting(id)
    setError('')
    setMessage('')

    try {
      const result =
        await submitCommunityFeedback(
          type,
          value,
          id,
        )

      setSelected(
        result.selected,
      )

      setSummary(
        result.summary,
      )

      setMessage(
        result.message,
      )
    } catch (requestError) {
      setError(
        requestError.message ||
          'Chưa thể ghi nhận lựa chọn.',
      )
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 18,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: 0.18,
      }}
      className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <motion.div
            animate={{
              scale: [
                1,
                1.08,
                1,
              ],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 font-bold text-blue-700"
          >
            +
          </motion.div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
              Tín hiệu cộng đồng
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-950 sm:text-xl">
              Bạn có trải nghiệm với
              thông tin này?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Chọn mô tả gần nhất với
              trải nghiệm của bạn.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map(
            (
              option,
              index,
            ) => {
              const active =
                selected ===
                option.id

              return (
                <motion.button
                  key={option.id}
                  type="button"
                  initial={{
                    opacity: 0,
                    y: 12,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay:
                      0.22 +
                      index * 0.06,
                  }}
                  whileHover={{
                    y: -3,
                  }}
                  whileTap={{
                    scale: 0.98,
                  }}
                  disabled={
                    Boolean(
                      submitting,
                    )
                  }
                  onClick={() =>
                    handleVote(
                      option.id,
                    )
                  }
                  className={`flex min-h-32 items-start gap-4 rounded-2xl border p-4 text-left transition ${
                    active
                      ? option.active
                      : option.box
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${option.iconBox}`}
                  >
                    {submitting ===
                    option.id
                      ? '…'
                      : option.icon}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-3">
                      <span className="font-semibold text-slate-950">
                        {
                          option.title
                        }
                      </span>

                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-600">
                        {loading
                          ? '—'
                          : summary
                              .counts[
                              option.id
                            ] || 0}
                      </span>
                    </span>

                    <span className="mt-2 block text-xs leading-5 text-slate-500">
                      {option.text}
                    </span>

                    {active && (
                      <motion.span
                        initial={{
                          opacity: 0,
                        }}
                        animate={{
                          opacity: 1,
                        }}
                        className="mt-2 block text-xs font-semibold text-blue-600"
                      >
                        Lựa chọn của bạn
                      </motion.span>
                    )}
                  </span>
                </motion.button>
              )
            },
          )}
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-800">
              {loading
                ? 'Đang tải tín hiệu...'
                : `${summary.total} lượt đóng góp`}
            </p>

            <AnimatePresence
              mode="wait"
            >
              {message && (
                <motion.p
                  key={message}
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  className="text-sm font-semibold text-emerald-700"
                >
                  {message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs leading-5 text-slate-500">
              Tín hiệu cộng đồng chỉ
              mang tính tham khảo,
              không ảnh hưởng Risk
              Score và không phải xác
              nhận an toàn hay kết
              luận lừa đảo.
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

export default CommunityFeedback
