import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import chatService from '../../services/chatService'

export default function AdminFloatingChat() {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let active = true

    const refresh = async () => {
      try {
        const response = await chatService.admin.unreadCount()
        if (!active) return

        const count = Number(
          response?.unread_count ??
          response?.data?.unread_count ??
          0
        )

        setUnread(
          Number.isFinite(count) ? Math.max(0, count) : 0
        )
      } catch {
        // Giữ nguyên giao diện khi API tạm thời lỗi.
      }
    }

    refresh()

    window.addEventListener(
      'noscam-chat-unread-refresh',
      refresh
    )

    const timer = window.setInterval(refresh, 5000)

    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener(
        'noscam-chat-unread-refresh',
        refresh
      )
    }
  }, [])

  return (
    <Link
      to="/admin/chat"
      aria-label={
        unread > 0
          ? `Chat hỗ trợ, ${unread} tin nhắn chưa đọc`
          : 'Mở Chat hỗ trợ'
      }
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition hover:bg-blue-700"
    >
      <span className="text-2xl" aria-hidden="true">✉</span>

      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex min-h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-xs font-bold text-white">
          {unread >= 10 ? '10+' : unread}
        </span>
      )}
    </Link>
  )
}
