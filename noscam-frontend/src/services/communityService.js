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
    apiClient.get(`/community/posts?page=${page}`),

  createPost: (data) =>
    apiClient.post('/community/posts', data, authOptions()),

  comments: (postId) =>
    apiClient.get(`/community/posts/${postId}/comments`),

  createComment: (postId, data) =>
    apiClient.post(
      `/community/posts/${postId}/comments`,
      data,
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
