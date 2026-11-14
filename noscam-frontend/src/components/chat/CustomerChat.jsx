import './CustomerChat.css'
import { ChatMascotPeek } from '../social/TinyPlatformPet'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import chatService from '../../services/chatService'
import { createChatEcho, subscribeToConversation, disconnectChatEcho } from '../../services/chatRealtime'
import customerService, { getCustomerToken } from '../../services/customerService'

export default function CustomerChat() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  const loggedIn = Boolean(getCustomerToken())

  useEffect(() => {
    if (!loggedIn) {
      setUnread(0)
      return
    }

    let active = true

    async function refreshUnread() {
      try {
        const response = await chatService.customer.unreadCount()
        if (!active) return

        const data = response?.data ?? response
        const count = Number(data?.unread_count ?? 0)

        setUnread(Number.isFinite(count) ? Math.max(0, count) : 0)
      } catch {
        // Giữ giao diện ổn định khi API gặp lỗi.
      }
    }

    if (!open) {
      const pollUnread = () => {
        if (document.visibilityState === 'visible') {
          refreshUnread()
        }
      }

      pollUnread()
      const timer = window.setInterval(pollUnread, 30000)
      document.addEventListener('visibilitychange', pollUnread)

      return () => {
        active = false
        window.clearInterval(timer)
        document.removeEventListener('visibilitychange', pollUnread)
      }
    }

    return () => {
      active = false
    }
  }, [loggedIn, open])

  async function loadMessages() {
    if (!getCustomerToken()) return

    try {
      const response = await chatService.customer.messages()
      const data = response?.data ?? response
      const items = data?.messages?.data ?? data?.messages ?? []
      setMessages(Array.isArray(items) ? items : [])
      setError('')
    } catch (err) {
      setError(err?.message || 'Không tải được tin nhắn.')
    }
  }

  useEffect(() => {
    if (!open || !loggedIn) return

    let active = true

    customerService.me()
      .then((response) => {
        if (active) {
          setCurrentUserId(response?.data?.user?.id ?? null)
        }
      })
      .catch(() => {
        if (active) setCurrentUserId(null)
      })

    return () => { active = false }
  }, [open, loggedIn])

  useEffect(() => {
    if (!open || !loggedIn) return

    let active = true

    async function initialize() {
      setLoading(true)
      try {
        const response = await chatService.customer.messages()
        if (!active) return
        const data = response?.data ?? response
        const items = data?.messages?.data ?? data?.messages ?? []
        setMessages(Array.isArray(items) ? items : [])
        setConversationId(data?.conversation_id ?? null)

        try {
          await chatService.customer.markRead()
          if (active) setUnread(0)
        } catch {
          // Giữ badge nếu đánh dấu đã đọc thất bại.
        }
      } catch (err) {
        if (active) {
          setError(err?.message || 'Không tải được tin nhắn.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    initialize()
    return () => { active = false }
  }, [open, loggedIn])


  useEffect(() => {
    if (!open || !loggedIn || !conversationId) return

    const token = getCustomerToken()
    if (!token) return

    let echo

    try {
      echo = createChatEcho(token)
    } catch (error) {
      console.warn('Chat realtime:', error.message)
      return
    }

    const unsubscribe = subscribeToConversation(
      echo,
      conversationId,
      (incoming) => {
        setMessages((previous) => {
          if (previous.some((item) => item.id === incoming.id)) {
            return previous
          }

          return [...previous, incoming]
        })

        if (
          currentUserId !== null &&
          Number(incoming.sender_id) !== Number(currentUserId)
        ) {
          chatService.customer.markRead()
            .then(() => setUnread(0))
            .catch(() => {})
        }
      }
    )

    return () => {
      unsubscribe()
      disconnectChatEcho(echo)
    }
  }, [open, loggedIn, conversationId, currentUserId])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function sendMessage(event) {
    event.preventDefault()
    const text = body.trim()
    if (!text || sending) return

    setSending(true)
    setError('')

    try {
      await chatService.customer.send(text)
      setBody('')
      await loadMessages()
    } catch (err) {
      setError(err?.message || 'Không gửi được tin nhắn.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed bottom-3 right-3 z-[90] sm:bottom-5 sm:right-5">
      <ChatMascotPeek open={open} />
      {open && (
        <section className="noscam-chat-panel mb-3 flex h-[min(540px,75dvh)] w-[min(370px,calc(100vw-24px))] flex-col overflow-hidden">
          <header className="noscam-chat-header flex items-center justify-between text-white">
            <div>
              <h2 className="font-bold">Hỗ trợ NoScam.vn</h2>
              <p className="text-xs text-blue-100">Nhắn tin trực tiếp với Admin</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng chat"
              className="rounded-lg px-3 py-1 hover:bg-blue-700"
            >
              ✕
            </button>
          </header>

          {!loggedIn ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-sm text-slate-600">
                Đăng nhập để trò chuyện với đội ngũ hỗ trợ.
              </p>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
              >
                Đăng nhập
              </Link>
            </div>
          ) : (
            <>
              <div className="noscam-chat-messages flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                {loading && (
                  <p className="text-center text-sm text-slate-500">
                    Đang tải tin nhắn...
                  </p>
                )}
                {!loading && messages.length === 0 && (
                  <p className="text-center text-sm text-slate-500">
                    Xin chào! Bạn cần NoScam.vn hỗ trợ vấn đề gì?
                  </p>
                )}
                {messages.map((message) => {
                  const mine = Number(message.sender_id) === Number(currentUserId)
                  return (
                    <div
                      key={message.id}
                      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${
                          mine
                            ? 'bg-blue-600 text-white'
                            : 'border border-slate-200 bg-white text-slate-800'
                        }`}
                      >
                        {message.body}
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {error && (
                <p role="alert" className="px-4 py-2 text-xs text-red-600">
                  {error}
                </p>
              )}

              <form onSubmit={sendMessage} className="noscam-chat-form flex gap-2">
                <input
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  maxLength={5000}
                  placeholder="Nhập tin nhắn..."
                  aria-label="Nội dung tin nhắn"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
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
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Đóng hỗ trợ trực tuyến' : 'Mở hỗ trợ trực tuyến'}
        className="ml-auto flex min-h-11 items-center gap-2 rounded-full bg-blue-600 px-3 py-2.5 text-xs font-bold text-white shadow-xl ring-2 ring-white transition hover:bg-blue-700 sm:px-5 sm:py-4 sm:text-sm"
      >
        <span aria-hidden="true">✉</span>
        {!open && loggedIn && unread > 0 && (
          <span
            aria-label={`${unread} tin nhắn chưa đọc`}
            className="absolute -right-1 -top-1 flex min-h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-xs font-bold text-white"
          >
            {unread >= 10 ? '10+' : unread}
          </span>
        )}
        {open ? 'Đóng' : 'Chat'}<span className="hidden sm:inline">{open ? '' : ' hỗ trợ'}</span>
      </button>
    </div>
  )
}
