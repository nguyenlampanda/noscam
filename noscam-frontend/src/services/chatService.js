import apiClient from './apiClient'
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

const chatService = {
  customer: {
    messages() {
      return apiClient.get('/chat/messages', customerAuth())
    },

    send(body) {
      return apiClient.post(
        '/chat/messages',
        { body },
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

    send(conversationId, body) {
      return apiClient.post(
        `/admin/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
        { body },
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
