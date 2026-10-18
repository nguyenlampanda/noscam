import {
  createContext, useCallback, useContext, useEffect,
  useRef, useState,
} from 'react'

const UIContext = createContext(null)

const colors = {
  success: 'bg-emerald-50 text-emerald-700',
  error: 'bg-red-50 text-red-700',
  warning: 'bg-amber-50 text-amber-700',
  info: 'bg-blue-50 text-blue-700',
}

export function NoScamBrand() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-2xl font-black text-white">
        N
      </span>
      <span className="text-xl font-black text-slate-900">
        NoScam<span className="text-blue-600">.vn</span>
      </span>
    </div>
  )
}

export function Spinner({ size = 'md' }) {
  return (
    <span
      role="status"
      aria-label="Đang tải"
      className={`inline-block animate-spin rounded-full border-[3px] border-blue-100 border-t-blue-600 ${
        size === 'sm' ? 'h-5 w-5' : 'h-11 w-11'
      }`}
    />
  )
}

export function PageLoading({ message = 'Đang tải dữ liệu...' }) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <NoScamBrand />
      <Spinner />
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  )
}

export function Skeleton({ rows = 3 }) {
  return (
    <div className="space-y-3" aria-label="Đang tải dữ liệu">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-3 rounded-xl border border-slate-100 bg-white p-4"
        >
          <div className="h-11 w-11 shrink-0 rounded-lg bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded bg-slate-200" />
            <div className="h-2.5 w-1/2 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function LoadingButton({
  loading = false, children, disabled, ...props
}) {
  return (
    <button {...props} disabled={disabled || loading}>
      <span className="inline-flex items-center justify-center gap-2">
        {loading && <Spinner size="sm" />}
        {children}
      </span>
    </button>
  )
}

export function NoScamUIProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const [toasts, setToasts] = useState([])
  const dialogRef = useRef(null)
  const previousFocus = useRef(null)

  const closeDialog = useCallback((value = false) => {
    const current = dialogRef.current
    if (!current || current.busy) return
    dialogRef.current = null
    setDialog(null)
    current.resolve(current.kind === 'prompt' && value === false ? null : value)
    requestAnimationFrame(() => previousFocus.current?.focus?.())
  }, [])

  const openDialog = useCallback((options) => {
    if (dialogRef.current) return Promise.resolve(false)
    previousFocus.current = document.activeElement
    return new Promise((resolve) => {
      dialogRef.current = { resolve, busy: false, kind: options.kind }
      setDialog({ ...options, input: '' })
    })
  }, [])

  const notify = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((items) => [...items, { id, message, type }])
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id))
    }, 3500)
  }, [])

  const processing = useCallback(async (work, options = {}) => {
    if (dialogRef.current) {
      throw new Error('Đang có hộp thoại khác mở.')
    }

    const result = await new Promise((resolve) => {
      dialogRef.current = { resolve, busy: true }
      setDialog({
        kind: 'processing',
        title: options.title || 'Đang xử lý yêu cầu',
        message: options.message || 'Vui lòng chờ trong giây lát...',
      })
      resolve(true)
    })

    if (!result) return

    try {
      const value = await work()
      dialogRef.current = null
      setDialog(null)
      notify(options.success || 'Thao tác thành công.', 'success')
      return value
    } catch (error) {
      dialogRef.current = null
      setDialog(null)
      notify(error?.message || 'Không thể thực hiện thao tác.', 'error')
      throw error
    }
  }, [notify])

  useEffect(() => {
    if (!dialog) return

    const previousFocus = document.activeElement
    const modal = document.querySelector('[data-noscam-dialog]')

    const getFocusables = () => Array.from(
      modal?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || []
    ).filter((element) => element.getClientRects().length > 0)

    const firstInput = modal?.querySelector(
      'input:not([disabled]), textarea:not([disabled])'
    )

    const initialFocus = firstInput || getFocusables()[0] || modal
    initialFocus?.focus()

    const onKey = (event) => {
      if (event.key === 'Escape') {
        if (dialogRef.current?.busy) return
        event.preventDefault()
        closeDialog(false)
        return
      }

      if (event.key !== 'Tab') return

      const items = getFocusables()

      if (!items.length) {
        event.preventDefault()
        modal?.focus()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]

      if (!modal?.contains(document.activeElement)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [dialog, closeDialog])

  useEffect(() => {
    if (!dialog) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [dialog])

  const submitDialog = () => {
    if (dialog?.kind === 'prompt') {
      closeDialog(dialog.input)
    } else {
      closeDialog(true)
    }
  }

  return (
    <UIContext.Provider value={{
      notify,
      alert: (message, type = 'info') =>
        openDialog({ kind: 'alert', message, type, title: 'Thông báo' }),
      confirm: (message, title = 'Xác nhận thao tác') =>
        openDialog({ kind: 'confirm', message, title, type: 'warning' }),
      prompt: (message, title = 'Nhập thông tin') =>
        openDialog({ kind: 'prompt', message, title, type: 'info' }),
      processing,
    }}>
      {children}

      <div
        className="pointer-events-none fixed right-4 top-4 z-[2147483646] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className="pointer-events-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
          >
            <span className={`mr-2 rounded-md px-2 py-1 text-xs font-bold ${colors[item.type] || colors.info}`}>
              {item.type === 'success' ? '✓' : item.type === 'error' ? '!' : 'i'}
            </span>
            <span className="text-sm text-slate-700">{item.message}</span>
          </div>
        ))}
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog(false)
          }}
        >
          <div
            data-noscam-dialog
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="noscam-dialog-title"
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="border-b border-slate-100 p-5">
              <NoScamBrand />
              <h2
                id="noscam-dialog-title"
                className="mt-5 text-center text-xl font-black text-slate-900"
              >
                {dialog.title}
              </h2>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-5">
              {dialog.kind === 'processing' && (
                <div className="mb-5 flex justify-center">
                  <Spinner />
                </div>
              )}

              <p className="whitespace-pre-wrap break-words text-center text-sm leading-6 text-slate-600">
                {dialog.message}
              </p>

              {dialog.kind === 'prompt' && (
                <textarea
                  autoFocus
                  rows={4}
                  value={dialog.input}
                  onChange={(event) => setDialog((current) => ({
                    ...current,
                    input: event.target.value,
                  }))}
                  className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
                  placeholder="Nhập nội dung..."
                />
              )}
            </div>

            {dialog.kind !== 'processing' && (
              <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
                {dialog.kind !== 'alert' && (
                  <button
                    type="button"
                    onClick={() => closeDialog(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
                  >
                    Đóng
                  </button>
                )}
                <button
                  type="button"
                  autoFocus={dialog.kind !== 'prompt'}
                  onClick={submitDialog}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700"
                >
                  {dialog.kind === 'alert' ? 'Đã hiểu' : 'Xác nhận'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </UIContext.Provider>
  )
}

export function useNoScamUI() {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useNoScamUI phải nằm trong NoScamUIProvider')
  }
  return context
}
