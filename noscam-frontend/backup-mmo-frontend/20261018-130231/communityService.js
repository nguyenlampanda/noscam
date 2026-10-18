import apiClient from './apiClient'
import { getCustomerToken } from './customerService'

function authOptions() {
  const token = getCustomerToken()

  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {}
}

const communityService = {
  posts: (page = 1) =>
    apiClient.get(`/community/posts?page=${page}`, authOptions()),

  createPost: (data) => {
    const body = new FormData()
    body.append('title', data.title || '')
    body.append('content', data.content || '')
    body.append('category', data.category)
    body.append('is_anonymous', data.is_anonymous ? '1' : '0')
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
