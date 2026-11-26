import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import chatService from '../../services/chatService'

export function ChatImagePicker({
  image,
  onChange,
  onError,
  disabled = false,
}) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState('')

  useEffect(() => {
    if (!image) {
      setPreview('')
      return
    }

    const url = URL.createObjectURL(image)
    setPreview(url)

    return () => URL.revokeObjectURL(url)
  }, [image])

  function selectImage(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      onError('Chỉ hỗ trợ ảnh JPG, PNG và WEBP.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      onError('Ảnh không được vượt quá 10 MB.')
      return
    }

    onError('')
    onChange(file)
  }

  return (
    <div className="relative flex shrink-0 items-center">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={selectImage}
        disabled={disabled}
        hidden
      />

      {image && preview && (
        <div className="absolute bottom-full left-0 z-20 mb-3 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <img
            src={preview}
            alt="Ảnh đã chọn"
            className="h-24 w-24 rounded-lg object-contain"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            aria-label="Bỏ ảnh đã chọn"
            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-white"
          >
            ✕
          </button>
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        aria-label="Chọn hình ảnh"
        title="Gửi hình ảnh"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </button>
    </div>
  )
}

export default function ChatImageLightbox({
  messageId,
  admin = false,
}) {
  const [src, setSrc] = useState('')
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const triggerRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    let objectUrl = ''

    setSrc('')
    setFailed(false)
    setOpen(false)

    const service = admin ? chatService.admin : chatService.customer

    service.image(messageId, controller.signal)
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => {
        if (active) setFailed(true)
      })

    return () => {
      active = false
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [messageId, admin])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    function handleKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        closeRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKey, true)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey, true)
      triggerRef.current?.focus({ preventScroll: true })
    }
  }, [open])

  if (failed) {
    return <p className="py-2 text-xs opacity-75">Không tải được ảnh.</p>
  }

  if (!src) {
    return <p className="py-2 text-xs opacity-75">Đang tải ảnh...</p>
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Phóng to hình ảnh"
        className="my-1 block max-w-full cursor-zoom-in overflow-hidden rounded-xl"
      >
        <img
          src={src}
          alt="Hình ảnh tin nhắn"
          className="max-h-56 max-w-full rounded-xl object-contain"
        />
      </button>

      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xem hình ảnh tin nhắn"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false)
            }
          }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-4 sm:p-10"
        >
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Đóng hình ảnh"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/30"
          >
            ✕
          </button>

          <img
            src={src}
            alt="Hình ảnh phóng to"
            draggable={false}
            className="max-h-[85dvh] max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>,
        document.body,
      )}
    </>
  )
}
