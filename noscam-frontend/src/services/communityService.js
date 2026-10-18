import apiClient from './apiClient'
import { getCustomerToken } from './customerService'

function authOptions() {
  const token = getCustomerToken()

  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {}
}

const communityService = {
  posts: (page = 1, filters = {}) => {
    const params = new URLSearchParams({
      page: String(page),
      per_page: '10',
    })
    if (filters.q?.trim()) params.set('q', filters.q.trim())
    if (filters.category && filters.category !== 'all') {
      params.set('category', filters.category)
    }
    if (filters.work_mode && filters.work_mode !== 'all') {
      params.set('work_mode', filters.work_mode)
    }
    if (filters.city?.trim()) params.set('city', filters.city.trim())
    return apiClient.get(`/community/posts?${params.toString()}`, authOptions())
  },

  createPost: (data) => {
    const body = new FormData()
    body.append('title', data.title || '')
    body.append('content', data.content || '')
    body.append('category', data.category)
    body.append('is_anonymous', data.is_anonymous ? '1' : '0')
    // NOSCAM_MMO_API_V2
    for (const key of [
      'work_mode', 'city', 'address', 'salary',
      'salary_unit', 'deadline', 'contact',
    ]) {
      if (data[key] !== undefined && data[key] !== null &&
          String(data[key]).trim() !== '') {
        body.append(key, String(data[key]).trim())
      }
    }
    for (const image of data.images || []) body.append('images[]', image)
    return apiClient.post('/community/posts', body, authOptions())
  },

  comments: (postId) =>
    apiClient.get(`/community/posts/${postId}/comments`),

  createComment: (postId, data) =>
    apiClient.post(
      `/community/posts/${postId}/comments`,
      data,
      authOptions()
    ),

  unlike: (postId) =>
    apiClient.delete(
      `/community/posts/${postId}/like`,
      authOptions()
    ),

  like: (postId) =>
    apiClient.post(
      `/community/posts/${postId}/like`,
      {},
      authOptions()
    ),
}

export default communityService
