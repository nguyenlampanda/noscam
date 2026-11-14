import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import chatService from '../../services/chatService'

function itemsFrom(response) {
  const data = response?.data ?? response
  const items = data?.data ?? data
  return Array.isArray(items) ? items : []
}

export default function AdminFloatingChat() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const refreshUnread = useCallback(async () => {
    try {
      const response = await chatService.admin.unreadCount()
      const data = response?.data ?? response
      setUnread(Math.max(0, Number(data?.unread_count) || 0))
    } catch {
      // Không làm gián đoạn giao diện.
    }
  }, [])

  const refreshConversations = useCallback(async () => {
    try {
      const response = await chatService.admin.conversations()
      setConversations(itemsFrom(response))
    } catch (err) {
      setError(err?.message || 'Không tải được danh sách Chat.')
    }
  }, [])

  const loadMessages = useCallback(async (id) => {
    try {
      const response = await chatService.admin.messages(id)
      const data = response?.data ?? response
      setMessages(itemsFrom(data?.messages ?? []))
      await chatService.admin.markRead(id)
      await refreshUnread()
      await refreshConversations()
      setError('')
    } catch (err) {
      setError(err?.message || 'Không tải được tin nhắn.')
    }
  }, [refreshUnread, refreshConversations])

  useEffect(() => {
    const pollUnread = () => {
      if (document.visibilityState === 'visible') {
        refreshUnread()
      }
    }

    pollUnread()
    const timer = window.setInterval(pollUnread, 30000)
    document.addEventListener('visibilitychange', pollUnread)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', pollUnread)
    }
  }, [refreshUnread])

  useEffect(() => {
    if (!open) return

    refreshConversations()
    const timer = window.setInterval(() => {
      refreshConversations()
      if (selected?.id) loadMessages(selected.id)
    }, 5000)

    return () => window.clearInterval(timer)
  }, [open, selected?.id, refreshConversations, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(event) {
    event.preventDefault()
    if (!selected || !body.trim() || sending) return

    setSending(true)
    try {
      await chatService.admin.send(selected.id, body.trim())
      setBody('')
      await loadMessages(selected.id)
    } catch (err) {
      setError(err?.message || 'Không gửi được tin nhắn.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed bottom-3 right-3 z-[95] sm:bottom-5 sm:right-5">
      {open && (
        <section className="mb-3 flex h-[min(560px,75dvh)] w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-blue-700 px-4 py-3 text-white">
            <div>
              <h2 className="font-bold">Chat Admin NoScam.vn</h2>
              <p className="text-xs text-blue-100">Hỗ trợ khách hàng trực tiếp</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng Chat"
              className="rounded-lg px-3 py-1 hover:bg-blue-600"
            >
              ✕
            </button>
          </header>

          {error && (
            <p role="alert" className="bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          {!selected ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {conversations.length === 0 && (
                <p className="p-5 text-center text-sm text-slate-500">
                  Chưa có cuộc trò chuyện nào.
                </p>
              )}

              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => {
                    setSelected(conversation)
                    setMessages([])
                    loadMessages(conversation.id)
                  }}
                  className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-4 text-left hover:bg-blue-50"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {conversation.customer?.name ||
                        `Khách hàng #${conversation.customer_id}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      Cuộc trò chuyện #{conversation.id}
                    </p>
                  </div>

                  {conversation.unread_count > 0 && (
                    <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white">
                      {conversation.unread_count >= 10
                        ? '10+'
                        : conversation.unread_count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null)
                    setMessages([])
                    refreshConversations()
                  }}
                  className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700"
                >
                  ←
                </button>
                <span className="truncate font-bold text-slate-800">
                  {selected.customer?.name ||
                    `Khách hàng #${selected.customer_id}`}
                </span>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
                {messages.map((message) => {
                  const isCustomer =
                    Number(message.sender_id) === Number(selected.customer_id)

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          isCustomer
                            ? 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                            : 'rounded-br-md bg-blue-600 text-white'
                        }`}
                      >
                        {message.body}
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-200 p-3">
                <input
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Nhập tin nhắn..."
                  maxLength={5000}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={sending || !body.trim()}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  Gửi
                </button>
              </form>
            </>
          )}

          <div className="border-t border-slate-100 p-2 text-center">
            <Link
              to="/admin/chat"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Mở trang quản lý Chat đầy đủ
            </Link>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Đóng Chat Admin' : 'Mở Chat Admin'}
        className="relative ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700"
      >
        <span className="text-2xl" aria-hidden="true">✉</span>
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-xs font-bold text-white">
            {unread >= 10 ? '10+' : unread}
          </span>
        )}
      </button>
    </div>
  )
}
