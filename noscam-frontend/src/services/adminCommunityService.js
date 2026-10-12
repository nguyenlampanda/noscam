import apiClient from './apiClient'
import { getAdminToken } from './adminService'

function authOptions() {
  return {
    headers: {
      Authorization: `Bearer ${getAdminToken() || ''}`,
    },
  }
}

const adminCommunityService = {
  list(type, status = 'pending', page = 1) {
    const params = new URLSearchParams({
      status,
      page: String(page),
    })

    return apiClient.get(
      `/community/moderation/${type}?${params.toString()}`,
      authOptions()
    )
  },

  update(type, id, status) {
    return apiClient.patch(
      `/community/moderation/${type}/${id}`,
      { status },
      authOptions()
    )
  },
}

export default adminCommunityService
