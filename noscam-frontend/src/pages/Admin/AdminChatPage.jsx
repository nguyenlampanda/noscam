import { useCallback, useEffect, useRef, useState } from 'react'
import AdminNav from '../../components/admin/AdminNav'
import chatService from '../../services/chatService'
import adminService from '../../services/adminService'
import { getAdminToken } from '../../services/adminService'
import { createChatEcho, subscribeToConversation, disconnectChatEcho } from '../../services/chatRealtime'

function extractItems(response, key) {
  const data = response?.data ?? response
  const value = data?.[key] ?? data
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

export default function AdminChatPage() {
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  const loadConversations = useCallback(async () => {
    try {
      const response = await chatService.admin.conversations()
      setConversations(extractItems(response, 'conversations'))
      setError('')
    } catch (err) {
      setError(err?.message || 'Không tải được danh sách trò chuyện.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) return

    setLoadingMessages(true)
    try {
      const response = await chatService.admin.messages(conversationId)
      setMessages(extractItems(response, 'messages'))
      setError('')
    } catch (err) {
      setError(err?.message || 'Không tải được tin nhắn.')
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    adminService.me()
      .then((response) => {
        if (active) {
          setCurrentUserId(
            response?.data?.user?.id ??
            response?.user?.id ??
            null
          )
        }
      })
      .catch(() => {
        if (active) setCurrentUserId(null)
      })

    return () => { active = false }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (!selected) return
    loadMessages(selected.id)
    chatService.admin.markRead(selected.id).catch(() => {})
  }, [selected, loadMessages])


  useEffect(() => {
    if (!selected?.id) return

    const token = getAdminToken()
    if (!token) return

    let echo

    try {
      echo = createChatEcho(token)
    } catch (error) {
      console.warn('Admin Chat realtime:', error.message)
      return
    }

    const unsubscribe = subscribeToConversation(
      echo,
      selected.id,
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
          chatService.admin.markRead(selected.id).catch(() => {})
        }

        loadConversations()
      }
    )

    return () => {
      unsubscribe()
      disconnectChatEcho(echo)
    }
  }, [selected?.id, currentUserId, loadConversations])

  useEffect(() => {
    const timer = setInterval(() => {
      loadConversations()
    }, 5000)

    return () => clearInterval(timer)
  }, [loadConversations])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(event) {
    event.preventDefault()
    const text = body.trim()
    if (!selected || !text || sending) return

    setSending(true)
    setError('')

    try {
      await chatService.admin.send(selected.id, text)
      setBody('')
      await loadMessages(selected.id)
      await loadConversations()
    } catch (err) {
      setError(err?.message || 'Không gửi được tin nhắn.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900">
            Tin nhắn khách hàng
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý và trả lời yêu cầu hỗ trợ từ khách hàng.
          </p>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[320px_1fr]">
          <aside className="border-b border-slate-200 md:border-b-0 md:border-r">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold">Cuộc trò chuyện</h2>
              <button
                type="button"
                onClick={loadConversations}
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                Làm mới
              </button>
            </div>

            <div className="max-h-[550px] overflow-y-auto">
              {loading && (
                <p className="p-5 text-sm text-slate-500">Đang tải...</p>
              )}

              {!loading && conversations.length === 0 && (
                <p className="p-5 text-sm text-slate-500">
                  Chưa có cuộc trò chuyện nào.
                </p>
              )}

              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelected(conversation)}
                  className={`block w-full border-b border-slate-100 px-5 py-4 text-left hover:bg-blue-50 ${
                    selected?.id === conversation.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-bold text-slate-800">
                      {conversation.customer?.name ||
                        `Khách hàng #${conversation.customer_id}`}
                    </span>
                    {conversation.unread_count > 0 && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Cuộc trò chuyện #{conversation.id}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-[540px] flex-col">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-slate-500">
                Chọn một cuộc trò chuyện để xem tin nhắn.
              </div>
            ) : (
              <>
                <header className="border-b border-slate-100 px-5 py-4">
                  <h2 className="font-bold text-slate-900">
                    {selected.customer?.name ||
                      `Khách hàng #${selected.customer_id}`}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Đang trò chuyện với khách hàng
                  </p>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-5">
                  {loadingMessages && (
                    <p className="text-center text-sm text-slate-500">
                      Đang tải tin nhắn...
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
                          className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm ${
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

                <form
                  onSubmit={sendMessage}
                  className="flex gap-3 border-t border-slate-200 p-4"
                >
                  <input
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    maxLength={5000}
                    placeholder="Nhập câu trả lời..."
                    aria-label="Nội dung trả lời"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={sending || !body.trim()}
                    className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"
                  >
                    Gửi
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
