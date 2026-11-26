import apiClient, { API_BASE_URL } from './apiClient'
import { getCustomerToken } from './customerService'
import { getAdminToken } from './adminService'

function customerAuth() {
  const token = getCustomerToken()

  if (!token) {
    throw new Error('Vui lòng đăng nhập để nhắn tin.')
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
}

function adminAuth() {
  const token = getAdminToken()

  if (!token) {
    throw new Error('Vui lòng đăng nhập Admin.')
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
}


function messagePayload(body, image) {
  if (!image) return { body }

  const data = new FormData()
  data.append('body', body || '')
  data.append('image', image)
  return data
}

async function fetchImage(endpoint, auth, signal) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: auth.headers,
    signal,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Không tải được hình ảnh.')
  }

  const blob = await response.blob()

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) {
    throw new Error('Định dạng ảnh không hợp lệ.')
  }

  return blob
}

const chatService = {
  customer: {
    image(messageId, signal) {
      return fetchImage(
        `/chat/messages/${encodeURIComponent(messageId)}/image`,
        customerAuth(),
        signal,
      )
    },

    unreadCount() {
      return apiClient.get(
        '/chat/unread-count',
        customerAuth()
      )
    },
    messages() {
      return apiClient.get('/chat/messages', customerAuth())
    },

    send(body, image = null) {
      return apiClient.post(
        '/chat/messages',
        messagePayload(body, image),
        customerAuth(),
      )
    },

    markRead() {
      return apiClient.post(
        '/chat/read',
        {},
        customerAuth(),
      )
    },
  },

  admin: {
    image(messageId, signal) {
      return fetchImage(
        `/admin/chat/messages/${encodeURIComponent(messageId)}/image`,
        adminAuth(),
        signal,
      )
    },

    unreadCount() {
      return apiClient.get(
        '/admin/chat/unread-count',
        adminAuth()
      )
    },
    conversations(page = 1) {
      return apiClient.get(
        `/admin/chat/conversations?page=${encodeURIComponent(page)}`,
        adminAuth(),
      )
    },

    messages(conversationId) {
      return apiClient.get(
        `/admin/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
        adminAuth(),
      )
    },

    send(conversationId, body, image = null) {
      return apiClient.post(
        `/admin/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
        messagePayload(body, image),
        adminAuth(),
      )
    },

    markRead(conversationId) {
      return apiClient.post(
        `/admin/chat/conversations/${encodeURIComponent(conversationId)}/read`,
        {},
        adminAuth(),
      )
    },
  },
}

export default chatService
