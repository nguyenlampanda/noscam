import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { API_BASE_URL } from './apiClient'

export function createChatEcho(token) {
  const key = import.meta.env.VITE_REVERB_APP_KEY
  const host = import.meta.env.VITE_REVERB_HOST || '127.0.0.1'
  const port = Number(import.meta.env.VITE_REVERB_PORT || 8080)
  const scheme = import.meta.env.VITE_REVERB_SCHEME || 'http'

  if (!token || !key) {
    throw new Error('Thiếu token đăng nhập hoặc cấu hình Reverb.')
  }

  const secure = scheme === 'https'

  return new Echo({
    broadcaster: 'reverb',
    key,
    Pusher,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: secure,
    enabledTransports: secure ? ['wss'] : ['ws'],
    disableStats: true,

    authorizer: (channel) => ({
      authorize: async (socketId, callback) => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/broadcasting/auth`,
            {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                socket_id: socketId,
                channel_name: channel.name,
              }),
            }
          )

          if (!response.ok) {
            throw new Error(
              `Xác thực kênh Chat thất bại (${response.status}).`
            )
          }

          callback(null, await response.json())
        } catch (error) {
          callback(error, null)
        }
      },
    }),
  })
}

export function subscribeToConversation(
  echo,
  conversationId,
  onMessage
) {
  if (!echo || !conversationId) {
    return () => {}
  }

  const channelName = `chat.${conversationId}`

  echo
    .private(channelName)
    .listen('.chat.message.sent', (event) => {
      if (event?.message) {
        onMessage(event.message)
      }
    })

  return () => {
    echo.leave(channelName)
  }
}

export function disconnectChatEcho(echo) {
  if (echo) {
    echo.disconnect()
  }
}
