import apiClient from './apiClient'

const TOKEN_KEY =
  'noscam_admin_token'

function authHeaders() {
  const token =
    localStorage.getItem(TOKEN_KEY)

  return token
    ? {
        Authorization:
          `Bearer ${token}`,
      }
    : {}
}

export const mediatorTagService = {
  async list() {
    return apiClient.get(
      '/mediator-tags',
    )
  },

  async create(name) {
    return apiClient.post(
      '/admin/mediator-tags',
      { name },
      {
        headers: authHeaders(),
      },
    )
  },

  async update(id, data) {
    return apiClient.put(
      `/admin/mediator-tags/${id}`,
      data,
      {
        headers: authHeaders(),
      },
    )
  },
}

export default mediatorTagService
